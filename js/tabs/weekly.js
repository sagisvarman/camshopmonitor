/* Report tab: the printable sheet, its PDF and printing. */
import { CURRENCY, DEMO, MAX_DAYS } from '../config.js';
import { cache, loadDays } from '../data.js';
import { dataSrc, LANG, plural, T } from '../i18n.js';
import { emptyBox, handleLoadError } from '../render.js';
import { SHOP_ID, SHOP_NAME } from '../shop.js';
import { PRICE_KEY, setStatus, state } from '../state.js';
import { stayBuckets } from './durations.js';
import { dayRows } from './summary.js';
import { $, addDays, avg, dateToIso, esc, fmtDateShort, fmtDur, fmtHM, isoToDate, keyLabel, keyParts, keysBetween, median, pad, shopNow, todayDate } from '../util.js';

/* ---- 10. Weekly report (printable) ---- */
/* Any From/To date range (max MAX_DAYS), independent of the range picker; the
   same number of days just before it is loaded too, for the comparison.
   Printing hides everything but .sheet. */
export const mondayOf = d => addDays(d, -((d.getDay() + 6) % 7));
export const fmtDM = d => `${d.getDate()} ${T.months[d.getMonth()]}`;
export const fmtWD = d => `${T.weekdays[d.getDay()]} ${fmtDM(d)}`;
export const rangeText = (a, b) => a.getFullYear() === b.getFullYear()
  ? `${fmtWD(a)} ${T.to} ${fmtWD(b)} ${b.getFullYear()}`
  : `${fmtWD(a)} ${a.getFullYear()} ${T.to} ${fmtWD(b)} ${b.getFullYear()}`;
export const lastWeekRange = () => { const m = mondayOf(todayDate()); return [addDays(m, -7), addDays(m, -1)]; };
export const thisWeekRange = () => [mondayOf(todayDate()), todayDate()];
export function wkCheck(a, b) {
  if (!a || !b) return T.needDatesReport;
  const x = isoToDate(a), y = isoToDate(b);
  if (x > y) return T.startAfterEnd;
  const days = Math.round((y - x) / 864e5) + 1;
  return days > MAX_DAYS ? T.tooManyDays(MAX_DAYS, days) : '';
}
export const bikesIn = keys => keys.flatMap(k => (cache.get(k) || {}).bikes || []);
export const washWord = n => plural(n, 'wash');
export const fmtMoney = v => `${CURRENCY} ${v.toLocaleString(T.locale, { maximumFractionDigits: 2 })}`;

export async function rWeekly() {
  if (!state.wk.from) { const [x, y] = lastWeekRange(); state.wk.from = dateToIso(x); state.wk.to = dateToIso(y); }
  const fromIso = state.wk.from, toIso = state.wk.to, from = isoToDate(fromIso), to = isoToDate(toIso), shop = SHOP_ID;
  const n = Math.round((to - from) / 864e5) + 1;
  const keys = keysBetween(from, to), prevKeys = keysBetween(addDays(from, -n), addDays(from, -1));
  $('#panel').innerHTML = `
    <div class="wk-bar no-print">
      <label>${T.fromDate} <input type="date" id="wkFrom" value="${fromIso}"></label>
      <label>${T.toDate} <input type="date" id="wkTo" value="${toIso}"></label>
      <button class="btn primary" id="wkGo" type="button">${T.generate}</button>
      <button class="btn" id="wkLast" type="button">${T.lastWeekBtn}</button>
      <button class="btn" id="wkThis" type="button">${T.thisWeekBtn}</button>
    </div>
    <div class="wk-bar no-print">
      <label>${T.pricePerWash} (${esc(CURRENCY)}) <input type="number" id="wkPrice" min="0" step="any" inputmode="decimal" style="width:130px" value="${esc(state.col.price)}"></label>
      <button class="btn primary" id="wkPdf" type="button" disabled>${T.downloadPdf}</button>
      <button class="btn" id="wkPrint" type="button" disabled>${T.print}</button>
    </div>
    <div id="wkBody">${emptyBox(T.loading, T.fetchingWeek(rangeText(from, to)))}</div>`;
  let loaded = false;
  const apply = (x, y) => {
    const err = wkCheck(x, y);
    if (err) { setStatus(err, 'warn'); return; }
    state.wk.from = x; state.wk.to = y; rWeekly();
  };
  $('#wkGo').onclick = () => apply($('#wkFrom').value, $('#wkTo').value);
  $('#wkLast').onclick = () => { const [x, y] = lastWeekRange(); apply(dateToIso(x), dateToIso(y)); };
  $('#wkThis').onclick = () => { const [x, y] = thisWeekRange(); apply(dateToIso(x), dateToIso(y)); };
  $('#wkPrice').oninput = e => {
    state.col.price = e.target.value;
    try { localStorage.setItem(PRICE_KEY, state.col.price); } catch (err) { /* storage blocked */ }
    if (loaded) fillWeekly(keys, prevKeys);
  };
  $('#wkPdf').onclick = downloadWeeklyPdf;
  $('#wkPrint').onclick = printWeekly;
  try {
    const st = await loadDays([...prevKeys, ...keys]);
    if (state.tab !== 'weekly' || state.wk.from !== fromIso || state.wk.to !== toIso || shop !== SHOP_ID) return;
    setStatus(T.weeklyStatus(st, dataSrc()));
  } catch (e) {
    if (state.tab === 'weekly') handleLoadError(e);
    return;
  }
  loaded = true;
  fillWeekly(keys, prevKeys);
}

export function fillWeekly(keys, prevKeys) {
  const from = isoToDate(state.wk.from), to = isoToDate(state.wk.to);
  const bikes = bikesIn(keys), prev = bikesIn(prevKeys), rows = dayRows(keys);
  const price = parseFloat(state.col.price), priced = isFinite(price) && price >= 0;
  const [y, mo, d, h, mi] = shopNow();
  const generated = `${fmtDateShort(new Date(y, mo, d))}, ${pad(h)}:${pad(mi)}`;
  const head = `<header class="sh-head">
      <div><div class="sh-shop">${esc(SHOP_NAME)}</div><div class="sh-title">${T.weeklyTitle}${DEMO ? ` &middot; <b>${T.sampleNotReal}</b>` : ''}</div></div>
      <div class="sh-meta"><b>${esc(rangeText(from, to))}</b>${T.generated} ${esc(generated)}</div>
    </header>`;
  const foot = `<p class="sh-foot">${T.weeklyFoot}</p>`;
  $('#wkPdf').disabled = false;
  $('#wkPrint').disabled = false;
  if (!bikes.length) {
    $('#wkBody').innerHTML = `<article class="sheet">${head}<p class="sh-empty">${T.weekEmpty}</p>${foot}</article>`;
    return;
  }

  /* One total: bikes on the mats and off them are counted together. */
  const total = bikes.length;
  const washStays = bikes.filter(b => b.hasCompleted).map(b => b.stay);
  let vs = T.noPrevWeek;
  if (prev.length) {
    const d = total - prev.length, sign = d > 0 ? '+' : '';
    vs = d === 0 ? T.samePrevWeek : T.vsPrevWeek(`${sign}${d}`, `${sign}${Math.round(d / prev.length * 100)}`);
  }
  const best = rows.reduce((a, r) => (r.n > (a ? a.n : 0) ? r : a), null);

  const byHour = Array(24).fill(0);
  bikes.forEach(b => { if (b.firstIn != null) byHour[new Date(b.firstIn).getUTCHours()]++; });
  const act = byHour.map((c, h) => (c ? h : -1)).filter(h => h >= 0);
  const peak = act.length ? byHour.indexOf(Math.max(...byHour)) : null;
  const hours = act.length ? Array.from({ length: act[act.length - 1] - act[0] + 1 }, (_, i) => act[0] + i) : [];

  const maxDay = Math.max(1, ...rows.map(r => r.n)), maxHour = Math.max(1, ...byHour);
  /* Few days: full labels and values. More days: day numbers, then only some labels, then no values. */
  const nd = rows.length;
  const dayBars = rows.map((r, i) => {
    const dn = String(keyParts(r.key).d);
    const lbl = nd <= 10 ? keyLabel(r.key).split(' ').slice(0, 2).join(' ') : nd <= 16 ? dn : (i % 5 === 0 ? dn : '');
    return `<div class="vbar"><div class="plot"><div class="v">${nd <= 16 ? r.n : ''}</div>
      <div class="w" style="height:${r.n / maxDay * 100}%"></div></div>
      <div class="lbl"${nd > 16 ? ' style="overflow:visible;margin:4px -14px 0"' : ''}>${lbl ? esc(lbl) : '&nbsp;'}</div></div>`;
  }).join('');
  const hourBars = hours.map(h => `<div class="vbar"><div class="plot"><div class="v">${byHour[h] || ''}</div>
      <div class="w" style="height:${byHour[h] / maxHour * 100}%"></div></div><div class="lbl">${pad(h)}</div></div>`).join('');

  const buckets = stayBuckets().map(([label, a, z]) => [label, washStays.filter(s => s >= a && s < z).length]);
  const maxBucket = Math.max(1, ...buckets.map(b => b[1]));

  const flagged = bikes.filter(b => b.reason).length, noOut = bikes.filter(b => b.present).length;
  const notes = [];
  if (flagged) notes.push(T.weekFlagged(flagged));
  if (noOut) notes.push(T.weekNoOut(noOut));

  $('#wkBody').innerHTML = `${priced ? '' : `<p class="note no-print">${T.setPrice}</p>`}<article class="sheet">${head}
    <section class="sh-kpis num">
      <div><b>${total}</b><span>${T.totalWashes}</span><small>${esc(vs)}</small></div>
      <div><b>${fmtDur(median(washStays))}</b><span>${T.typicalWash}</span><small>${T.averageX(fmtDur(avg(washStays)))}</small></div>
      <div><b>${best ? esc(keyLabel(best.key)) : '-'}</b><span>${T.busiestDay}</span><small>${best ? washWord(best.n) : T.noWashes}</small></div>
      <div><b>${peak != null ? `${pad(peak)}:00` : '-'}</b><span>${T.busiestHour}</span><small>${peak != null ? T.inThatHour(byHour[peak]) : T.noArrivals}</small></div>
      <div><b>${T.daysOfN(rows.filter(r => r.n).length, rows.length)}</b><span>${T.daysWithBikes}</span><small>${plural(rows.length, 'day')}</small></div>
    </section>
    ${notes.length ? `<div class="sh-notes">${notes.map(n => `<p>${esc(n)}</p>`).join('')}</div>` : ''}
    <div class="sh-grid">
      <section class="sh-box"><h3>${T.washesPerDay}</h3><div class="vbars" style="gap:${nd > 16 ? 1 : 4}px">${dayBars}</div>
        <div class="sh-legend"><span>${nd <= 16 ? T.dayTotalNote : '&nbsp;'}</span></div></section>
      <section class="sh-box"><h3>${T.arrivalsByHour}</h3><div class="vbars">${hourBars}</div>
        <div class="sh-legend"><span>${T.oncePerDay}</span></div></section>
    </div>
    <section class="sh-box"><h3>${T.dayByDay}</h3><table class="num">
      <thead><tr><th>${T.day}</th><th class="r">${T.bikes}</th><th class="r">${T.avgStayShort}</th><th class="r">${T.median}</th><th class="r">${T.firstIn}</th><th class="r">${T.lastOut}</th>${priced ? `<th class="r">${T.collection}</th>` : ''}</tr></thead>
      <tbody>${rows.map(r => `<tr class="${r.n ? '' : 'dim'}"><td>${esc(keyLabel(r.key))}</td><td class="r">${r.n}</td>
        <td class="r">${fmtDur(r.avg)}</td><td class="r">${fmtDur(r.med)}</td><td class="r">${fmtHM(r.first)}</td><td class="r">${fmtHM(r.last)}</td>${priced ? `<td class="r">${fmtMoney(r.n * price)}</td>` : ''}</tr>`).join('')}
        <tr><td><b>${T.totalRow}</b></td><td class="r"><b>${bikes.length}</b></td><td colspan="4"></td>${priced ? `<td class="r"><b>${fmtMoney(bikes.length * price)}</b></td>` : ''}</tr>
      </tbody></table>${priced ? `<div class="sh-legend"><span>${esc(T.collectionNote(fmtMoney(price)))}</span></div>` : ''}</section>
    <section class="sh-box"><h3>${T.howLongWashes}</h3><div class="hbars num">${buckets.map(([label, c]) =>
      `<span>${esc(label)}</span><div class="bar" style="width:${c / maxBucket * 100}%"></div><b>${c}</b>`).join('')}</div></section>
    ${foot}
  </article>`;
}

export const weeklyFileName = () => `${SHOP_NAME} ${T.weeklyFile} ${state.wk.from} ${T.to} ${state.wk.to}`;
export const compactSheet = () => { const el = $('#wkBody .sheet').cloneNode(true); el.classList.add('compact'); return el; };

/* The PDF is built in the page and downloaded as a file, not saved from the
   print dialog: from the signed-in site, Chrome's print preview stuck on
   "Loading preview" (Firebase Auth's hidden cross-origin iframe), and its
   "Save as PDF" from a separate tab stuck on "Saving". html2pdf.js renders
   the sheet to images, so the PDF's text is not selectable. */
export const PDF_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
export let pdfLibLoad = null;
export function loadPdfLib() {
  if (window.html2pdf) return Promise.resolve();
  pdfLibLoad = pdfLibLoad || new Promise((ok, fail) => {
    const s = document.createElement('script');
    s.src = PDF_LIB;
    s.onload = ok;
    s.onerror = () => { pdfLibLoad = null; s.remove(); fail(new Error(T.pdfLibFailed)); };
    document.head.appendChild(s);
  });
  return pdfLibLoad;
}

export function weeklyPdfWorker() {
  const el = compactSheet();
  el.classList.add('pdf');
  return html2pdf().set({
    margin: 12, filename: `${weeklyFileName()}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css'], avoid: ['tr', '.sh-head', '.sh-kpis', '.sh-notes', '.sh-box', '.sh-foot'] }
  }).from(el);
}

export async function downloadWeeklyPdf() {
  const btn = $('#wkPdf');
  btn.disabled = true; btn.textContent = T.makingPdf;
  try {
    await loadPdfLib();
    await weeklyPdfWorker().save();
    setStatus(T.pdfSaved(`${weeklyFileName()}.pdf`));
  } catch (e) {
    console.error(e);
    setStatus(T.pdfFailed(e && e.message ? e.message : e), 'err');
  } finally {
    btn.disabled = false; btn.textContent = T.downloadPdf;
  }
}

/* Printing on paper: the sheet alone in a new tab, away from the app's
   iframe, printed from that tab's own button. */
export function printWeekly() {
  const w = window.open('', '_blank');
  if (!w) { /* popup blocked: print in place */
    const sheet = $('#wkBody .sheet');
    sheet.classList.add('compact');
    window.addEventListener('afterprint', () => sheet.classList.remove('compact'), { once: true });
    window.print();
    return;
  }
  w.document.open();
  w.document.write(`<!doctype html><html lang="${LANG}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light"><title>${esc(weeklyFileName())}</title><link rel="stylesheet" href="${esc(new URL('css/app.css', location.href).href)}"></head>
    <body class="wk-mode"><div class="wrap"><div class="wk-bar no-print"><button class="btn primary" type="button" onclick="window.print()">${T.print}</button>
    <span>${T.printHint}</span></div>${compactSheet().outerHTML}</div></body></html>`);
  w.document.close();
}
