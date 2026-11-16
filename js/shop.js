/* The shop shown and the shops this login can see. */
import { cache } from './data.js';
import { db, FS } from './firebase.js';
import { $, esc } from './util.js';

/* The shop shown: the signed-in login's own (see SHOPS AND LOGINS), or the
   one picked in the owner's shop picker. These are only what's shown before
   that, in demo data, and without sign-in (REQUIRE_LOGIN false). */
export let SHOP_ID = 'testshop-1';
/* Printed at the top of the Weekly report tab's printable sheet. */
export let SHOP_NAME = 'Shop name';
/* The shop's time zone, for which day is today there; null = this browser's. */
export let SHOP_TZ = null;

/* devices: names under track_visits/{SHOP_ID}/devices, null = list again.
   shops: [{ id, name, tz }] this login can see: its own, or every shop for
   the owner. */
export const store = { devices: null, shops: [], access: null };
export const SHOP_KEY = 'washReportShop';

export const shopInfo = snap => { const d = snap.data() || {}; return { id: snap.id, name: d.name || snap.id, tz: d.timezone || null }; };

/* What this login may see: {shop: ['*'] | [phone, ...]} from its "access"
   claim (an older login's single "shop" claim = that shop, all phones), read
   fresh so a change on the Accounts page counts at once. null = the owner's
   login: every shop and phone. A client may only read what it's listed for;
   the rules refuse the rest (permission-denied). */
export async function loadShops(user) {
  const { collection, doc, getDoc, getDocs } = FS;
  store.access = null;
  if (user) {
    const c = (await user.getIdTokenResult(true)).claims;
    const a = { ...(c.access || {}) };
    if (c.shop && !a[c.shop]) a[c.shop] = ['*'];
    if (Object.keys(a).length) store.access = a;
  } else if (SHOP_ID) {
    store.access = { [SHOP_ID]: ['*'] };
  }
  if (store.access) {
    const snaps = await Promise.all(Object.keys(store.access).map(id => getDoc(doc(db, 'track_visits', id))));
    return snaps.filter(x => x.exists()).map(shopInfo).sort((a, b) => a.name.localeCompare(b.name));
  }
  const snap = await getDocs(collection(db, 'track_visits'));
  return snap.docs.filter(x => x.data().shop_id).map(shopInfo).sort((a, b) => a.name.localeCompare(b.name));
}

export function useShop(s) {
  SHOP_ID = s.id; SHOP_NAME = s.name; SHOP_TZ = s.tz;
  cache.clear(); store.devices = null;
  try { localStorage.setItem(SHOP_KEY, s.id); } catch (e) { /* storage blocked */ }
  const pick = $('#shopPick');
  pick.hidden = store.shops.length < 2;
  pick.innerHTML = store.shops.map(x => `<option value="${esc(x.id)}" ${x.id === s.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('');
  $('#shopName').textContent = store.shops.length < 2 ? s.name : '';
}
