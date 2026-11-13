/* Busy hours tab. */
import { cssVar, mkChart, yInt } from '../charts.js';
import { plural, T } from '../i18n.js';
import { noData } from '../render.js';
import { rangeBikes, state } from '../state.js';
import { $, esc, pad } from '../util.js';

/* ---- 4. Busy hours ---- */
export function rHours() {
  const bikes = rangeBikes().filter(b => b.firstIn != null);
  if (!bikes.length) { $('#panel').innerHTML = noData(); return; }
  const byHour = Array(24).fill(0), heat = Array.from({ length: 7 }, () => Array(24).fill(0));
  bikes.forEach(b => { const d = new Date(b.firstIn), h = d.getUTCHours(); byHour[h]++; heat[(d.getUTCDay() + 6) % 7][h]++; });
  const act = byHour.map((c, h) => c ? h : -1).filter(h => h >= 0), h0 = Math.min(...act), h1 = Math.max(...act);
  const hours = Array.from({ length: h1 - h0 + 1 }, (_, i) => h0 + i);
  const peak = byHour.indexOf(Math.max(...byHour)), maxCell = Math.max(...heat.flat());
  const days = [1, 2, 3, 4, 5, 6, 0].map(i => T.weekdays[i]);
  $('#panel').innerHTML = `
    <h2 style="font-size:22px;margin-bottom:4px">${T.busiestHourIs(`${pad(peak)}:00`)}</h2>
    <p class="sub">${esc(T.hoursSub(byHour[peak], pad(peak), state.rangeText))}</p>
    <div class="box"><h2>${T.arrivalsByHourOfDay}</h2><div class="chartbox"><canvas id="cHour" aria-label="${T.arrivalsPerHour}"></canvas></div></div>
    <div class="box"><h2>${T.hourByWeekday}</h2><div class="tw" style="border:0"><div class="heat" style="grid-template-columns:44px repeat(${hours.length},minmax(26px,1fr))">
      <div></div>${hours.map(h => `<div class="h">${pad(h)}</div>`).join('')}
      ${heat.map((row, d) => `<div class="d">${days[d]}</div>${hours.map(h => { const c = row[h]; return `<div class="c num" title="${days[d]} ${pad(h)}:00, ${plural(c, 'arrival')}" style="${c ? `background:color-mix(in srgb,var(--wash) ${Math.round(14 + 86 * c / maxCell)}%,transparent)` : ''}">${c || ''}</div>`; }).join('')}`).join('')}
    </div></div></div>`;
  mkChart('cHour', { type: 'bar', data: { labels: hours.map(h => pad(h) + ':00'), datasets: [{ label: T.arrivals, data: hours.map(h => byHour[h]), backgroundColor: cssVar('--wash'), borderRadius: 3 }] },
    options: { scales: { x: { grid: { display: false } }, y: yInt }, plugins: { legend: { display: false } } } });
}
