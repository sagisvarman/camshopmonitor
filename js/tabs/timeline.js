/* Timeline tab. */
import { cache } from '../data.js';
import { reasonText, T } from '../i18n.js';
import { emptyBox, noData } from '../render.js';
import { state } from '../state.js';
import { $, dkey, esc, fmtDur, fmtHMS, keyLabel, keyParts, pad, todayDate, toWallNow } from '../util.js';

/* ---- 3. Day timeline ---- */
export const zoneSort = (a, b) => a === '' ? 1 : b === '' ? -1 : a.localeCompare(b, undefined, { numeric: true });
export function rTimeline() {
  const days = state.keys.filter(k => ((cache.get(k) || {}).bikes || []).length);
  if (!days.length) { $('#panel').innerHTML = noData(); return; }
  if (!days.includes(state.tl.day)) state.tl.day = days[days.length - 1];
  $('#panel').innerHTML = `
    <div class="filters"><select id="tlDay" aria-label="${T.day}">${[...days].reverse().map(k => `<option value="${esc(k)}" ${k === state.tl.day ? 'selected' : ''}>${esc(keyLabel(k))} (${cache.get(k).bikes.length})</option>`).join('')}</select></div>
    <div class="legend"><span><i style="background:var(--wash)"></i>${T.wash}</span><span><i style="background:var(--off)"></i>${T.offTheMats}</span>
      <span><i style="background:repeating-linear-gradient(90deg,var(--wash) 0 4px,transparent 4px 6px)"></i>${T.tlLegendOpen}</span><span><i style="border:2px solid var(--warn);height:4px"></i>${T.closedCrash}</span></div>
    <div class="box" id="tlBox"></div>`;
  $('#tlDay').onchange = e => { state.tl.day = e.target.value; fillTimeline(); };
  fillTimeline();
}
export function fillTimeline() {
  const key = state.tl.day, bikes = cache.get(key).bikes, p = keyParts(key);
  const dayStart = Date.UTC(p.y, p.m - 1, p.d), dayEnd = dayStart + 864e5;
  const isToday = key === dkey(todayDate()), nowWall = toWallNow();
  const items = [];
  let skipped = 0;
  bikes.forEach(b => b.visits.forEach(v => {
    if (v.inWall == null) { skipped++; return; }
    const end = v.outWall ?? (isToday ? nowWall : null);
    items.push({ b, v, end });
  }));
  if (!items.length) { $('#tlBox').innerHTML = emptyBox(T.nothingToDraw, T.nothingToDrawText); return; }
  let lo = Math.max(dayStart, Math.min(...items.map(i => i.v.inWall)));
  let hi = Math.min(dayEnd, Math.max(...items.map(i => i.end ?? i.v.inWall + 36e5)));
  let t0 = dayStart + Math.floor((lo - dayStart) / 36e5) * 36e5, t1 = dayStart + Math.ceil((hi - dayStart) / 36e5) * 36e5;
  if (t1 - t0 < 72e5) { t1 = Math.min(dayEnd, t0 + 72e5); if (t1 - t0 < 72e5) t0 = t1 - 72e5; }
  const N = (t1 - t0) / 36e5, span = t1 - t0;
  const ticks = Array.from({ length: N + 1 }, (_, i) => `<i class="${i % 2 ? 'minor' : ''}" style="left:${i / N * 100}%">${pad(((t0 - dayStart) / 36e5 + i) % 24)}:00</i>`).join('');
  const groups = new Map();
  items.forEach(i => { const z = i.v.zone || ''; if (!groups.has(z)) groups.set(z, []); groups.get(z).push(i); });
  const body = [...groups.keys()].sort(zoneSort).map(z => {
    const rows = groups.get(z).sort((a, b) => a.v.inWall - b.v.inWall).map(({ b, v, end }) => {
      const s = Math.max(t0, v.inWall), e = Math.min(t1, end ?? t1);
      const left = (s - t0) / span * 100, width = Math.max(0.5, (e - s) / span * 100);
      const open = !v.hasOut;
      const tip = `#${b.trackId} ${b.feed.label}${b.plate ? ', ' + b.plate : ''}: ${fmtHMS(v.inWall)} ${T.to} ${v.hasOut ? fmtHMS(v.outWall) : T.stillPresent}${v.hasOut ? ', ' + fmtDur(v.duration) : ''}, ${v.wash ? T.washLc : T.offLc}${b.reason ? ', ' + T.closedAfter(reasonText(b.reason)) : ''}`;
      return `<div class="tl-row"><div class="tl-label" title="${esc(tip)}">#${esc(b.trackId)} ${esc(b.feed.name)}</div>
        <div class="tl-track" style="--n:${N}"><div class="tl-bar ${v.wash ? '' : 'off'} ${open ? 'open' : ''} ${b.reason ? 'flag' : ''}" style="left:${left}%;width:${width}%" role="img" tabindex="0" aria-label="${esc(tip)}" title="${esc(tip)}"></div></div></div>`;
    }).join('');
    return `<div class="tl-zone">${z ? esc(T.zoneN(z)) : T.noZoneOff}</div>${rows}`;
  }).join('');
  $('#tlBox').innerHTML = `<div class="tl-row"><div></div><div class="tl-axis">${ticks}</div></div>${body}${skipped ? `<p class="count">${T.notDrawn(skipped)}</p>` : ''}`;
}
