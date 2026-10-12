import { axisMaximum } from './chart-scale.js';
import { loadContext, clearContext, drawEventTrack } from './context-ui.js';

const $ = id => document.getElementById(id);
const DAY = 86400000;
const svgNS = 'http://www.w3.org/2000/svg';
const dateLabel = date => new Date(date).toLocaleDateString('de-DE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
const number = (value, precision = 1) => value.toLocaleString('de-DE', { maximumFractionDigits: precision, minimumFractionDigits: 1 });
let data, width, height, scale, start, end, ymax;
const active = new Set();
const selections = new Map();
let selectedCountry = 'de', selectedRegion = 'bundestag', loadController;
const countryRegions = new Map([['de', [{ id: 'bundestag', label: 'Bundestagswahl' }]], ['es', [{ id: 'congreso', label: 'Parlamentswahl (Congreso)' }, { id: 'katalonien', label: 'Katalonien' }, { id: 'barcelona', label: 'Barcelona' }]]]);
const lastRegions = new Map(), views = new Map();
const selectionKey = () => `${selectedCountry}:${selectedRegion}`;
const scroll = $('chart-scroll'), chart = $('chart');
let curves = [], markers = [], dots = [], ticks = [], curveLayer;
let scaleTimer, scaleAnimation, targetYmax;

function element(tag, attributes = {}, text) {
  const el = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  return el;
}
function swatch(color) { const el = document.createElement('i'); el.className = 'swatch'; el.style.background = color; return el; }
function toggle(series, approval = false, compact = false) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = approval ? 'approval-toggle' : compact ? 'timeline-toggle' : 'party-toggle';
  button.dataset.series = series.id;
  button.setAttribute('aria-pressed', String(active.has(series.id)));
  button.setAttribute('aria-label', `${series.label} ein- oder ausblenden`);
  if (approval) {
    const handle = document.createElement('span'); handle.className = 'switch'; handle.setAttribute('aria-hidden', 'true');
    button.append(handle, swatch(series.color), document.createTextNode(series.label));
  } else {
    const label = document.createElement('span'); label.className = 'party-label'; label.textContent = series.label;
    const name = document.createElement('span'); name.className = 'party-name'; name.append(swatch(series.color), label);
    button.append(name);
    if (!compact) {
      const value = document.createElement('span'); value.className = 'party-value';
      const last = data.latestPoll?.values[series.id];
      const range = data.latestPoll?.ranges?.[series.id];
      if (range) value.classList.add('interval-value');
      const rawValue = range ? `${range.low.toLocaleString('de-DE')}–${range.high.toLocaleString('de-DE')}` : last.toLocaleString('de-DE', { maximumFractionDigits: 2 });
      value.append(document.createTextNode(rawValue));
      const unit = document.createElement('small'); unit.textContent = '%'; value.append(unit);
      button.append(value);
    }
  }
  button.addEventListener('click', () => {
    const previousDate = start + scroll.scrollLeft / scale * DAY;
    active.has(series.id) ? active.delete(series.id) : active.add(series.id);
    button.setAttribute('aria-pressed', String(active.has(series.id)));
    render(previousDate, false, true);
  });
  return button;
}
const x = date => (new Date(date).getTime() - start) / DAY * scale;
const y = value => 14 + (ymax - value) / ymax * (height - 55);

function render(firstDate = null, latest = false, animate = false) {
  if (!data) return;
  height = window.innerWidth <= 600 ? 302 : 340;
  // One viewport always spans approximately one year, independently of screen size.
  scale = Math.max(1, scroll.clientWidth - 12) / 365.25;
  start = Math.min(new Date(data.points[0].date).getTime(), ...data.approval.filter(s => active.has(s.id)).map(s => new Date(s.points[0].date).getTime()), ...(data.elections || []).map(e => new Date(e.date).getTime()));
  end = Math.max(new Date(data.points.at(-1).date).getTime(), ...data.approval.filter(s => active.has(s.id)).map(s => new Date(s.points.at(-1).date).getTime()), ...(data.elections || []).map(e => new Date(e.date).getTime()));
  width = Math.max(scroll.clientWidth, (end - start) / DAY * scale + 12);
  clearTimeout(scaleTimer); cancelAnimationFrame(scaleAnimation);
  targetYmax = null; ymax ??= 100;
  curves = []; markers = []; dots = []; ticks = [];
  chart.replaceChildren(); chart.setAttribute('width', width); chart.setAttribute('height', height); chart.style.height = `${height}px`;
  const axis = $('y-axis'); axis.replaceChildren(); axis.setAttribute('height', height); axis.style.height = `${height}px`;
  const grid = element('g', { id: 'horizontal-grid' }); chart.append(grid);
  let month = new Date(start); month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
  while (month.getTime() <= end) {
    const pos = x(month);
    chart.append(element('line', { x1: pos, x2: pos, y1: 14, y2: height - 41, stroke: 'var(--month-grid)' }));
    if (scale >= 1.1 || month.getUTCMonth() % 3 === 0) chart.append(element('text', { x: pos + 3, y: height - 17 }, month.toLocaleDateString('de-DE', { month: 'short', timeZone: 'UTC' })));
    if (month.getUTCMonth() === 0) chart.append(element('text', { x: pos + 3, y: height - 3, style: 'fill:var(--year);font-size:10px;font-weight:600' }, month.getUTCFullYear()));
    month.setUTCMonth(month.getUTCMonth() + 1);
  }
  curveLayer = element('g', { id: 'curves' }); chart.append(curveLayer);
  const baseY = value => height - 41 - value / 100 * (height - 55);
  const observationDates = new Set(data.observationDates || []);
  for (const party of data.parties.filter(p => active.has(p.id))) {
    let path = '', connected = false;
    const points = []; curves.push(points);
    for (const point of data.points) {
      const v = point.values[party.id];
      // Connect existing averages across polling pauses, including year changes.
      if (!v) continue;
      points.push({ time: new Date(point.date).getTime(), value: v.value });
      path += `${connected ? 'L' : 'M'}${x(point.date).toFixed(2)},${baseY(v.value).toFixed(2)}`; connected = true;
      if (observationDates.has(point.date)) {
        const dot = element('circle', { cx: x(point.date), cy: y(v.value), r: 2.8, fill: party.color, 'data-observation': point.date, 'data-party': party.id, 'pointer-events': 'none' });
        chart.append(dot); dots.push({ element: dot, value: v.value });
        markers.push({ time: new Date(point.date).getTime(), value: v.value });
      }
    }
    // A subtle outline makes the source's bright yellow FDP line readable.
    if (party.id === 'fdp') curveLayer.append(element('path', { d: path, fill: 'none', stroke: '#b0a545', 'stroke-width': 3.3, opacity: .6, 'vector-effect': 'non-scaling-stroke' }));
    if (['union', 'bsw', 'es-pce', 'cat-alianca', 'cat-comuns', 'cat-valents', 'cat-pdecat', 'bcn-alianca', 'bcn-comu', 'bcn-canvi', 'bcn-pdecat'].includes(party.id)) curveLayer.append(element('path', { d: path, class: 'dark-line-outline', fill: 'none', stroke: '#dce6e1', 'stroke-width': 3.6, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', opacity: .4, 'vector-effect': 'non-scaling-stroke' }));
    const line = element('path', { d: path, fill: 'none', stroke: party.color, 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'data-line': party.id, 'vector-effect': 'non-scaling-stroke', ...(party.kind === 'response-group' ? { 'stroke-dasharray': '6 4' } : {}) });
    line.append(element('title', {}, party.label)); curveLayer.append(line);
  }
  for (const series of data.approval.filter(s => active.has(s.id))) {
    const points = series.points.filter(p => p.value !== null);
    curves.push(points.map(p => ({ time: new Date(p.date).getTime(), value: p.value })));
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(2)},${baseY(p.value).toFixed(2)}`).join('');
    curveLayer.append(element('path', { d: path, fill: 'none', stroke: series.color, 'stroke-width': 1.8, 'stroke-dasharray': '5 4', 'data-line': series.id, 'vector-effect': 'non-scaling-stroke' }));
  }
  for (const election of data.elections || []) {
    for (const party of data.parties.filter(p => active.has(p.id))) {
      const value = election.values[party.id];
      if (value === null || value === undefined) continue;
      const dot = element('circle', { cx: x(election.date), cy: y(value), r: 5.5, fill: party.color, stroke: 'var(--surface)', 'stroke-width': 2, tabindex: 0, 'data-election': election.date, 'data-party': party.id, 'aria-label': `${election.label || 'Bundestagswahl'} ${dateLabel(election.date)}, ${party.label}: ${number(value, 2)} Prozent` });
      dot.append(element('title', {}, election.label || 'Bundestagswahl'));
      dot.addEventListener('focus', () => showElection(election, x(election.date) - scroll.scrollLeft));
      dot.addEventListener('blur', hideTooltip);
      chart.append(dot);
      markers.push({ time: new Date(election.date).getTime(), value }); dots.push({ element: dot, value });
    }
  }
  chart.append(element('line', { id: 'crosshair', y1: 14, y2: height - 41, stroke: 'var(--crosshair)', 'stroke-dasharray': '3 4', visibility: 'hidden', 'pointer-events': 'none' }));
  scroll.scrollLeft = latest ? scroll.scrollWidth : firstDate === null ? 0 : (firstDate - start) / DAY * scale;
  updateScale(animate); updatePeriod(); hideTooltip();
  drawEventTrack();
}

function paintScale(maximum) {
  ymax = maximum;
  const ratio = 100 / maximum, baseline = height - 41;
  // Transform the curves without rebuilding thousands of daily SVG coordinates.
  curveLayer.setAttribute('transform', `matrix(1 0 0 ${ratio} 0 ${baseline * (1 - ratio)})`);
  for (const tick of ticks) {
    tick.line.setAttribute('y1', y(tick.value)); tick.line.setAttribute('y2', y(tick.value));
    tick.label.setAttribute('y', y(tick.value) + 4);
  }
  for (const dot of dots) dot.element.setAttribute('cy', y(dot.value));
}

function updateScale(animate = true) {
  if (!data || !curveLayer) return;
  const first = start + scroll.scrollLeft / scale * DAY;
  const last = Math.min(end, start + (scroll.scrollLeft + scroll.clientWidth) / scale * DAY);
  // Election dots can still be partly visible with their centre just outside.
  const maximum = axisMaximum(curves, markers, first, last, 6.5 / scale * DAY);
  if (maximum === targetYmax) return;
  cancelAnimationFrame(scaleAnimation); targetYmax = maximum;
  const axis = $('y-axis'), grid = $('horizontal-grid');
  axis.replaceChildren(); grid.replaceChildren(); ticks = [];
  const step = maximum <= 50 ? 5 : 10;
  const values = [];
  for (let value = 0; value < maximum; value += step) values.push(value);
  // Avoid two labels only five points apart on the larger scales.
  if (maximum - values.at(-1) < step) values.pop();
  values.push(maximum);
  for (const value of values) {
    const line = element('line', { x1: 0, x2: width, stroke: 'var(--grid)', 'stroke-dasharray': value ? '3 5' : '0' });
    const label = element('text', { x: 32, 'text-anchor': 'end' }, value);
    grid.append(line); axis.append(label); ticks.push({ value, line, label });
  }
  chart.setAttribute('data-y-max', maximum);
  if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { paintScale(maximum); return; }
  const from = ymax, started = performance.now();
  paintScale(from);
  const frame = now => {
    const progress = Math.min(1, (now - started) / 240);
    paintScale(from + (maximum - from) * (1 - (1 - progress) ** 3));
    if (progress < 1) scaleAnimation = requestAnimationFrame(frame);
  };
  scaleAnimation = requestAnimationFrame(frame);
}

function updatePeriod() {
  if (!data) return;
  const first = new Date(start + scroll.scrollLeft / scale * DAY);
  const last = new Date(Math.min(end, start + (scroll.scrollLeft + scroll.clientWidth) / scale * DAY));
  const label = d => d.toLocaleDateString('de-DE', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  $('period').textContent = `${label(first)} – ${label(last)}`;
}
function hideTooltip() { $('tooltip').hidden = true; document.getElementById('crosshair')?.setAttribute('visibility', 'hidden'); }
function tooltipTitle(text, position) {
  const tooltip = $('tooltip'); tooltip.replaceChildren();
  const title = document.createElement('strong'); title.textContent = text; tooltip.append(title);
  tooltip.hidden = false;
  tooltip.style.left = `${Math.max(48, Math.min(position + 60, $('chart-frame').clientWidth - Math.min(290, tooltip.offsetWidth) - 8))}px`;
  return tooltip;
}
function tooltipRow(container, series, value, detail, precision = 1) {
  const row = document.createElement('div'); row.className = 'tooltip-row';
  const label = document.createElement('span'); label.append(swatch(series.color), document.createTextNode(series.label));
  const result = document.createElement('b'); result.textContent = `${number(value, precision)} %`; row.append(label, result); container.append(row);
  if (detail) { const note = document.createElement('small'); note.textContent = detail; container.append(note); }
}
function showElection(election, position) {
  const tooltip = tooltipTitle(`${election.label || 'Bundestagswahl'} · ${dateLabel(election.date)}`, position);
  for (const p of data.parties.filter(p => active.has(p.id))) {
    const value = election.values[p.id];
    if (value !== null && value !== undefined) tooltipRow(tooltip, p, value, election.candidacies?.[p.id] ? `Kandidaturen: ${election.candidacies[p.id]}` : null, 2);
  }
}
function inspect(event) {
  if (!data) return;
  const rect = scroll.getBoundingClientRect();
  const position = event.clientX - rect.left;
  const time = start + (position + scroll.scrollLeft) / scale * DAY;
  // Only show the election tooltip over an actual, enlarged election marker.
  const target = event.target.closest?.('[data-election]');
  if (target) { const e = data.elections.find(e => e.date === target.dataset.election); showElection(e, position); return; }
  const day = new Date(Math.round(time / DAY) * DAY).toISOString().slice(0, 10);
  const point = data.points.find(p => p.date === day);
  const tooltip = tooltipTitle(dateLabel(day), position); let rows = 0;
  if (point) for (const p of data.parties.filter(p => active.has(p.id))) {
    const value = point.values[p.id];
    if (value) { tooltipRow(tooltip, p, value.value); rows++; }
  }
  for (const s of data.approval.filter(s => active.has(s.id))) {
    const p = s.points.find(p => p.date === day);
    if (p?.value !== null && p?.value !== undefined) {
      tooltipRow(tooltip, s, p.value, `7-Tage-Durchschnitt · ${p.count} ${p.count === 1 ? 'Umfrage' : 'Umfragen'}`); rows++;
    }
  }
  if (!rows) { const note = document.createElement('small'); note.textContent = 'Keine Messwerte für diesen Tag.'; tooltip.append(note); }
  const crosshair = $('crosshair'); crosshair.setAttribute('x1', x(day)); crosshair.setAttribute('x2', x(day)); crosshair.setAttribute('visibility', 'visible');
}
scroll.addEventListener('scroll', () => {
  if (!data) return;
  updatePeriod(); hideTooltip();
  drawEventTrack();
  clearTimeout(scaleTimer);
  // Wait for scrolling to settle so the scale does not jump on every pixel.
  scaleTimer = setTimeout(() => updateScale(), 160);
}, { passive: true });
chart.addEventListener('pointermove', inspect);
chart.addEventListener('pointerleave', hideTooltip);
chart.addEventListener('click', inspect);
new ResizeObserver(() => {
  if (!data) return;
  const wasLatest = scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 40;
  const firstDate = start + scroll.scrollLeft / scale * DAY;
  render(firstDate, wasLatest);
}).observe(scroll);

async function load(initial = true) {
  if (initial) { $('loading').hidden = false; $('loading').textContent = 'Die Umfragen werden geladen …'; }
  loadController?.abort();
  const controller = new AbortController(); loadController = controller;
  const region = selectedRegion, country = selectedCountry, key = selectionKey();
  try {
    const response = await fetch(`/api/data?country=${encodeURIComponent(country)}&region=${encodeURIComponent(region)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Die Daten sind derzeit nicht verfügbar.');
    if (country !== selectedCountry || region !== selectedRegion) return;
    const saved = views.get(key);
    const wasLatest = data ? scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 40 : saved?.latest ?? true;
    const previousDate = data ? start + scroll.scrollLeft / scale * DAY : saved?.firstDate ?? null;
    data = result;
    if (initial) {
      active.clear();
      for (const id of selections.get(key) || data.parties.map(p => p.id)) active.add(id);
    }
    if (data.regions) {
      countryRegions.set(country, data.regions);
      $('region').replaceChildren(...data.regions.map(r => { const option = document.createElement('option'); option.value = r.id; option.textContent = r.label; return option; }));
      $('region').value = region; $('region').disabled = false;
    }
    $('additional').hidden = !data.approval.length;
    $('source').href = data.sourceUrl; $('source').hidden = false;
    $('source').textContent = country === 'es' ? 'Umfragearchiv ansehen ↗' : 'Originaltabelle ansehen ↗';
    $('source-credits').replaceChildren(...(data.sources || []).map(source => {
      const link = document.createElement('a'); link.href = source.url; link.textContent = source.label;
      link.target = '_blank'; link.rel = 'noopener noreferrer'; return link;
    }));
    $('source-credits').hidden = !data.sources?.length;
    $('data-note').textContent = data.dataNote || ''; $('data-note').hidden = !data.dataNote;
    $('measurement-note').textContent = data.measurementNote || ''; $('measurement-note').hidden = !data.measurementNote;
    $('axis-label').textContent = data.axisLabel || 'Umfragewert in %';
    $('average-note').textContent = `Die Grafik zeigt für ${country === 'de' && region === 'bundestag' ? 'Parteien sowie die Zufriedenheit mit Regierung und Bundeskanzler' : (region === 'barcelona' ? 'die Parteien und Antwortgruppen in ' : 'die Parteien in ') + (region === 'congreso' ? data.country.label : data.region.label)} den Durchschnitt aller Umfragen der letzten sieben Tage. Jede Umfrage wird gleich gewichtet; fehlende Werte werden ausgelassen. Vorhandene Kurvenpunkte werden auch über Umfragepausen hinweg verbunden.`;
    $('legend').setAttribute('aria-label', region === 'barcelona' ? 'Parteien und Antwortgruppen ein- und ausblenden' : 'Parteien ein- und ausblenden');
    const latestParties = data.parties.filter(p => data.latestPoll?.values[p.id] > 0);
    const otherParties = data.parties.filter(p => !(data.latestPoll?.values[p.id] > 0));
    $('legend').style.setProperty('--party-columns', Math.max(1, Math.min(7, latestParties.length)));
    $('legend').classList.toggle('regional-legend', country === 'es' && region !== 'congreso');
    $('legend').replaceChildren(...latestParties.map(p => toggle(p)));
    $('other-parties').hidden = !otherParties.length;
    $('other-parties-legend').replaceChildren(...otherParties.map(p => toggle(p, false, true)));
    $('approval-legend').replaceChildren(...data.approval.map(p => toggle(p, true)));
    $('status').textContent = `Letzte Umfrage: ${dateLabel(data.latestPollDate)}${data.latestPoll ? ` · ${data.latestPoll.pollster}` : ''} · ${data.pollCount.toLocaleString('de-DE')} Umfragen im Verlauf`;
    $('pollsters').textContent = data.pollsters?.length ? data.pollsters.join(' · ') : 'Die Liste der Umfrageinstitute wird aktualisiert …';
    $('updated').textContent = `${data.stale ? 'Aktualisierung fehlgeschlagen · letzter erfolgreicher Abruf' : 'Daten abgerufen'}: ${new Date(data.fetchedAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' })} · alle 15 Minuten`;
    $('loading').hidden = true;
    render(previousDate, wasLatest);
    void loadContext(data, () => ({ start, end, scale, width, scrollLeft: scroll.scrollLeft }));
  } catch (error) {
    if (controller.signal.aborted || country !== selectedCountry || region !== selectedRegion) return;
    if (!initial) { $('updated').textContent = 'Aktualisierung fehlgeschlagen · die zuletzt geladenen Daten bleiben sichtbar'; return; }
    $('status').textContent = 'Daten aktuell nicht erreichbar';
    $('loading').textContent = error.message;
    const retry = document.createElement('button'); retry.className = 'error-retry'; retry.textContent = 'Erneut laden'; retry.addEventListener('click', () => void load()); $('loading').append(retry);
  }
}
function saveView() {
  if (!data) return;
  selections.set(selectionKey(), [...active]);
  views.set(selectionKey(), { firstDate: start + scroll.scrollLeft / scale * DAY, latest: scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 40 });
  lastRegions.set(selectedCountry, selectedRegion);
}
function updateCountryText() {
  const germany = selectedCountry === 'de';
  $('page-title').textContent = germany ? 'Umfragewerte Parteien und Regierung' : 'Umfragewerte Parteien';
  $('subtitle').textContent = germany ? 'Alle Institute. Ein Verlauf. Parteien und Zufriedenheit im gleitenden 7-Tage-Durchschnitt.' : selectedRegion === 'barcelona' ? 'Barcelona. Kommunale Wahlabsichten aus dem städtischen Barometer im Zeitverlauf.' : 'Spanien. Alle Institute. Parteien im gleitenden 7-Tage-Durchschnitt.';
  document.title = `${$('page-title').textContent} · ${germany ? 'Deutschland' : 'Spanien'}`;
}
function switchView() {
  clearContext();
  loadController?.abort(); data = null; active.clear();
  clearTimeout(scaleTimer); cancelAnimationFrame(scaleAnimation); curveLayer = null;
  chart.replaceChildren(); $('y-axis').replaceChildren(); $('legend').replaceChildren(); $('approval-legend').replaceChildren();
  $('other-parties').hidden = true; $('other-parties-legend').replaceChildren(); $('other-parties').open = false;
  $('additional').hidden = true;
  $('source').hidden = true; $('source-credits').replaceChildren(); $('source-credits').hidden = true;
  $('data-note').hidden = true; $('average-note').textContent = 'Die Kurven zeigen den Durchschnitt aller Umfragen der letzten sieben Tage.';
  $('measurement-note').hidden = true; $('axis-label').textContent = 'Umfragewert in %';
  $('status').textContent = 'Umfragedaten werden geladen …'; $('period').textContent = 'Letzte 12 Monate';
  $('pollsters').textContent = 'Die Umfrageinstitute werden geladen …'; $('updated').textContent = 'Daten werden geladen …'; hideTooltip();
  updateCountryText();
  void load();
}
$('region').addEventListener('change', () => {
  saveView(); selectedRegion = $('region').value; switchView();
});
$('country').addEventListener('change', () => {
  saveView(); selectedCountry = $('country').value;
  const regions = countryRegions.get(selectedCountry);
  selectedRegion = lastRegions.get(selectedCountry) || regions[0].id;
  $('region').replaceChildren(...regions.map(r => { const option = document.createElement('option'); option.value = r.id; option.textContent = r.label; return option; }));
  $('region').value = selectedRegion; $('region').disabled = false;
  switchView();
});
updateCountryText();
void load();
setInterval(() => { if (!document.hidden && data) void load(false); }, 15 * 60 * 1000);
