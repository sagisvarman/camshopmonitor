/* Page state: the date range, each tab's filters, the status line. */
import { MAX_DAYS, PAGE_SIZE } from './config.js';
import { cache } from './data.js';
import { T } from './i18n.js';
import { $, addDays, fmtDateShort, isoToDate, keysBetween, todayDate } from './util.js';

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */
/* The weekly report's price per wash is kept in this browser only: the
   page writes nothing to Firestore but the CCTV tab's watch time. */
export const PRICE_KEY = 'washReportPrice';
export function savedPrice() { try { return localStorage.getItem(PRICE_KEY) || ''; } catch (e) { return ''; } }

export const state = {
  preset: '7', customStart: '', customEnd: '', keys: [], rangeText: '', loadSeq: 0, lastLoad: null,
  tab: 'summary',
  v: { feed: '', source: '', zone: '', washOnly: false, q: '', sort: 'in', dir: 'desc', limit: PAGE_SIZE, open: new Set() },
  tl: { day: '' }, dur: { washOnly: false, skipFlagged: false }, zn: { byFeed: false },
  wk: { from: '', to: '' }, col: { price: savedPrice() }
};


export const rangeBikes = () => state.keys.flatMap(k => (cache.get(k) || {}).bikes || []);
export const rangeZoneDocs = () => state.keys.flatMap(k => (cache.get(k) || {}).zones || []);

export function computeRange() {
  const end = todayDate();
  let start, text;
  if (state.preset === 'today') { start = end; text = T.rangeToday; }
  else if (state.preset === '7') { start = addDays(end, -6); text = T.range7; }
  else if (state.preset === '30') { start = addDays(end, -29); text = T.range30; }
  else {
    if (!state.customStart || !state.customEnd) return { error: T.needDates };
    start = isoToDate(state.customStart);
    const e = isoToDate(state.customEnd);
    if (start > e) return { error: T.startAfterEnd };
    const days = Math.round((e - start) / 864e5) + 1;
    if (days > MAX_DAYS) return { error: T.tooManyDays(MAX_DAYS, days) };
    return { keys: keysBetween(start, e), text: T.rangeCustom(fmtDateShort(start), fmtDateShort(e)) };
  }
  return { keys: keysBetween(start, end), text };
}

export function setStatus(msg, cls = '') { const s = $('#status'); s.textContent = msg; s.className = 'status ' + cls; }
