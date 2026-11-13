/* Small helpers: DOM, numbers, the shop's wall clock, date keys. */
import { T } from './i18n.js';
import { SHOP_TZ } from './shop.js';

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */
export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const pad = n => String(n).padStart(2, '0');
export const num = v => (typeof v === 'number' && isFinite(v)) ? v : null;
export const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
export const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const sum = a => a.reduce((x, y) => x + y, 0);


/* Wall-clock helpers: time_str is shop-local; never convert time zones. */
export function wallMs(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(str || '');
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null;
}
export function wallStr(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}
export const fmtHM = ms => ms == null ? '-' : wallStr(ms).slice(11, 16);
export const fmtHMS = ms => ms == null ? '-' : wallStr(ms).slice(11, 19);
/* The shop's clock now as [year, month 0-11, day, hour, minute, second]: in
   its time zone (SHOP_TZ), so the owner looking at a shop in another zone gets
   that shop's today; this browser's clock when there's none. */
export function shopNow() {
  const n = new Date();
  if (SHOP_TZ) {
    try {
      const p = {};
      new Intl.DateTimeFormat('en-US', { timeZone: SHOP_TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric',
        day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(n).forEach(x => { p[x.type] = +x.value; });
      return [p.year, p.month - 1, p.day, p.hour, p.minute, p.second];
    } catch (e) { /* a time zone this browser doesn't know */ }
  }
  return [n.getFullYear(), n.getMonth(), n.getDate(), n.getHours(), n.getMinutes(), n.getSeconds()];
}
export function toWallNow() { return Date.UTC(...shopNow()); }
export function fmtDur(s) {
  if (s == null) return '-';
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60, [uh, um, us] = T.durUnits;
  if (h) return `${h}${uh} ${pad(m)}${um}`;
  if (m) return `${m}${um} ${pad(x)}${us}`;
  return `${x}${us}`;
}

/* Date keys are DD-MM-YYYY (local calendar dates) */
export const dkey = d => `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
export const keyParts = k => { const [d, m, y] = k.split('-').map(Number); return { d, m, y }; };
export const keyIso = k => { const p = keyParts(k); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };
export const keyMs = k => { const p = keyParts(k); return Date.UTC(p.y, p.m - 1, p.d); };
export const keyLabel = k => { const p = keyParts(k); const dt = new Date(Date.UTC(p.y, p.m - 1, p.d)); return `${T.weekdays[dt.getUTCDay()]} ${p.d} ${T.months[p.m - 1]}`; };
export const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const todayDate = () => { const [y, m, d] = shopNow(); return new Date(y, m, d); };
export const isoToDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const dateToIso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fmtDateShort = d => `${d.getDate()} ${T.months[d.getMonth()]} ${d.getFullYear()}`;
export function keysBetween(a, b) { const out = []; for (let d = a; d <= b; d = addDays(d, 1)) out.push(dkey(d)); return out; }
