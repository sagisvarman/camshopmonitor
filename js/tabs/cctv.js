/* CCTV tab. */
import { DEMO } from '../config.js';
import { db, FS } from '../firebase.js';
import { T } from '../i18n.js';
import { emptyBox, handleLoadError } from '../render.js';
import { SHOP_ID } from '../shop.js';
import { setStatus, state } from '../state.js';
import { $, esc, fmtDur } from '../util.js';

/* ---- 9. CCTV ---- */
/* Each emulator's plain camera picture, at track_visits/{SHOP_ID}/cctv/{device}.
   The counting computer only sends them while someone is watching: this tab
   writes the time to cctv_watch/latest every CCTV_BEAT_SECONDS while it's open
   and visible (see cctv_feed.py), and stops by itself after CCTV_WATCH_MINUTES
   so a forgotten tab can't use up Firestore's free daily writes. */
export const CCTV_FRAME_SECONDS = 5;     /* cctv_feed.FRAME_SECONDS */
export const CCTV_BEAT_SECONDS = 20;
export const CCTV_BEAT_GAP_SECONDS = 45; /* cctv_feed.WATCHED_FOR_SECONDS */
export const CCTV_LIVE_SECONDS = 20;     /* an older picture isn't called live */
export const CCTV_WAKE_SECONDS = 30;     /* how long the first new picture may take */
export const CCTV_WATCH_MINUTES = 10;
export const cctv = { unsub: null, timer: null, frames: {}, startedAt: 0, beatAt: 0, wakeAt: 0, paused: false };

export function stopCctv() {
  if (cctv.unsub) { cctv.unsub(); cctv.unsub = null; }
  clearInterval(cctv.timer); cctv.timer = null;
}

export function rCctv() {
  setStatus('');
  if (DEMO) { $('#panel').innerHTML = emptyBox(T.cctvDemo, T.cctvDemoText); return; }
  const { collection, onSnapshot } = FS;
  Object.assign(cctv, { frames: {}, startedAt: Date.now(), beatAt: 0, paused: false });
  $('#panel').innerHTML = `<p class="sub">${esc(T.cctvSub(CCTV_FRAME_SECONDS))}</p>
    <div id="cctvNote"></div><div id="cctvGrid" class="cam-grid"></div>`;
  $('#cctvGrid').onclick = e => { const img = e.target.closest('img'); if (img && img.requestFullscreen) img.requestFullscreen().catch(() => {}); };
  cctv.unsub = onSnapshot(collection(db, 'track_visits', SHOP_ID, 'cctv'), snap => {
    snap.docs.forEach(d => {
      const x = d.data(), at = x.at && x.at.toMillis();
      if (!x.jpeg || !at || (cctv.frames[d.id] || {}).at === at) return;
      cctv.frames[d.id] = { at, time: (x.time_str || '').slice(11, 19), src: 'data:image/jpeg;base64,' + x.jpeg.toBase64() };
    });
    drawCctv();
  }, e => { stopCctv(); handleLoadError(e); });
  cctv.timer = setInterval(cctvTick, 5000);
  cctvTick();
}

/* Says "watching" when it's due, and keeps the pictures' live/old labels current. */
export function cctvTick() {
  if (!$('#cctvGrid')) { stopCctv(); return; } /* something else replaced the panel */
  const now = Date.now();
  if (!cctv.paused && now - cctv.startedAt > CCTV_WATCH_MINUTES * 60e3) cctv.paused = true;
  if (!cctv.paused && !document.hidden && now - cctv.beatAt >= CCTV_BEAT_SECONDS * 1000) {
    /* After a gap the counting computer has stopped sending: give it time to start again. */
    if (now - cctv.beatAt > CCTV_BEAT_GAP_SECONDS * 1000) cctv.wakeAt = now;
    cctv.beatAt = now;
    const { doc, setDoc, serverTimestamp } = FS;
    setDoc(doc(db, 'track_visits', SHOP_ID, 'cctv_watch', 'latest'), { at: serverTimestamp() })
      .catch(e => { console.error(e); if (state.tab === 'cctv') setStatus(T.cctvNoWrite, 'err'); });
  }
  drawCctv();
}

export function drawCctv() {
  const grid = $('#cctvGrid'), note = $('#cctvNote');
  if (!grid) return;
  if (cctv.paused && !$('#cctvResume')) {
    note.innerHTML = `<p class="note">${esc(T.cctvPaused(CCTV_WATCH_MINUTES))} <button class="btn" id="cctvResume" type="button">${esc(T.cctvResume)}</button></p>`;
    $('#cctvResume').onclick = () => { note.innerHTML = ''; Object.assign(cctv, { startedAt: Date.now(), paused: false }); cctvTick(); };
  }
  const names = Object.keys(cctv.frames).sort();
  if (!names.length) { grid.dataset.names = ''; grid.innerHTML = emptyBox(T.cctvNone, T.cctvNoneText); return; }
  if (grid.dataset.names !== names.join('/')) {
    grid.dataset.names = names.join('/');
    grid.innerHTML = names.map(n => `<figure class="cam"><img alt="${esc(T.cctvAlt(n))}"><figcaption><i class="dot"></i><b>${esc(n)}</b><span></span></figcaption></figure>`).join('');
  }
  const now = Date.now(), waking = now - cctv.wakeAt < CCTV_WAKE_SECONDS * 1000;
  names.forEach((n, i) => {
    const f = cctv.frames[n], fig = grid.children[i], img = fig.querySelector('img');
    const age = (now - f.at) / 1000, live = !cctv.paused && age < CCTV_LIVE_SECONDS;
    if (img.dataset.at !== String(f.at)) { img.src = f.src; img.dataset.at = f.at; }
    fig.classList.toggle('stale', !live);
    fig.querySelector('span').textContent = live ? T.cctvLive(f.time) : cctv.paused ? T.cctvAt(f.time)
      : waking ? T.cctvWaking : T.cctvStale(f.time, fmtDur(age));
  });
}
