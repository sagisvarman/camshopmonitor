/* Summary tab. */
import { cssVar, mkChart, yInt } from '../charts.js';
import { cache } from '../data.js';
import { T } from '../i18n.js';
import { noData } from '../render.js';
import { rangeBikes, state } from '../state.js';
import { $, avg, esc, fmtDur, fmtHM, keyLabel, median, sum } from '../util.js';

/* ---- 1. Summary ---- */
export function dayRows(keys = state.keys) {
  return keys.map(k => {
    const bikes = (cache.get(k) || {}).bikes || [];
    const washes = bikes.filter(b => b.wash).length;
    const stays = bikes.filter(b => b.hasCompleted).map(b => b.stay);
    const ins = bikes.map(b => b.firstIn).filter(x => x != null), outs = bikes.map(b => b.lastOut).filter(x => x != null);
    return { key: k, n: bikes.length, washes, off: bikes.length - washes, avg: avg(stays), med: median(stays),
      first: ins.length ? Math.min(...ins) : null, last: outs.length ? Math.max(...outs) : null,
      flagged: bikes.filter(b => b.reason).length, legacy: bikes.filter(b => b.legacy).length };
  });
}

export function rSummary() {
  const rows = dayRows(), bikes = rangeBikes();
  if (!bikes.length) { $('#panel').innerHTML = noData(); return; }
  const washes = bikes.filter(b => b.wash).length, off = bikes.length - washes;
  const stays = bikes.filter(b => b.hasCompleted).map(b => b.stay);
  const flaggedDays = rows.filter(r => r.flagged), legacyN = sum(rows.map(r => r.legacy));
  let notes = '';
  if (flaggedDays.length) notes += `<p class="note"><b>${T.dataQuality}</b> ${esc(T.noteFlagged(flaggedDays.length, flaggedDays.map(r => keyLabel(r.key) + ': ' + r.flagged).join(', ')))}</p>`;
  if (legacyN) notes += `<p class="note"><b>${T.dataQuality}</b> ${esc(T.noteLegacy(legacyN))}</p>`;

  $('#panel').innerHTML = `
    <h1 class="hero"><span class="n num">${washes}</span> ${esc(T.heroWashes(washes, state.rangeText))}</h1>
    <p class="sub">${esc(T.heroSub(off, bikes.length))}</p>
    <div class="strip num">
      <div><b>${bikes.length}</b><span>${T.bikesSeen}</span></div>
      <div><b>${washes}</b><span>${T.washes}</span></div>
      <div><b>${off}</b><span>${T.offTheMats}</span></div>
      <div><b>${fmtDur(avg(stays))}</b><span>${T.avgStay}</span></div>
      <div><b>${fmtDur(median(stays))}</b><span>${T.medianStay}</span></div>
    </div>
    ${notes}
    <div class="box"><h2>${T.washesPerDay}</h2><div class="chartbox"><canvas id="cDay" aria-label="${T.washesPerDay}"></canvas></div></div>
    <div class="tw"><table class="num">
      <thead><tr><th>${T.day}</th><th class="r">${T.bikes}</th><th class="r">${T.avgStayShort}</th><th class="r">${T.median}</th><th class="r">${T.firstIn}</th><th class="r">${T.lastOut}</th></tr></thead>
      <tbody>${[...rows].reverse().map(r => `
        <tr class="${r.n ? '' : 'dim'}"><td>${esc(keyLabel(r.key))} ${r.flagged ? `<span class="warnicon" title="${T.flaggedDayTip}" aria-label="${T.flaggedDayTip}">&#9888;</span>` : ''}</td>
        <td class="r">${r.n}</td>
        <td class="r">${fmtDur(r.avg)}</td><td class="r">${fmtDur(r.med)}</td><td class="r">${fmtHM(r.first)}</td><td class="r">${fmtHM(r.last)}</td></tr>`).join('')}
      </tbody></table></div>`;
  mkChart('cDay', { type: 'bar', data: { labels: rows.map(r => keyLabel(r.key)), datasets: [
    { label: T.washes, data: rows.map(r => r.washes), backgroundColor: cssVar('--wash'), borderRadius: 3 },
    { label: T.offTheMats, data: rows.map(r => r.off), backgroundColor: cssVar('--off'), borderRadius: 3 }] },
    options: { scales: { x: { stacked: true, grid: { display: false } }, y: Object.assign({ stacked: true }, yInt) }, plugins: { legend: { position: 'bottom' } } } });
}
