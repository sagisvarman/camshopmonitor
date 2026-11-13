/* Demo data: same shapes as Firestore, generated deterministically. */
import { ALLOWED_SOURCES } from './config.js';
import { esc, fmtHMS, keyParts, pad, todayDate } from './util.js';

/* ------------------------------------------------------------------ */
/* Demo data: same shapes as Firestore, generated deterministically     */
/* ------------------------------------------------------------------ */
export function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function hashStr(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export const DEMO_FEEDS = [
  { source: 'overlay', name: null, zones: ['1', '2'], mult: 1 },
  { source: 'overlay', name: 'shopfront', zones: ['1', '2', '3'], mult: 0.8 },
  { source: 'emulator', name: 'phone1', zones: ['1', '2'], mult: 0.5 },
  { source: 'emulator', name: 'bikeB', zones: ['1'], mult: 0.4 }
];
export const localStr = e => { const d = new Date(e * 1000); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; };
export const r1 = x => Math.round(x * 10) / 10;

export function buildBikeDoc(feed, sid, track, visits, reason) {
  const last = visits[visits.length - 1], done = last.outE != null;
  const vmap = {};
  visits.forEach(v => {
    const o = { in_time: r1(v.inE), in_time_str: localStr(v.inE), zone: v.zone, on_mat: v.onMat };
    if (v.outE != null) { o.out_time = r1(v.outE); o.out_time_str = localStr(v.outE); o.duration_seconds = r1(v.outE - v.inE); }
    if (v.plate) o.plate_text = v.plate;
    vmap[String(Math.floor(v.inE))] = o;
  });
  const ts = done ? last.outE : last.inE;
  const doc = {
    source: feed.source, session_id: sid, track_id: track,
    kind: done ? 'out' : 'in', status: done ? 'departed' : 'present',
    timestamp: r1(ts), time_str: localStr(ts), visit_start_time: r1(last.inE),
    zone: last.zone, zones_visited: [...new Set(visits.map(v => v.zone).filter(Boolean))],
    on_mat: last.onMat, plate_text: last.plate || null,
    duration_seconds: done ? r1(last.outE - last.inE) : null,
    detected_at: r1(ts + 3.9), visits: vmap
  };
  if (reason) doc.reason = reason;
  return doc;
}

export function demoDay(key) {
  const { d, m, y } = keyParts(key);
  const today = todayDate(), dayDate = new Date(y, m - 1, d);
  const ageDays = Math.round((today - dayDate) / 864e5);
  if (ageDays < 0) return { vehicles: [], zones: [] };
  const rng = mulberry32(hashStr(key)), isToday = ageDays === 0, nowE = Date.now() / 1000;
  const dayStart = dayDate.getTime() / 1000;
  const wk = [0, 6].includes(dayDate.getDay()) ? 1.4 : 1;
  const legacyDay = ageDays >= 20 && hashStr(key) % 3 === 0;
  const pick = a => a[Math.floor(rng() * a.length)];
  const gauss = (mu, sd) => { let u = 0; for (let k = 0; k < 6; k++) u += rng(); return mu + (u - 3) * sd * 1.41; };
  const vehicles = [], zoneMap = new Map();

  DEMO_FEEDS.forEach(feed => {
    const sid = `${y}-${pad(m)}-${pad(d)}_${pad(7 + Math.floor(rng() * 2))}-${pad(Math.floor(rng() * 60))}-${pad(Math.floor(rng() * 60))}${feed.name ? '_' + feed.name : ''}`;
    const count = Math.max(0, Math.round((5 + rng() * 9) * feed.mult * wk));
    let track = 1;
    for (let i = 0; i < count; i++) {
      track += 1 + Math.floor(rng() * 4);
      const r = rng();
      const hour = Math.min(20.5, Math.max(8, r < 0.45 ? gauss(11, 1.3) : r < 0.8 ? gauss(17, 1.5) : 8 + rng() * 12));
      const inE = dayStart + hour * 3600;
      const onMat = rng() < 0.86;
      const dur = onMat ? 240 + rng() * 480 : 300 + rng() * 2100;
      const plate = rng() < 0.35 ? `W${String.fromCharCode(65 + Math.floor(rng() * 26))}${String.fromCharCode(65 + Math.floor(rng() * 26))} ${1000 + Math.floor(rng() * 8999)}` : null;
      const visits = [{ inE, outE: inE + dur, zone: onMat ? pick(feed.zones) : null, onMat, plate }];
      if (rng() < 0.12) {
        const in2 = inE + dur + 1200 + rng() * 3600;
        visits.push({ inE: in2, outE: in2 + 200 + rng() * 400, zone: pick(feed.zones), onMat: true, plate });
      }
      let reason = null;
      if (!isToday && rng() < 0.05) {
        reason = pick(['detector_stopped', 'recovered']);
        const l = visits[visits.length - 1]; l.outE = l.inE + 30 + rng() * 90;
      }
      if (isToday) {
        if (visits[0].inE > nowE - 60) continue;
        const kept = [];
        for (const v of visits) {
          if (v.inE > nowE - 60) break;
          if (v.outE > nowE) { v.outE = null; kept.push(v); break; }
          kept.push(v);
        }
        visits.length = 0; visits.push(...kept);
      }
      let doc = buildBikeDoc(feed, sid, track, visits, reason);
      if (legacyDay) {
        doc = { source: doc.source, session_id: sid, track_id: track, kind: doc.kind, status: doc.status,
          timestamp: doc.timestamp, time_str: doc.time_str, zone: doc.zone, duration_seconds: doc.duration_seconds };
      }
      vehicles.push({ id: `${sid}_${track}`, data: doc });
      visits.forEach(v => {
        if (!v.zone || !v.onMat) return;
        const zid = `${sid}_${v.zone}`;
        if (!zoneMap.has(zid)) zoneMap.set(zid, { zone: v.zone, session_id: sid, source: feed.source, status: 'empty', occupancies: {}, time_str: localStr(v.inE), kind: 'zone_empty' });
        const z = zoneMap.get(zid), o = { occupant_track_id: track, since: r1(v.inE), since_str: localStr(v.inE) };
        if (v.outE != null) { o.until = r1(v.outE); o.until_str = localStr(v.outE); o.duration_seconds = r1(v.outE - v.inE); }
        else { z.status = 'occupied'; z.kind = 'zone_occupied'; }
        z.occupancies[String(Math.floor(v.inE))] = o;
      });
    }
  });

  if (isToday) { /* one bike that never got closed: should show as possibly stale */
    const inE = dayStart + 5 * 60 + 12, sid = `${y}-${pad(m)}-${pad(d)}_00-01-02`;
    vehicles.push({ id: `${sid}_99`, data: buildBikeDoc(DEMO_FEEDS[0], sid, 99, [{ inE, outE: null, zone: '2', onMat: true, plate: 'BQA 4410' }], null) });
  }
  /* records the page must ignore (filtered like where('source','in',...)) */
  vehicles.push({ id: 'ignored_1', data: { source: 'demo', session_id: `${y}-${pad(m)}-${pad(d)}_09-00-00`, track_id: 1, kind: 'out', status: 'departed', timestamp: dayStart + 36000, time_str: localStr(dayStart + 36000), zone: '1', duration_seconds: 300 } });
  vehicles.push({ id: 'ignored_2', data: { source: 'camera', session_id: `${y}-${pad(m)}-${pad(d)}_09-00-00`, track_id: 2, kind: 'out', status: 'departed', timestamp: dayStart + 36100, time_str: localStr(dayStart + 36100), zone: '2', duration_seconds: 200 } });
  const zones = [...zoneMap.entries()].map(([id, data]) => ({ id, data }));
  const ok = x => ALLOWED_SOURCES.includes(x.data.source);
  return { vehicles: vehicles.filter(ok), zones: zones.filter(ok) };
}

/* A stand-in photo for the Review tab: the two mats, and a bike on its zone
   in its colour, with its box. */
const DEMO_PAINT = { black: '#222', red: '#c62828', white: '#eeeeee', blue: '#1565c0', grey: '#888', silver: '#bbb',
  green: '#2e7d32', yellow: '#f9a825', pink: '#e88ca8' };
export function demoPhoto(b) {
  const x = { 2: 425, 3: 560 }[b.zone] || 215;
  const paint = DEMO_PAINT[String(b.color || '').split(' + ')[0]] || ['#222', '#c62828', '#1565c0', '#888'][hashStr(b.id) % 4];
  const label = esc(`#${b.trackId}  ${b.firstIn != null ? fmtHMS(b.firstIn) : ''}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="#d8d3ca"/><rect width="640" height="110" fill="#f2f2f2"/>
    <rect x="120" y="225" width="195" height="135" fill="#2b2b2b"/><rect x="325" y="225" width="205" height="135" fill="#2b2b2b"/>
    <g transform="translate(${x - 40},140)"><rect x="18" y="0" width="44" height="150" rx="20" fill="${paint}" stroke="#111" stroke-width="3"/>
      <rect x="0" y="38" width="80" height="10" rx="5" fill="#333"/><circle cx="40" cy="168" r="20" fill="#111"/></g>
    <rect x="${x - 62}" y="128" width="124" height="222" fill="none" stroke="#e53935" stroke-width="3"/>
    <text x="16" y="34" font-family="Arial, sans-serif" font-size="22" fill="#333">${label}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
