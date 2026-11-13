/* Loading the range and drawing the open tab. */
import { destroyCharts } from './charts.js';
import { DEMO, REQUIRE_LOGIN, SHOW_CCTV } from './config.js';
import { cache, loadDays } from './data.js';
import { dataSrc, T } from './i18n.js';
import { showDenied } from './main.js';
import { store } from './shop.js';
import { computeRange, setStatus, state } from './state.js';
import { rCctv, stopCctv } from './tabs/cctv.js';
import { rDurations } from './tabs/durations.js';
import { rFeeds } from './tabs/feeds.js';
import { rHours } from './tabs/hours.js';
import { rNow } from './tabs/now.js';
import { rReview, stopReview } from './tabs/review.js';
import { rSummary } from './tabs/summary.js';
import { rTimeline } from './tabs/timeline.js';
import { rVisits } from './tabs/visits.js';
import { rWeekly } from './tabs/weekly.js';
import { rZones } from './tabs/zones.js';
import { $, dkey, esc, sum, todayDate } from './util.js';

export async function refreshData(force = false) {
  if (!DEMO && !store.shops.length) return; /* still finding out which shop this login is for */
  const r = computeRange();
  if (r.error) { state.keys = []; setStatus(r.error, 'warn'); $('#panel').innerHTML = ''; return; }
  if (force) { r.keys.forEach(k => cache.delete(k)); cache.delete(dkey(todayDate())); store.devices = null; }
  state.keys = r.keys; state.rangeText = r.text;
  const seq = ++state.loadSeq;
  setStatus(T.reading(r.keys.length));
  if (r.keys.some(k => !cache.has(k))) $('#panel').innerHTML = emptyBox(T.loading, T.fetching(r.text));
  try {
    const st = await loadDays(r.keys);
    if (seq !== state.loadSeq) return;
    state.lastLoad = st;
    const total = sum(r.keys.map(k => (cache.get(k) || {}).nDocs || 0));
    setStatus(T.loaded(r.keys.length, total, st, dataSrc()));
    renderPanel();
  } catch (e) {
    if (seq !== state.loadSeq) return;
    handleLoadError(e);
  }
}

export function handleLoadError(e) {
  console.error(e);
  const denied = e && (e.code === 'permission-denied' || /insufficient permissions|permission-denied/i.test(String(e.message)));
  if (denied && REQUIRE_LOGIN) { showDenied(); return; }
  if (denied) {
    setStatus(T.refused, 'err');
    $('#panel').innerHTML = `<div class="empty"><b>${esc(T.rulesBlock)}</b>${esc(T.rulesBlockText)}<button class="btn" id="retry" type="button">${esc(T.tryAgain)}</button></div>`;
    $('#retry').onclick = () => refreshData(true);
    return;
  }
  setStatus(T.loadFailed(e && e.message ? e.message : e), 'err');
  $('#panel').innerHTML = `<div class="empty"><b>${esc(T.readError)}</b>${esc(T.readErrorText)}<button class="btn" id="retry" type="button">${esc(T.tryAgain)}</button></div>`;
  $('#retry').onclick = () => refreshData(true);
}


/* ------------------------------------------------------------------ */
/* Rendering                                                           */
/* ------------------------------------------------------------------ */
export const TABS = ['summary', 'visits', 'review', 'timeline', 'hours', 'durations', 'zones', 'feeds', 'now', ...(SHOW_CCTV ? ['cctv'] : []), 'weekly'];

export function buildTabs() {
  $('#tabs').innerHTML = TABS.map(id =>
    `<button role="tab" type="button" data-t="${id}" aria-selected="${id === state.tab}">${esc(T.tabs[id])}</button>`).join('');
}

export const emptyBox = (title, text) => `<div class="empty"><b>${esc(title)}</b>${esc(text)}</div>`;
export const noData = () => emptyBox(T.noBikes, T.noBikesText(state.rangeText));

export function renderPanel() {
  destroyCharts();
  stopCctv();
  if (state.tab !== 'review') stopReview();
  document.body.classList.toggle('wk-mode', state.tab === 'weekly');
  document.body.classList.toggle('cctv-mode', state.tab === 'cctv');
  document.body.classList.toggle('rv-mode', state.tab === 'review');
  const fn = { summary: rSummary, visits: rVisits, review: rReview, timeline: rTimeline, hours: rHours, durations: rDurations,
    zones: rZones, feeds: rFeeds, now: rNow, cctv: rCctv, weekly: rWeekly }[state.tab];
  fn();
}
