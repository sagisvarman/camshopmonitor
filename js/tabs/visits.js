/* Visit log tab. */
import { ALLOWED_SOURCES, PAGE_SIZE, STALE_HOURS } from '../config.js';
import { plural, reasonText, T } from '../i18n.js';
import { emptyBox, noData } from '../render.js';
import { rangeBikes, state } from '../state.js';
import { $, esc, fmtDur, fmtHMS, toWallNow } from '../util.js';

/* ---- 2. Visit log ---- */
export const openVisit = b => { for (let i = b.visits.length - 1; i >= 0; i--) if (!b.visits[i].hasOut) return b.visits[i]; return b.visits[b.visits.length - 1]; };
export function presentAge(b) {
  const v = openVisit(b);
  if (!v) return null;
  if (v.inEpoch != null) return Date.now() / 1000 - v.inEpoch;
  if (v.inWall != null) return (toWallNow() - v.inWall) / 1000;
  return null;
}
export const isStale = b => b.present && (presentAge(b) ?? 0) > STALE_HOURS * 3600;
export const statusLabel = b => b.present ? (isStale(b) ? T.possiblyStale : T.present) : T.departed;

export function filterVisits() {
  const f = state.v, q = f.q.trim().toLowerCase();
  return rangeBikes().filter(b =>
    (!f.feed || b.feed.label === f.feed) && (!f.source || b.source === f.source) &&
    (!f.zone || (f.zone === '__none' ? b.zones.length === 0 : b.zones.includes(f.zone))) &&
    (!f.washOnly || b.wash) && (!q || (b.plate || '').toLowerCase().includes(q)));
}
export function sortVal(b, k) {
  switch (k) {
    case 'date': return b.dayMs + ((b.firstIn ?? b.dayMs) - b.dayMs) / 1e9;
    case 'feed': return b.feed.label; case 'bike': return b.trackId; case 'plate': return b.plate;
    case 'color': return b.color;
    case 'in': return b.firstIn ?? b.dayMs; case 'out': return b.lastOut;
    case 'dur': return b.hasCompleted ? b.stay : null; case 'zone': return b.zone;
    case 'type': return b.wash ? T.wash : T.offMats; case 'status': return statusLabel(b);
  }
}
export function sortedVisits() {
  const { sort, dir } = state.v, m = dir === 'asc' ? 1 : -1;
  return filterVisits().sort((a, b) => {
    const x = sortVal(a, sort), y = sortVal(b, sort);
    if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
    return (typeof x === 'string' ? x.localeCompare(y, undefined, { numeric: true }) : x - y) * m;
  });
}

export function rVisits() {
  const bikes = rangeBikes();
  if (!bikes.length) { $('#panel').innerHTML = noData(); return; }
  const f = state.v;
  const feeds = [...new Set(bikes.map(b => b.feed.label))].sort();
  const zones = [...new Set(bikes.flatMap(b => b.zones))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  const opt = (v, label, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(label)}</option>`;
  $('#panel').innerHTML = `
    <div class="filters">
      <select id="fFeed" aria-label="${T.feed}">${opt('', T.allFeeds, f.feed)}${feeds.map(x => opt(x, x, f.feed)).join('')}</select>
      <select id="fSource" aria-label="${T.source}">${opt('', T.allSources, f.source)}${ALLOWED_SOURCES.map(x => opt(x, x, f.source)).join('')}</select>
      <select id="fZone" aria-label="${T.zone}">${opt('', T.allZones, f.zone)}${zones.map(x => opt(x, T.zoneN(x), f.zone)).join('')}${opt('__none', T.noZone, f.zone)}</select>
      <label><input type="checkbox" id="fWash" ${f.washOnly ? 'checked' : ''}> ${T.washesOnly}</label>
      <input type="search" id="fQ" class="grow" placeholder="${T.searchPlate}" aria-label="${T.searchPlate}" value="${esc(f.q)}">
      <button class="btn" id="csvBtn" type="button">${T.exportCsv}</button>
    </div>
    <p class="count" id="vCount"></p>
    <div class="tw" id="vTable"></div>
    <button class="btn more" id="vMore" type="button" hidden>${T.showMore}</button>`;
  const upd = () => { state.v.limit = PAGE_SIZE; fillVisits(); };
  $('#fFeed').onchange = e => { f.feed = e.target.value; upd(); };
  $('#fSource').onchange = e => { f.source = e.target.value; upd(); };
  $('#fZone').onchange = e => { f.zone = e.target.value; upd(); };
  $('#fWash').onchange = e => { f.washOnly = e.target.checked; upd(); };
  $('#fQ').oninput = e => { f.q = e.target.value; upd(); };
  $('#csvBtn').onclick = exportCsv;
  $('#vMore').onclick = () => { f.limit += PAGE_SIZE; fillVisits(); };
  fillVisits();
}

export function fillVisits() {
  const f = state.v, all = sortedVisits(), shown = all.slice(0, f.limit);
  $('#vCount').textContent = T.matchCount(all.length, shown.length);
  $('#vMore').hidden = all.length <= shown.length;
  const cols = ['date', 'feed', 'bike', 'plate', 'color', 'in', 'out', 'dur', 'zone', 'type', 'status'];
  const head = cols.map(k => {
    const on = f.sort === k;
    return `<th ${on ? `aria-sort="${f.dir === 'asc' ? 'ascending' : 'descending'}"` : ''}><button type="button" data-s="${k}">${esc(T.cols[k])}${on ? (f.dir === 'asc' ? ' &#9650;' : ' &#9660;') : ''}</button></th>`;
  }).join('') + `<th aria-label="${T.warning}"></th>`;
  const rows = shown.map(b => {
    const key = b.date + '|' + b.id, open = f.open.has(key);
    const r = `<tr class="row" tabindex="0" data-k="${esc(key)}" aria-expanded="${open}">
      <td>${esc(b.date)}</td><td title="${esc(b.sessionId || '')}">${esc(b.feed.label)}</td>
      <td class="num">#${esc(b.trackId ?? '?')}${b.visits.length > 1 ? ` <span class="pill off" title="${plural(b.visits.length, 'visit')}">x${b.visits.length}</span>` : ''}</td>
      <td>${esc(b.plate || '-')}</td><td>${esc(b.color || '-')}</td><td class="num">${fmtHMS(b.firstIn)}</td><td class="num">${b.lastOut != null && !b.present ? fmtHMS(b.lastOut) : (b.lastOut != null ? fmtHMS(b.lastOut) : '-')}</td>
      <td class="num">${b.hasCompleted ? fmtDur(b.stay) : '-'}</td><td>${esc(b.zones.join(', ') || '-')}</td>
      <td><span class="pill ${b.wash ? 'wash' : 'off'}">${b.wash ? T.wash : T.offMats}</span></td>
      <td>${isStale(b) ? `<span class="pill warn">${T.possiblyStale}</span>` : esc(statusLabel(b))}</td>
      <td>${b.reason ? `<span class="warnicon" title="${esc(T.closedTip(reasonText(b.reason)))}" aria-label="${esc(T.closedLabel(reasonText(b.reason)))}">&#9888;</span>` : ''}</td></tr>`;
    if (!open) return r;
    const vr = b.visits.map(v => `<tr><td class="num">${fmtHMS(v.inWall)}</td><td class="num">${fmtHMS(v.outWall)}</td><td class="num">${v.hasOut ? fmtDur(v.duration) : T.stillPresent}</td><td>${esc(v.zone || '-')}</td><td>${v.wash ? T.wash : T.offMats}</td></tr>`).join('');
    return r + `<tr class="detail"><td colspan="12"><div class="tw" style="max-width:520px"><table class="num"><thead><tr><th>${T.cols.in}</th><th>${T.cols.out}</th><th>${T.duration}</th><th>${T.cols.zone}</th><th>${T.cols.type}</th></tr></thead><tbody>${vr}</tbody></table></div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px">${esc(T.detailNote(b.sessionId, b.id, b.legacy))}</div></td></tr>`;
  }).join('');
  $('#vTable').innerHTML = shown.length
    ? `<table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table>`
    : emptyBox(T.noMatches, T.noMatchesText);
  $('#vTable').onclick = e => {
    const s = e.target.closest('[data-s]');
    if (s) { const k = s.dataset.s; if (f.sort === k) f.dir = f.dir === 'asc' ? 'desc' : 'asc'; else { f.sort = k; f.dir = (k === 'date' || k === 'in' || k === 'out' || k === 'dur') ? 'desc' : 'asc'; } fillVisits(); return; }
    const tr = e.target.closest('tr.row');
    if (tr) { const k = tr.dataset.k; f.open.has(k) ? f.open.delete(k) : f.open.add(k); fillVisits(); }
  };
  $('#vTable').onkeydown = e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr.row')) { e.preventDefault(); e.target.click(); } };
}

export function exportCsv() {
  const cell = v => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const head = ['date', 'feed', 'source', 'session_id', 'track_id', 'plate', 'color', 'first_in', 'last_out', 'stay_seconds', 'zones', 'type', 'status', 'flag_reason', 'visits'];
  const lines = [head.join(',')];
  sortedVisits().forEach(b => lines.push([keyIso(b.date), b.feed.label, b.source, b.sessionId, b.trackId, b.plate, b.color,
    b.firstIn != null ? wallStr(b.firstIn) : '', b.lastOut != null ? wallStr(b.lastOut) : '', b.hasCompleted ? Math.round(b.stay) : '',
    b.zones.join(' '), b.wash ? T.csvWash : T.csvOff, statusLabel(b), b.reason || '', b.visits.length].map(cell).join(',')));
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `visits_${keyIso(state.keys[0])}_${keyIso(state.keys[state.keys.length - 1])}.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
