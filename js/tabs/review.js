/* Review tab: one day's counted bikes with their photos, for the shop to fix
   at the end of the day. Tick two or more photos of one bike and press Same
   bike, or tick a bike that only parked and press Not a wash; each fix can
   be undone. Compare shows the ticked bikes' photos large, side by side, with
   their details lined up under them, to decide there.

   The page doesn't change the counts itself. It adds a request to
   track_visits/{shop}/edit_requests, and the counting computer makes it
   (edit_requests.py on the Mac/VM), rewrites the bikes' documents, and marks
   the request done. Requests sent while that computer is off wait for it.

   Photos: .../devices/{device}/days/{date}/photos/{session}_{id}, one per
   counted bike (review_photos.py). Which ids were merged into which, or
   removed, and by whom: .../devices/{device}/edits/{session} (a copy of the
   session's edits.json, see visit_edits.py). */
import { DEMO } from '../config.js';
import { cache, loadDays } from '../data.js';
import { demoPhoto } from '../demo.js';
import { auth, db, FS } from '../firebase.js';
import { T } from '../i18n.js';
import { emptyBox, handleLoadError } from '../render.js';
import { SHOP_ID, SHOP_TZ, store } from '../shop.js';
import { setStatus, state } from '../state.js';
import { $, addDays, dateToIso, dkey, esc, fmtDur, fmtHMS, isoToDate, keyIso, todayDate } from '../util.js';

/* Sources the counting computer keeps a session folder for (a recording
   counted on Colab can't be fixed from here). */
const FIXABLE = ['emulator', 'overlay'];

const rv = {
  extra: new Map(),   /* shop|dayKey -> { photos: Map(docId -> photo), edits: Map(session -> { device, tracks }) } */
  pending: new Map(), /* request id -> request, while pending or being made */
  unsub: null, msg: null, busy: false, zoom: [], live: new Map() /* the drawn cards, by doc id */,
  blind: false /* the requests can't be watched: the page won't update by itself */,
  demoEdits: new Map() /* demo only: dayKey -> Map(session -> { device, tracks }) */
};

const docId = (session, id) => `${session}_${id}`;
const xkey = key => `${SHOP_ID}|${key}`;
const idValue = id => (/^\d+$/.test(String(id)) ? Number(id) : String(id));

export function stopReview() {
  if (rv.unsub) { rv.unsub(); rv.unsub = null; }
  rv.pending = new Map();
  rv.blind = false;
}

/* Read the day again on the next draw (Refresh). */
export function forgetReviewDay(key) {
  rv.extra.delete(xkey(key));
  cache.delete(key);
}

/* ---- loading ---- */
async function fetchExtras(key, bikes) {
  if (DEMO) return demoExtras(key, bikes);
  const { collection, doc, getDoc, getDocs } = FS;
  const devices = store.devices || [...new Set(bikes.map(b => b.feed.name))];
  const snaps = await Promise.all(devices.map(d =>
    getDocs(collection(db, 'track_visits', SHOP_ID, 'devices', d, 'days', key, 'photos'))));
  const photos = new Map();
  snaps.forEach((snap, i) => snap.docs.forEach(x => {
    const p = x.data();
    photos.set(x.id, { ...p, device: devices[i], src: p.jpeg ? 'data:image/jpeg;base64,' + p.jpeg.toBase64() : null });
  }));
  const sessions = new Map();
  bikes.forEach(b => { if (b.sessionId) sessions.set(b.sessionId, b.feed.name); });
  photos.forEach(p => { if (p.session_id) sessions.set(p.session_id, p.device); });
  const edits = new Map();
  await Promise.all([...sessions].map(async ([session, device]) => {
    const d = await getDoc(doc(db, 'track_visits', SHOP_ID, 'devices', device, 'edits', session));
    if (d.exists()) edits.set(session, { device, tracks: (d.data() || {}).tracks || {} });
  }));
  return { photos, edits };
}

function demoExtras(key, bikes) {
  const photos = new Map();
  bikes.forEach(b => photos.set(b.id, {
    session_id: b.sessionId, track_id: b.trackId, source: b.source, device: b.feed.name, zone: b.zone,
    in_time_str: b.firstIn != null ? fmtHMS(b.firstIn) : null, src: demoPhoto(b)
  }));
  if (!rv.demoEdits.has(key)) rv.demoEdits.set(key, new Map());
  return { photos, edits: rv.demoEdits.get(key) };
}

async function loadReviewDay(key) {
  await loadDays([key]);
  const shop = SHOP_ID, extra = await (rv.extra.has(xkey(key)) ? rv.extra.get(xkey(key)) : fetchExtras(key, (cache.get(key) || {}).bikes || []));
  if (shop === SHOP_ID) rv.extra.set(xkey(key), extra);
}

/* Pending requests, live while the tab is open: a bike with one is marked
   Waiting, and when one is answered the day is read again. A login with only
   some phones may read only their requests (firestore.rules), so it watches
   each phone's. If they can't be watched, the tab says so instead of going
   quiet. */
function watchRequests() {
  if (DEMO || rv.unsub) return;
  const { collection, onSnapshot, query, where } = FS;
  const shop = SHOP_ID, col = collection(db, 'track_visits', shop, 'edit_requests');
  const open = where('status', 'in', ['pending', 'working']);
  const mine = store.access && store.access[shop];
  const queries = mine && !mine.includes('*') ? mine.map(d => query(col, where('device', '==', d), open)) : [query(col, open)];
  const parts = queries.map(() => new Map());
  const stops = queries.map((q, i) => onSnapshot(q, snap => {
    parts[i] = new Map(snap.docs.map(d => [d.id, d.data()]));
    if (shop !== SHOP_ID || state.tab !== 'review') return;
    const now = new Map(parts.flatMap(p => [...p]));
    const answered = [...rv.pending.keys()].filter(id => !now.has(id));
    rv.pending = now;
    rv.blind = false;
    if (answered.length) whenAnswered(answered);
    else drawReview();
  }, e => {
    console.error(e);
    stopReview();
    if (shop !== SHOP_ID || state.tab !== 'review') return;
    rv.blind = true;
    drawReview();
  }));
  rv.unsub = () => stops.forEach(stop => stop());
}

async function whenAnswered(ids) {
  const { doc, getDoc } = FS;
  const done = await Promise.all(ids.map(id =>
    getDoc(doc(db, 'track_visits', SHOP_ID, 'edit_requests', id)).then(s => s.data()).catch(() => null)));
  const errors = done.filter(r => r && r.status === 'error').map(r => r.error || '?');
  rv.msg = errors.length ? { cls: 'err', text: T.rvFailed(errors.join('; ')) } : { cls: 'ok', text: T.rvDone };
  const key = state.rv.day;
  forgetReviewDay(key);
  try { await loadReviewDay(key); } catch (e) { console.error(e); }
  if (state.tab === 'review' && state.rv.day === key) drawReview();
}

/* ---- the day's cards ---- */
function buildModel(key) {
  const bikes = (cache.get(key) || {}).bikes || [];
  const { photos, edits } = rv.extra.get(xkey(key)) || { photos: new Map(), edits: new Map() };
  const gone = new Set(), removed = [], hosts = new Map();
  edits.forEach(({ tracks }, session) => Object.entries(tracks).forEach(([id, e]) => {
    if (e && (e.deleted || e.merged_into != null)) gone.add(docId(session, id));
  }));
  const cards = bikes.filter(b => b.trackId != null && b.sessionId && !gone.has(b.id))
    .sort((a, b) => (a.firstIn ?? 0) - (b.firstIn ?? 0))
    .map(b => ({ key: b.id, b, session: b.sessionId, id: String(b.trackId), device: b.feed.name, source: b.source,
      photo: photos.get(b.id), merged: [] }));
  cards.forEach(c => hosts.set(c.key, c));
  edits.forEach(({ device, tracks }, session) => {
    Object.entries(tracks).forEach(([id, e]) => {
      if (!e || !e.deleted) return;
      const photo = photos.get(docId(session, id));
      const card = { key: docId(session, id), removed: true, session, id, device, source: (photo && photo.source) || 'emulator',
        photo, e, merged: [] };
      removed.push(card); hosts.set(card.key, card);
    });
    const root = id => {
      const seen = new Set();
      while (tracks[id] && tracks[id].merged_into != null && !seen.has(id)) { seen.add(id); id = String(tracks[id].merged_into); }
      return id;
    };
    Object.entries(tracks).forEach(([id, e]) => {
      if (!e || e.merged_into == null) return;
      const host = hosts.get(docId(session, root(id)));
      if (host) host.merged.push({ session, id, device, source: host.source, e, photo: photos.get(docId(session, id)) });
    });
  });
  removed.sort((a, b) => String((a.photo || {}).in_time_str || '').localeCompare(String((b.photo || {}).in_time_str || '')));
  return { cards, removed, photoCount: cards.filter(c => c.photo && c.photo.src).length };
}

/* The pending requests' bikes, as doc ids. */
function waitingKeys() {
  const keys = new Set();
  rv.pending.forEach(r => {
    keys.add(docId(r.session_id, r.track_id));
    if (r.target != null) keys.add(docId(r.session_id, r.target));
  });
  return keys;
}

/* A time the counting computer stamped (seconds), in the shop's time. */
function fmtWhen(seconds) {
  if (!seconds) return '';
  const opts = { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short', hourCycle: 'h23' };
  try { return new Date(seconds * 1000).toLocaleString(T.locale, SHOP_TZ ? { ...opts, timeZone: SHOP_TZ } : opts); }
  catch (e) { return new Date(seconds * 1000).toLocaleString(T.locale, opts); }
}

const who = e => (e && e.by) || T.rvOwner;

function photoHtml(photo, id, cls = '') {
  if (!photo || !photo.src) return `<div class="nophoto ${cls}">${esc(T.rvNoPhoto)}</div>`;
  rv.zoom.push(photo.src);
  return `<img class="${cls}" src="${photo.src}" alt="${esc(T.rvPhotoAlt(id))}" data-zoom="${rv.zoom.length - 1}" loading="lazy">`;
}

/* None while that bike's fix is waiting or one is being sent, so one press
   sends one undo. */
function undoButton(x, waiting) {
  if (waiting.has(docId(x.session, x.id))) return '';
  return `<button class="btn small" type="button" data-undo="${esc(JSON.stringify([x.session, x.id, x.device, x.source]))}" ${rv.busy ? 'disabled' : ''}>${esc(T.rvUndo)}</button>`;
}

function mergedHtml(c, waiting) {
  return c.merged.map(m => `<div class="rv-sub">${photoHtml(m.photo, m.id)}
    <div class="rv-subtext"><b>+ #${esc(m.id)}</b><span class="rv-meta">${esc(T.rvMergedBy(who(m.e), fmtWhen(m.e.at)))}</span></div>
    ${undoButton(m, waiting)}</div>`).join('');
}

function cardHtml(c, sel, waiting) {
  const b = c.b, wait = waiting.has(c.key) || c.merged.some(m => waiting.has(docId(m.session, m.id)));
  const why = b.present ? T.rvStillHere : !FIXABLE.includes(c.source) ? T.rvCantFix : wait ? T.rvWaitingBadge : '';
  const zones = b.zones.length ? b.zones.map(z => T.zoneN(z)).join(', ') : T.offMats;
  const out = b.present ? T.present : fmtHMS(b.lastOut);
  const meta = [b.plate, b.color, store.devices && store.devices.length > 1 ? b.feed.name : null].filter(Boolean).join(' · ');
  return `<article class="rv-card${sel.has(c.key) ? ' sel' : ''}${wait ? ' waiting' : ''}">
    ${photoHtml(c.photo, c.id)}
    <div class="rv-body">
      <div class="rv-head"><label title="${esc(why)}"><input type="checkbox" data-sel="${esc(c.key)}" ${sel.has(c.key) ? 'checked' : ''} ${why ? 'disabled' : ''}> #${esc(c.id)}</label>
        <span class="pill ${b.wash ? 'wash' : 'off'}">${esc(zones)}</span>${wait ? `<span class="pill wait">${esc(T.rvWaitingBadge)}</span>` : ''}</div>
      <div class="num">${fmtHMS(b.firstIn)} &rarr; ${esc(out)}${b.hasCompleted ? ` &middot; ${fmtDur(b.stay)}` : ''}</div>
      ${meta ? `<div class="rv-meta">${esc(meta)}</div>` : ''}
      ${mergedHtml(c, waiting)}
    </div></article>`;
}

function removedHtml(c, waiting) {
  const p = c.photo || {}, wait = waiting.has(c.key);
  const time = p.in_time_str ? String(p.in_time_str).slice(-8) : '';
  return `<article class="rv-card removed${wait ? ' waiting' : ''}">
    ${photoHtml(c.photo, c.id)}
    <div class="rv-body">
      <div class="rv-head"><span>#${esc(c.id)}</span>${p.zone ? `<span class="pill off">${esc(T.zoneN(p.zone))}</span>` : ''}
        ${wait ? `<span class="pill wait">${esc(T.rvWaitingBadge)}</span>` : ''}</div>
      ${time ? `<div class="num">${esc(time)}</div>` : ''}
      <div class="rv-sub rv-subtext"><span class="rv-meta">${esc(T.rvRemovedBy(who(c.e), fmtWhen(c.e.at)))}</span>${undoButton(c, waiting)}</div>
      ${mergedHtml(c, waiting)}
    </div></article>`;
}

function drawReview() {
  const body = $('#rvBody');
  if (!body || state.tab !== 'review') return;
  const key = state.rv.day, sel = state.rv.sel, waiting = waitingKeys();
  const { cards, removed, photoCount } = buildModel(key);
  rv.zoom = [];
  const live = new Map(cards.map(c => [c.key, c]));
  [...sel].forEach(k => { const c = live.get(k); if (!c || c.b.present || waiting.has(k)) sel.delete(k); });
  setStatus(T.rvStatus(cards.length, photoCount));
  $('#rvMsg').innerHTML = [
    DEMO ? `<p class="note">${esc(T.rvDemoNote)}</p>` : '',
    rv.blind ? `<p class="note rv-msg err">${esc(T.rvWatchFailed)}</p>` : '',
    rv.pending.size ? `<p class="note">${esc(T.rvWaiting(rv.pending.size))}</p>` : '',
    rv.msg ? `<p class="note rv-msg ${rv.msg.cls}">${esc(rv.msg.text)}</p>` : ''
  ].join('');
  rv.live = live;
  if (state.rv.view === 'compare') { drawCompare(); return; }
  if (!cards.length && !removed.length) { body.innerHTML = emptyBox(T.rvNoBikes, T.rvNoBikesText); drawViewSwitch(); return; }
  body.innerHTML = `
    <div class="rv-grid">${cards.map(c => cardHtml(c, sel, waiting)).join('')}</div>
    ${removed.length ? `<section class="rv-removed"><h2>${esc(T.rvRemoved(removed.length))}</h2>
      <div class="rv-grid">${removed.map(c => removedHtml(c, waiting)).join('')}</div></section>` : ''}
    <div id="rvActions"></div>`;
  drawActions();
}

/* The ticked bikes, in the order they came (the first is what a merge keeps). */
const chosenCards = () => [...rv.live.values()].filter(c => state.rv.sel.has(c.key));

const mergeFixes = chosen => {
  const [target, ...rest] = chosen;
  return rest.map(c => ({ action: 'merge', device: c.device, session_id: c.session, source: c.source,
    track_id: idValue(c.id), target: idValue(target.id) }));
};
const removeFix = c => ({ action: 'delete', device: c.device, session_id: c.session, source: c.source, track_id: idValue(c.id) });

function confirmMerge(chosen) {
  return confirm(T.rvConfirmMerge(chosen.map(c => `#${c.id}`).join(', '), chosen[0].id));
}

/* All bikes | Compare (n), above the cards. */
function drawViewSwitch() {
  const n = chosenCards().length;
  document.querySelectorAll('#rvView [data-v]').forEach(b => {
    b.setAttribute('aria-pressed', b.dataset.v === state.rv.view);
    if (b.dataset.v === 'compare') b.textContent = n ? T.rvCompareN(n) : T.rvCompare;
  });
}

/* The bar for the ticked bikes - redrawn alone when a box is ticked. */
function drawActions() {
  drawViewSwitch();
  const bar = $('#rvActions');
  if (!bar) return;
  const sel = state.rv.sel, chosen = chosenCards();
  const mixed = new Set(chosen.map(c => c.session)).size > 1;
  bar.innerHTML = chosen.length ? `<div class="rv-actions" role="toolbar">
      <b>${esc(T.rvSelected(chosen.length))}</b>
      <button class="btn primary" id="rvMerge" type="button" ${chosen.length < 2 || mixed || rv.busy ? 'disabled' : ''}>${esc(T.rvSame)}</button>
      <button class="btn" id="rvRemove" type="button" ${rv.busy ? 'disabled' : ''}>${esc(T.rvRemove)}</button>
      <button class="btn" id="rvCompare" type="button" ${chosen.length < 2 ? 'disabled' : ''}>${esc(T.rvCompare)}</button>
      <button class="btn" id="rvClear" type="button">${esc(T.rvClear)}</button>
      ${mixed ? `<span class="rv-meta">${esc(T.rvDiffSession)}</span>` : ''}</div>` : '';
  if (chosen.length) {
    $('#rvMerge').onclick = () => { if (confirmMerge(chosen)) sendFixes(mergeFixes(chosen)); };
    $('#rvRemove').onclick = () => {
      if (!confirm(T.rvConfirmRemove(chosen.map(c => `#${c.id}`).join(', ')))) return;
      sendFixes(chosen.map(removeFix));
    };
    $('#rvCompare').onclick = () => showView('compare');
    $('#rvClear').onclick = () => { sel.clear(); drawReview(); };
  }
}

function showView(view) {
  state.rv.view = view;
  drawReview();
  $('#rvView').scrollIntoView({ block: 'nearest' });
}

/* The ticked bikes side by side: big photos, and the same facts on the same
   lines under each, so they read across. */
function drawCompare() {
  const body = $('#rvBody'), chosen = chosenCards();
  drawViewSwitch();
  if (chosen.length < 2) {
    body.innerHTML = `${emptyBox(T.rvCompareEmpty, T.rvCompareHint)}
      <p style="text-align:center"><button class="btn" id="cmpBack" type="button">${esc(T.rvBack)}</button></p>`;
    $('#cmpBack').onclick = () => showView('all');
    return;
  }
  const mixed = new Set(chosen.map(c => c.session)).size > 1;
  const rows = [
    [T.cols.in, c => fmtHMS(c.b.firstIn)],
    [T.cols.out, c => (c.b.present ? T.present : fmtHMS(c.b.lastOut))],
    [T.cols.dur, c => (c.b.hasCompleted ? fmtDur(c.b.stay) : '-')],
    [T.cols.zone, c => (c.b.zones.length ? c.b.zones.map(z => T.zoneN(z)).join(', ') : T.offMats)],
    [T.cols.plate, c => c.b.plate || '-'],
    [T.cols.color, c => c.b.color || '-'],
    ...(store.devices && store.devices.length > 1 ? [[T.cols.feed, c => c.b.feed.name]] : [])
  ];
  body.innerHTML = `<div class="cmp" style="--cols:${Math.min(chosen.length, 3)}">${chosen.map(c => `
    <article class="cmp-col">
      <div class="cmp-head"><b>#${esc(c.id)}</b>
        <button class="btn small" type="button" data-drop="${esc(c.key)}" title="${esc(T.rvDropCompare)}" aria-label="${esc(T.rvDropCompare)}">&times;</button></div>
      ${photoHtml(c.photo, c.id)}
      <dl class="cmp-facts">${rows.map(([label, value]) => `<dt>${esc(label)}</dt><dd class="num">${esc(value(c))}</dd>`).join('')}</dl>
      ${c.merged.length ? `<div class="cmp-merged">${c.merged.map(m => `+ #${esc(m.id)}`).join(', ')}</div>` : ''}
      <button class="btn" type="button" data-remove-one="${esc(c.key)}" ${rv.busy ? 'disabled' : ''}>${esc(T.rvRemove)}</button>
    </article>`).join('')}</div>
    <div class="rv-actions" role="toolbar">
      <button class="btn primary" id="cmpMerge" type="button" ${mixed || rv.busy ? 'disabled' : ''}>${esc(T.rvSame)}</button>
      <button class="btn" id="cmpBack" type="button">${esc(T.rvBack)}</button>
      ${mixed ? `<span class="rv-meta">${esc(T.rvDiffSession)}</span>` : ''}</div>`;
  $('#cmpMerge').onclick = () => { if (confirmMerge(chosen)) sendFixes(mergeFixes(chosen)); };
  $('#cmpBack').onclick = () => showView('all');
}

/* ---- sending fixes ---- */
async function sendFixes(fixes, afterSent = () => state.rv.sel.clear()) {
  rv.busy = true; rv.msg = null; drawReview();
  try {
    if (DEMO) demoFixes(fixes);
    else {
      const { addDoc, collection, serverTimestamp } = FS;
      const by = (auth && auth.currentUser && auth.currentUser.email) || '';
      for (const f of fixes) {
        const data = { ...f, by, at: serverTimestamp(), status: 'pending' };
        if (data.target == null) delete data.target;
        await addDoc(collection(db, 'track_visits', SHOP_ID, 'edit_requests'), data);
      }
    }
    afterSent();
    if (state.rv.sel.size < 2) state.rv.view = 'all';
  } catch (e) {
    console.error(e);
    rv.msg = { cls: 'err', text: T.rvSendFailed };
  }
  rv.busy = false;
  drawReview();
}

/* Demo data: the fix is made in this page only, as edits.json would hold it. */
function demoFixes(fixes) {
  const sessions = rv.demoEdits.get(state.rv.day);
  fixes.forEach(f => {
    if (!sessions.has(f.session_id)) sessions.set(f.session_id, { device: f.device, tracks: {} });
    const tracks = sessions.get(f.session_id).tracks, id = String(f.track_id), stamp = { by: 'demo@example.com', at: Date.now() / 1000 };
    if (f.action === 'merge') tracks[id] = { ...stamp, merged_into: String(f.target) };
    else if (f.action === 'delete') tracks[id] = { ...stamp, deleted: true };
    else delete tracks[id];
  });
  rv.msg = { cls: 'ok', text: T.rvDone };
}

/* ---- the tab ---- */
export async function rReview() {
  if (!state.rv.day) state.rv.day = dkey(todayDate());
  const key = state.rv.day, shop = SHOP_ID, today = dkey(todayDate());
  $('#panel').innerHTML = `
    <div class="rv-bar">
      <button class="btn" id="rvPrev" type="button" aria-label="${esc(T.rvPrevDay)}" title="${esc(T.rvPrevDay)}">&#8249;</button>
      <input type="date" id="rvDay" value="${keyIso(key)}" max="${keyIso(today)}" aria-label="${esc(T.day)}">
      <button class="btn" id="rvNext" type="button" aria-label="${esc(T.rvNextDay)}" title="${esc(T.rvNextDay)}" ${key === today ? 'disabled' : ''}>&#8250;</button>
      <div class="seg" id="rvView" role="group" aria-label="${esc(T.rvViews)}">
        <button type="button" data-v="all" aria-pressed="${state.rv.view !== 'compare'}">${esc(T.rvAllBikes)}</button>
        <button type="button" data-v="compare" aria-pressed="${state.rv.view === 'compare'}">${esc(T.rvCompare)}</button>
      </div>
    </div>
    <p class="sub">${esc(T.rvLead)}</p>
    <div id="rvMsg"></div>
    <div id="rvBody">${emptyBox(T.loading, T.rvLoadingDay)}</div>
    <dialog class="rv-lightbox" id="rvBox"><button type="button" class="rv-nav prev" aria-label="Previous">&#8249;</button><img alt=""><button type="button" class="rv-nav next" aria-label="Next">&#8250;</button></dialog>`;
  const go = d => { state.rv.day = dkey(d); state.rv.sel.clear(); state.rv.view = 'all'; rv.msg = null; rReview(); };
  const day = isoToDate(keyIso(key));
  $('#rvPrev').onclick = () => go(addDays(day, -1));
  $('#rvNext').onclick = () => go(addDays(day, 1));
  $('#rvDay').onchange = e => { if (e.target.value && e.target.value <= dateToIso(todayDate())) go(isoToDate(e.target.value)); };
  $('#rvView').onclick = e => { const b = e.target.closest('[data-v]'); if (b) showView(b.dataset.v); };
  const box = $('#rvBox');
  let at = 0, x0 = null;
  const show = i => {
    if (!rv.zoom.length) return;
    at = (i + rv.zoom.length) % rv.zoom.length;
    box.querySelector('img').src = rv.zoom[at];
    box.classList.toggle('single', rv.zoom.length < 2);
  };
  box.onclick = e => {
    const nav = e.target.closest('.rv-nav');
    if (nav) { show(at + (nav.classList.contains('next') ? 1 : -1)); return; }
    box.close();
  };
  box.onkeydown = e => {
    if (e.key === 'ArrowLeft') show(at - 1);
    else if (e.key === 'ArrowRight') show(at + 1);
  };
  box.ontouchstart = e => { x0 = e.touches[0].clientX; };
  box.ontouchend = e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) { show(at + (dx < 0 ? 1 : -1)); e.preventDefault(); }
  };
  $('#rvBody').onclick = e => {
    const img = e.target.closest('[data-zoom]');
    if (img) { show(+img.dataset.zoom); box.showModal(); return; }
    const drop = e.target.closest('[data-drop]');
    if (drop) {
      state.rv.sel.delete(drop.dataset.drop);
      if (state.rv.sel.size < 2) state.rv.view = 'all';
      drawReview();
      return;
    }
    const one = e.target.closest('[data-remove-one]');
    if (one) {
      const c = rv.live.get(one.dataset.removeOne);
      if (c && confirm(T.rvConfirmRemove(`#${c.id}`))) sendFixes([removeFix(c)], () => state.rv.sel.delete(c.key));
      return;
    }
    const undo = e.target.closest('[data-undo]');
    if (undo) {
      const [session, id, device, source] = JSON.parse(undo.dataset.undo);
      sendFixes([{ action: 'restore', device, session_id: session, source, track_id: idValue(id) }]);
    }
  };
  $('#rvBody').onchange = e => {
    const box2 = e.target.closest('[data-sel]');
    if (!box2) return;
    if (box2.checked) state.rv.sel.add(box2.dataset.sel); else state.rv.sel.delete(box2.dataset.sel);
    box2.closest('.rv-card').classList.toggle('sel', box2.checked);
    drawActions();
  };
  watchRequests();
  try {
    await loadReviewDay(key);
  } catch (e) {
    if (state.tab === 'review') handleLoadError(e);
    return;
  }
  if (state.tab !== 'review' || state.rv.day !== key || shop !== SHOP_ID) return;
  drawReview();
}
