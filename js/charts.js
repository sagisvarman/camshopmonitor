/* Chart.js helpers. */
import { T } from './i18n.js';
import { esc } from './util.js';

export let charts = [];

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */
export const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
export function destroyCharts() { charts.forEach(c => c.destroy()); charts = []; }
export function mkChart(id, cfg) {
  const el = document.getElementById(id);
  if (!el) return;
  if (!window.Chart) { el.parentElement.innerHTML = `<div class="empty">${esc(T.noChartLib)}</div>`; return; }
  const ink = cssVar('--muted'), line = cssVar('--line');
  Chart.defaults.color = ink; Chart.defaults.font.family = cssVar('--body');
  cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false }, cfg.options || {});
  cfg.options.scales = cfg.options.scales || {};
  Object.values(cfg.options.scales).forEach(s => { s.grid = Object.assign({ color: line }, s.grid || {}); });
  charts.push(new Chart(el, cfg));
}
export const yInt = { beginAtZero: true, ticks: { precision: 0 } };
