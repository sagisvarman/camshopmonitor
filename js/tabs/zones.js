/* Zones tab. */
import { T } from '../i18n.js';
import { emptyBox } from '../render.js';
import { rangeZoneDocs, state } from '../state.js';
import { zoneSort } from './timeline.js';
import { $, avg, esc, fmtDur, sum } from '../util.js';

/* ---- 6. Zone utilisation ---- */
export function rZones() {
  const docs = rangeZoneDocs();
  if (!docs.length) { $('#panel').innerHTML = emptyBox(T.noZoneRecords, T.noZoneRecordsText(state.rangeText)); return; }
  $('#panel').innerHTML = `<div class="filters"><label><input type="checkbox" id="zFeed" ${state.zn.byFeed ? 'checked' : ''}> ${T.splitByFeed}</label></div><div id="zBody"></div>`;
  $('#zFeed').onchange = e => { state.zn.byFeed = e.target.checked; fillZones(); };
  fillZones();
}
export function fillZones() {
  const byFeed = state.zn.byFeed, g = new Map();
  rangeZoneDocs().forEach(z => {
    const k = byFeed ? `${z.feed.label}\u0000${z.zone}` : z.zone;
    if (!g.has(k)) g.set(k, { zone: z.zone, feed: z.feed.label, n: 0, open: 0, durs: [] });
    const e = g.get(k);
    z.occ.forEach(o => { e.n++; if (o.dur != null) e.durs.push(o.dur); else e.open++; });
  });
  const rows = [...g.values()].sort((a, b) => zoneSort(a.zone, b.zone) || a.feed.localeCompare(b.feed));
  const max = Math.max(1, ...rows.map(r => sum(r.durs)));
  $('#zBody').innerHTML = `<div class="tw"><table class="num"><thead><tr><th>${T.zone}</th>${byFeed ? `<th>${T.feed}</th>` : ''}<th class="r">${T.occupancies}</th><th class="r">${T.totalOccupied}</th><th style="min-width:120px"></th><th class="r">${T.average}</th><th class="r">${T.longest}</th></tr></thead><tbody>
    ${rows.map(r => { const t = sum(r.durs); return `<tr><td>${esc(T.zoneN(r.zone))}</td>${byFeed ? `<td>${esc(r.feed)}</td>` : ''}<td class="r">${r.n}${r.open ? ` <span class="pill warn" title="${T.openTip}">${T.openN(r.open)}</span>` : ''}</td><td class="r">${fmtDur(t)}</td>
      <td><div class="bar" style="width:${t / max * 100}%"></div></td><td class="r">${fmtDur(avg(r.durs))}</td><td class="r">${fmtDur(r.durs.length ? Math.max(...r.durs) : null)}</td></tr>`; }).join('')}
    </tbody></table></div><p class="count" style="margin-top:8px">${T.zonesNote}</p>`;
}
