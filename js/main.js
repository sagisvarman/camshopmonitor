/* Sign-in, boot and the page's event wiring. */
import { DEMO, REQUIRE_LOGIN } from './config.js';
import { cache } from './data.js';
import { AU, auth, initFirebase } from './firebase.js';
import { applyStaticText, isLang, LANG, T, useLang } from './i18n.js';
import { buildTabs, handleLoadError, refreshData, renderPanel } from './render.js';
import { loadShops, SHOP_ID, SHOP_KEY, SHOP_NAME, store, useShop } from './shop.js';
import { setStatus, state } from './state.js';
import { cctv, cctvTick, stopCctv } from './tabs/cctv.js';
import { forgetReviewDay, stopReview } from './tabs/review.js';
import { $, addDays, dateToIso, isoToDate, keysBetween, todayDate } from './util.js';

export function setLang(l) {
  if (!isLang(l) || l === LANG) return;
  useLang(l);
  if (auth) auth.languageCode = l;
  applyStaticText();
  buildTabs();
  if (!$('#app').hidden) refreshData(); /* redraws; days already read come from the cache */
}

/* ------------------------------------------------------------------ */
/* Auth and boot                                                       */
/* ------------------------------------------------------------------ */
export function show(id) { ['auth', 'denied', 'app'].forEach(x => { $('#' + x).hidden = x !== id; }); }
export function showDenied() { const u = auth && auth.currentUser; $('#deniedWho').textContent = u ? u.email : T.thisAccount; show('denied'); }
export function authMessage(e) {
  const c = e && e.code || '';
  if (/invalid-credential|wrong-password|user-not-found|invalid-email/.test(c)) return T.authNoMatch;
  if (c === 'auth/too-many-requests') return T.authTooMany;
  if (c === 'auth/popup-closed-by-user' || c === 'auth/cancelled-popup-request') return '';
  if (c === 'auth/unauthorized-domain') return T.authDomain;
  if (c === 'auth/operation-not-allowed') return T.authMethod;
  if (c === 'auth/network-request-failed') return T.authNetwork;
  return T.authFailed(e && e.message ? e.message : T.unknownError);
}

export async function startApp(user) {
  show('app');
  buildTabs();
  if (!DEMO) {
    $('#panel').innerHTML = '';
    setStatus(T.loading);
    try { store.shops = await loadShops(user); } catch (e) { handleLoadError(e); return; }
    if (!store.shops.length) store.shops = [{ id: SHOP_ID, name: SHOP_NAME, tz: null }];
    let last = null;
    try { last = localStorage.getItem(SHOP_KEY); } catch (e) { /* storage blocked */ }
    useShop(store.shops.find(x => x.id === last) || store.shops[0]);
  }
  refreshData();
}

export async function boot() {
  applyStaticText();
  buildTabs();
  if (DEMO) {
    $('#demoTag').hidden = false; $('#whoBox').hidden = true;
    startApp();
    return;
  }
  try {
    await initFirebase();
  } catch (e) {
    console.error(e);
    if (REQUIRE_LOGIN) { show('auth'); $('#authMsg').textContent = T.firebaseFailed; }
    else { show('app'); setStatus(T.firebaseFailed, 'err'); }
    return;
  }
  if (!REQUIRE_LOGIN) { $('#whoBox').hidden = true; startApp(null); return; }
  AU.onAuthStateChanged(auth, user => {
    if (user) { $('#who').textContent = user.email || T.signedIn; startApp(user); }
    else { stopCctv(); stopReview(); cache.clear(); store.devices = null; store.shops = []; state.keys = []; $('#pw').value = ''; show('auth'); }
  });
}

$('#googleBtn').onclick = async () => {
  $('#authMsg').textContent = '';
  try { await AU.signInWithPopup(auth, new AU.GoogleAuthProvider()); }
  catch (e) { $('#authMsg').textContent = authMessage(e); }
};
$('#pwForm').onsubmit = async ev => {
  ev.preventDefault();
  const email = $('#em').value.trim(), pw = $('#pw').value;
  if (!email || !pw) { $('#authMsg').textContent = T.enterEmailPw; return; }
  $('#authMsg').textContent = '';
  try { await AU.signInWithEmailAndPassword(auth, email, pw); }
  catch (e) { $('#authMsg').textContent = authMessage(e); }
};
export const doSignOut = async () => { try { await AU.signOut(auth); } catch (e) { console.error(e); } };
$('#signOut').onclick = doSignOut;
$('#deniedOut').onclick = doSignOut;

$('#shopPick').onchange = e => {
  const s = store.shops.find(x => x.id === e.target.value);
  if (s) { useShop(s); refreshData(); }
};
$('#tabs').onclick = e => {
  const b = e.target.closest('[data-t]');
  if (!b) return;
  state.tab = b.dataset.t;
  $('#tabs').querySelectorAll('button').forEach(x => x.setAttribute('aria-selected', x === b));
  stopCctv();
  if (state.tab !== 'review') stopReview();
  document.body.classList.toggle('cctv-mode', state.tab === 'cctv');
  document.body.classList.toggle('rv-mode', state.tab === 'review');
  if ((DEMO || store.shops.length) && (state.keys.length || ['now', 'cctv', 'weekly', 'review'].includes(state.tab))) renderPanel();
};
/* Back on the CCTV tab after looking away: ask for pictures again right away. */
document.addEventListener('visibilitychange', () => { if (cctv.timer && !document.hidden) cctvTick(); });
$('#presets').onclick = e => {
  const b = e.target.closest('[data-p]');
  if (!b) return;
  state.preset = b.dataset.p;
  $('#presets').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b));
  $('#customDates').hidden = state.preset !== 'custom';
  if (state.preset === 'custom') {
    if (!$('#dTo').value) { $('#dTo').value = dateToIso(todayDate()); $('#dFrom').value = dateToIso(addDays(todayDate(), -13)); }
    state.customStart = $('#dFrom').value; state.customEnd = $('#dTo').value;
  }
  refreshData();
};
$('#applyRange').onclick = () => { state.customStart = $('#dFrom').value; state.customEnd = $('#dTo').value; refreshData(); };
$('#refresh').onclick = () => {
  if (state.tab === 'review' && state.rv.day) forgetReviewDay(state.rv.day);
  if (state.tab === 'weekly' && state.wk.from) {
    const x = isoToDate(state.wk.from), y = isoToDate(state.wk.to), n = Math.round((y - x) / 864e5) + 1;
    keysBetween(addDays(x, -n), y).forEach(k => cache.delete(k));
  }
  refreshData(true);
};
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!$('#app').hidden && state.keys.length) renderPanel(); });
}

document.addEventListener('click', e => { const b = e.target.closest('.lang [data-lang]'); if (b) setLang(b.dataset.lang); });

boot();
