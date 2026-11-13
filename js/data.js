/* Reading Firestore (or demo data) and normalising its documents. */
import { ALLOWED_SOURCES, DEMO } from './config.js';
import { demoDay } from './demo.js';
import { db, FS } from './firebase.js';
import { SHOP_ID, store } from './shop.js';
import { keyMs, num, sum, wallMs, wallStr } from './util.js';

/* ------------------------------------------------------------------ */
/* Normalising Firestore documents                                     */
/* ------------------------------------------------------------------ */
export const SESSION_RE = /^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})(?:_([A-Za-z0-9-]+))?$/;
export function parseFeed(source, sessionId) {
  const m = SESSION_RE.exec(sessionId || '');
  const name = m ? (m[2] || 'default') : 'unknown';
  return { source: source || 'unknown', name, label: `${source || 'unknown'} / ${name}` };
}
export const hasZone = z => z !== null && z !== undefined && String(z) !== '';

export function normVisit(v, k, d, topOnMat) {
  const inEpoch = num(v.in_time) ?? (isFinite(+k) ? +k : null);
  const outEpoch = num(v.out_time);
  let inWall = wallMs(v.in_time_str), outWall = wallMs(v.out_time_str);
  const dur = num(v.duration_seconds);
  if (inWall == null && outWall != null) {
    if (dur != null) inWall = outWall - dur * 1000;
    else if (inEpoch != null && outEpoch != null) inWall = outWall - (outEpoch - inEpoch) * 1000;
  }
  if (outWall == null && inWall != null && outEpoch != null && inEpoch != null) outWall = inWall + (outEpoch - inEpoch) * 1000;
  const hasOut = outEpoch != null || outWall != null || dur != null;
  let duration = null;
  if (hasOut) duration = dur ?? ((inWall != null && outWall != null) ? (outWall - inWall) / 1000 : null);
  const zone = hasZone(v.zone) ? String(v.zone) : (hasZone(d.zone) ? String(d.zone) : null);
  let wash;
  if (typeof v.on_mat === 'boolean') wash = v.on_mat;
  else if (topOnMat !== null) wash = topOnMat;
  else wash = hasZone(v.zone ?? d.zone);
  return { inEpoch, outEpoch, inWall, outWall, hasOut, duration, zone, wash, plate: v.plate_text || null, color: v.bike_color || null };
}

export function normalizeBike(d, dateKey, docId) {
  const feed = parseFeed(d.source, d.session_id);
  const topOnMat = typeof d.on_mat === 'boolean' ? d.on_mat : null;
  const kindOut = d.kind === 'out' || d.status === 'departed';
  const topTs = num(d.timestamp), topWall = wallMs(d.time_str);
  let visits = [], legacy = false;

  if (d.visits && typeof d.visits === 'object' && Object.keys(d.visits).length) {
    visits = Object.entries(d.visits).sort((a, b) => (+a[0]) - (+b[0]))
      .map(([k, v]) => normVisit(v || {}, k, d, topOnMat));
  } else {
    /* Older document without a visits map: rebuild one visit from the top-level fields. */
    legacy = true;
    const dur = num(d.duration_seconds);
    const start = num(d.visit_start_time);
    const v = {};
    if (kindOut) {
      v.out_time = topTs; v.out_time_str = d.time_str; v.duration_seconds = dur;
      if (start != null) v.in_time = start;
      else if (dur != null && topTs != null) v.in_time = topTs - dur;
      if (topWall != null && dur != null) v.in_time_str = wallStr(topWall - dur * 1000);
      else if (topWall != null && start != null && topTs != null) v.in_time_str = wallStr(topWall - (topTs - start) * 1000);
    } else {
      v.in_time = start ?? topTs; v.in_time_str = d.time_str;
    }
    v.zone = d.zone; v.plate_text = d.plate_text;
    visits = [normVisit(v, String(Math.floor(v.in_time ?? 0)), d, topOnMat)];
  }

  const done = visits.filter(v => v.hasOut && v.duration != null);
  const ins = visits.map(v => v.inWall).filter(x => x != null);
  const outs = visits.map(v => v.outWall).filter(x => x != null);
  const zones = [];
  visits.forEach(v => { if (v.zone && !zones.includes(v.zone)) zones.push(v.zone); });
  (Array.isArray(d.zones_visited) ? d.zones_visited : []).forEach(z => { z = String(z); if (!zones.includes(z)) zones.push(z); });
  const lastZoned = [...visits].reverse().find(v => v.zone);
  const status = d.status || (d.kind === 'out' ? 'departed' : 'present');

  return {
    id: docId, date: dateKey, dayMs: keyMs(dateKey),
    sessionId: d.session_id || null, trackId: d.track_id ?? null,
    feed, source: d.source || 'unknown',
    plate: d.plate_text || (visits.find(v => v.plate) || {}).plate || null,
    color: d.bike_color || (visits.find(v => v.color) || {}).color || null,
    visits, legacy, reason: d.reason || null, status, present: status === 'present',
    zone: lastZoned ? lastZoned.zone : (zones[0] || null), zones,
    wash: visits.some(v => v.wash),
    firstIn: ins.length ? Math.min(...ins) : null,
    lastOut: outs.length ? Math.max(...outs) : null,
    stay: sum(done.map(v => v.duration)), hasCompleted: done.length > 0
  };
}

export function normalizeZoneDoc(d, dateKey, docId) {
  const feed = parseFeed(d.source, d.session_id);
  const occ = Object.entries(d.occupancies || {}).map(([k, o]) => {
    o = o || {};
    const since = num(o.since) ?? (isFinite(+k) ? +k : null), until = num(o.until);
    const dur = num(o.duration_seconds) ?? ((since != null && until != null) ? until - since : null);
    return { trackId: o.occupant_track_id ?? null, since, until, open: until == null && dur == null, dur };
  });
  return { id: docId, date: dateKey, zone: hasZone(d.zone) ? String(d.zone) : '?', sessionId: d.session_id || null, feed, status: d.status || null, occ };
}

/* ------------------------------------------------------------------ */
/* Loading data (Firestore, or generated demo data)                    */
/* ------------------------------------------------------------------ */
export const cache = new Map(); /* dateKey -> { bikes, zones, nDocs }, for SHOP_ID */


export async function listDevices(shop) {
  const { collection, getDocs } = FS;
  const snap = await getDocs(collection(db, 'track_visits', shop, 'devices'));
  return snap.docs.map(x => x.id);
}

export async function fetchDay(key, shop, names) {
  if (DEMO) return demoDay(key);
  const { collection, getDocs, query, where } = FS;
  const read = (device, sub) => getDocs(query(collection(db, 'track_visits', shop, 'devices', device, 'days', key, sub),
    where('source', 'in', ALLOWED_SOURCES)));
  const [a, b] = await Promise.all(['vehicles', 'zones'].map(sub => Promise.all(names.map(device => read(device, sub)))));
  const rows = snaps => snaps.flatMap(s => s.docs.map(x => ({ id: x.id, data: x.data() })));
  return { vehicles: rows(a), zones: rows(b) };
}

/* A load still running when the owner picks another shop is dropped, so the
   old shop's days never land in the new shop's cache. */
export async function loadDays(keys, force = false) {
  const shop = SHOP_ID;
  let names = store.devices;
  if (!DEMO && (force || !names)) {
    names = await listDevices(shop);
    if (shop === SHOP_ID) store.devices = names;
  }
  const todo = keys.filter(k => force || !cache.has(k));
  const results = await Promise.all(todo.map(async k => [k, await fetchDay(k, shop, names)]));
  let docs = 0;
  for (const [k, r] of shop === SHOP_ID ? results : []) {
    const nDocs = r.vehicles.length + r.zones.length;
    docs += nDocs;
    cache.set(k, {
      bikes: r.vehicles.map(v => normalizeBike(v.data, k, v.id)),
      zones: r.zones.map(z => normalizeZoneDoc(z.data, k, z.id)),
      nDocs
    });
  }
  return { days: keys.length, read: todo.length, cached: keys.length - todo.length, docs };
}
