/* Feeds tab. */
import { cssVar, mkChart, yInt } from '../charts.js';
import { T } from '../i18n.js';
import { noData } from '../render.js';
import { rangeBikes } from '../state.js';
import { $, avg, esc, fmtDur } from '../util.js';

/* ---- 7. Feed comparison ---- */
export function rFeeds() {
  const bikes = rangeBikes();
  if (!bikes.length) { $('#panel').innerHTML = noData(); return; }
  const g = new Map();
  bikes.forEach(b => { if (!g.has(b.feed.label)) g.set(b.feed.label, []); g.get(b.feed.label).push(b); });
  const rows = [...g.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, bs]) => ({
    label, n: bs.length, washes: bs.filter(b => b.wash).length, off: bs.filter(b => !b.wash).length,
    avg: avg(bs.filter(b => b.hasCompleted).map(b => b.stay)), sessions: new Set(bs.map(b => b.sessionId)).size,
    days: new Set(bs.map(b => b.date)).size, flagged: bs.filter(b => b.reason).length }));
  $('#panel').innerHTML = `
    <div class="box"><h2>${T.feedChart}</h2><div class="chartbox" style="height:${Math.max(180, rows.length * 56 + 70)}px"><canvas id="cFeed" aria-label="${T.totalsPerFeed}"></canvas></div></div>
    <div class="tw"><table class="num"><thead><tr><th>${T.feed}</th><th class="r">${T.bikes}</th><th class="r">${T.washes}</th><th class="r">${T.offMats}</th><th class="r">${T.avgStayShort}</th><th class="r">${T.sessions}</th><th class="r">${T.daysActive}</th><th class="r">${T.flagged}</th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${esc(r.label)}</td><td class="r">${r.n}</td><td class="r">${r.washes}</td><td class="r">${r.off}</td><td class="r">${fmtDur(r.avg)}</td><td class="r">${r.sessions}</td><td class="r">${r.days}</td><td class="r">${r.flagged || '-'}</td></tr>`).join('')}
    </tbody></table></div><p class="count" style="margin-top:8px">${T.flaggedNote}</p>`;
  mkChart('cFeed', { type: 'bar', data: { labels: rows.map(r => r.label), datasets: [
    { label: T.washes, data: rows.map(r => r.washes), backgroundColor: cssVar('--wash'), borderRadius: 3 },
    { label: T.offTheMats, data: rows.map(r => r.off), backgroundColor: cssVar('--off'), borderRadius: 3 }] },
    options: { indexAxis: 'y', scales: { x: Object.assign({ stacked: true }, yInt), y: { stacked: true, grid: { display: false } } }, plugins: { legend: { position: 'bottom' } } } });
}
