/* Present now tab. */
import { STALE_HOURS } from '../config.js';
import { cache, loadDays } from '../data.js';
import { dataSrc, T } from '../i18n.js';
import { emptyBox, handleLoadError } from '../render.js';
import { setStatus, state } from '../state.js';
import { isStale, openVisit, presentAge } from './visits.js';
import { $, dkey, esc, fmtDur, fmtHMS, todayDate } from '../util.js';

/* ---- 8. Present now ---- */
export async function rNow() {
  const key = dkey(todayDate());
  $('#panel').innerHTML = emptyBox(T.loading, T.checkingNow);
  try {
    if (!cache.has(key)) { const st = await loadDays([key]); setStatus(T.readToday(st.docs, dataSrc())); }
  } catch (e) { handleLoadError(e); return; }
  if (state.tab !== 'now' || !cache.has(key)) return; /* left the tab, or picked another shop */
  const here = (cache.get(key) || {}).bikes.filter(b => b.present);
  const fresh = here.filter(b => !isStale(b)), stale = here.filter(isStale);
  const tbl = (list, stale) => `<div class="tw"><table class="num"><thead><tr><th>${T.feed}</th><th>${T.cols.bike}</th><th>${T.cols.plate}</th><th>${T.zone}</th><th>${T.cols.in}</th><th class="r">${stale ? T.openFor : T.soFar}</th></tr></thead><tbody>
    ${list.map(b => { const v = openVisit(b), age = presentAge(b); return `<tr><td>${esc(b.feed.label)}</td><td>#${esc(b.trackId)}</td><td>${esc(b.plate || '-')}</td><td>${esc((v && v.zone) || '-')}</td><td>${fmtHMS(v && v.inWall)}</td><td class="r">${age != null ? fmtDur(age) : '-'}</td></tr>`; }).join('')}
    </tbody></table></div>`;
  $('#panel').innerHTML = `
    <h1 class="hero" style="max-width:none"><span class="n num">${fresh.length}</span> ${esc(T.heroNow(fresh.length))}</h1>
    <p class="sub">${esc(T.nowSub(key, STALE_HOURS))}</p>
    ${fresh.length ? tbl(fresh, false) : emptyBox(T.noneHere, T.noneHereText)}
    ${stale.length ? `<h2 style="margin:22px 0 8px;font-size:18px">${T.possiblyStale} (${stale.length})</h2>${tbl(stale, true)}` : ''}`;
}
