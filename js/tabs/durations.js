/* Stay times tab. */
import { cssVar, destroyCharts, mkChart, yInt } from '../charts.js';
import { T } from '../i18n.js';
import { emptyBox, noData } from '../render.js';
import { rangeBikes, state } from '../state.js';
import { zoneSort } from './timeline.js';
import { $, avg, esc, fmtDur, median } from '../util.js';

/* ---- 5. Duration stats ---- */
export const statsOf = a => ({ n: a.length, avg: avg(a), med: median(a), max: a.length ? Math.max(...a) : null, min: a.length ? Math.min(...a) : null });
export const STAY_BOUNDS = [[0, 180], [180, 300], [300, 480], [480, 720], [720, 1200], [1200, 2400], [2400, Infinity]];
export const stayBuckets = () => STAY_BOUNDS.map(([a, z], i) => [T.stayBuckets[i], a, z]);
export function rDurations() {
  if (!rangeBikes().length) { $('#panel').innerHTML = noData(); return; }
  const f = state.dur;
  $('#panel').innerHTML = `
    <div class="filters">
      <label><input type="checkbox" id="dWash" ${f.washOnly ? 'checked' : ''}> ${T.washesOnly}</label>
      <label><input type="checkbox" id="dFlag" ${f.skipFlagged ? 'checked' : ''}> ${T.skipFlagged}</label>
    </div><div id="durBody"></div>`;
  $('#dWash').onchange = e => { f.washOnly = e.target.checked; fillDurations(); };
  $('#dFlag').onchange = e => { f.skipFlagged = e.target.checked; fillDurations(); };
  fillDurations();
}
export function fillDurations() {
  destroyCharts();
  const f = state.dur;
  const set = rangeBikes().filter(b => b.hasCompleted && (!f.washOnly || b.wash) && (!f.skipFlagged || !b.reason));
  const body = $('#durBody');
  if (!set.length) { body.innerHTML = emptyBox(T.noFinished, T.noFinishedText); return; }
  const all = statsOf(set.map(b => b.stay));
  const zoneMap = new Map();
  set.forEach(b => { const z = b.zone || ''; if (!zoneMap.has(z)) zoneMap.set(z, []); zoneMap.get(z).push(b.stay); });
  const buckets = stayBuckets();
  body.innerHTML = `
    <div class="strip num"><div><b>${fmtDur(all.avg)}</b><span>${T.average}</span></div><div><b>${fmtDur(all.med)}</b><span>${T.median}</span></div>
      <div><b>${fmtDur(all.max)}</b><span>${T.longest}</span></div><div><b>${fmtDur(all.min)}</b><span>${T.shortest}</span></div><div><b>${all.n}</b><span>${T.bikesCounted}</span></div></div>
    <div class="box"><h2>${T.howLongStay}</h2><div class="chartbox"><canvas id="cDur" aria-label="${T.stayDist}"></canvas></div></div>
    <div class="tw"><table class="num"><thead><tr><th>${T.zone}</th><th class="r">${T.bikes}</th><th class="r">${T.average}</th><th class="r">${T.median}</th><th class="r">${T.longest}</th><th class="r">${T.shortest}</th></tr></thead><tbody>
      ${[...zoneMap.keys()].sort(zoneSort).map(z => { const s = statsOf(zoneMap.get(z)); return `<tr><td>${z ? esc(T.zoneN(z)) : T.noZone}</td><td class="r">${s.n}</td><td class="r">${fmtDur(s.avg)}</td><td class="r">${fmtDur(s.med)}</td><td class="r">${fmtDur(s.max)}</td><td class="r">${fmtDur(s.min)}</td></tr>`; }).join('')}
    </tbody></table></div>
    <p class="count" style="margin-top:8px">${T.stayNote}</p>`;
  mkChart('cDur', { type: 'bar', data: { labels: buckets.map(b => b[0]), datasets: [{ label: T.bikes, data: buckets.map(([, a, z]) => set.filter(b => b.stay >= a && b.stay < z).length), backgroundColor: cssVar('--wash'), borderRadius: 3 }] },
    options: { scales: { x: { grid: { display: false } }, y: yInt }, plugins: { legend: { display: false } } } });
}
