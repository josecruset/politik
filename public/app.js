const $ = id => document.getElementById(id);
const DAY = 86400000;
const svgNS = 'http://www.w3.org/2000/svg';
const dateLabel = date => new Date(date).toLocaleDateString('de-DE', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });
const number = (value, precision = 1) => value.toLocaleString('de-DE', { maximumFractionDigits: precision, minimumFractionDigits: 1 });
let data, width, height, scale, start, end, ymax;
const active = new Set();
const selections = new Map();
let selectedRegion = 'bundestag', loadController;
const scroll = $('chart-scroll'), chart = $('chart');

function element(tag, attributes = {}, text) {
  const el = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
  if (text !== undefined) el.textContent = text;
  return el;
}
function swatch(color) { const el = document.createElement('i'); el.className = 'swatch'; el.style.background = color; return el; }
function toggle(series, approval = false) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = approval ? 'approval-toggle' : 'party-toggle';
  button.dataset.series = series.id;
  button.setAttribute('aria-pressed', String(active.has(series.id)));
  button.setAttribute('aria-label', `${series.label} ein- oder ausblenden`);
  if (approval) {
    const handle = document.createElement('span'); handle.className = 'switch'; handle.setAttribute('aria-hidden', 'true');
    button.append(handle, swatch(series.color), document.createTextNode(series.label));
  } else {
    const name = document.createElement('span'); name.className = 'party-name'; name.append(swatch(series.color), document.createTextNode(series.label));
    const value = document.createElement('span'); value.className = 'party-value';
    const last = data.latestPoll?.values[series.id];
    value.append(document.createTextNode(last === null || last === undefined ? '–' : last.toLocaleString('de-DE', { maximumFractionDigits: 2 })));
    const unit = document.createElement('small'); unit.textContent = '%'; value.append(unit);
    button.append(name, value);
  }
  button.addEventListener('click', () => {
    const previousDate = start + scroll.scrollLeft / scale * DAY;
    active.has(series.id) ? active.delete(series.id) : active.add(series.id);
    button.setAttribute('aria-pressed', String(active.has(series.id)));
    render(); scroll.scrollLeft = (previousDate - start) / DAY * scale; updatePeriod();
  });
  return button;
}
const x = date => (new Date(date).getTime() - start) / DAY * scale;
const y = value => 14 + (ymax - value) / ymax * (height - 55);

function render() {
  if (!data) return;
  height = window.innerWidth <= 600 ? 302 : 340;
  // One viewport always spans approximately one year, independently of screen size.
  scale = Math.max(1, scroll.clientWidth - 12) / 365.25;
  start = Math.min(new Date(data.points[0].date).getTime(), ...data.approval.filter(s => active.has(s.id)).map(s => new Date(s.points[0].date).getTime()), ...(data.elections || []).map(e => new Date(e.date).getTime()));
  end = Math.max(new Date(data.points.at(-1).date).getTime(), ...data.approval.filter(s => active.has(s.id)).map(s => new Date(s.points.at(-1).date).getTime()), ...(data.elections || []).map(e => new Date(e.date).getTime()));
  width = Math.max(scroll.clientWidth, (end - start) / DAY * scale + 12);
  ymax = active.has('government') ? 100 : active.has('chancellor') ? 60 : 50;
  chart.replaceChildren(); chart.setAttribute('width', width); chart.setAttribute('height', height); chart.style.height = `${height}px`;
  const axis = $('y-axis'); axis.replaceChildren(); axis.setAttribute('height', height); axis.style.height = `${height}px`;
  for (let value = 0; value <= ymax; value += ymax === 100 ? 20 : 10) {
    chart.append(element('line', { x1: 0, x2: width, y1: y(value), y2: y(value), stroke: '#e8eee9', 'stroke-dasharray': value ? '3 5' : '0' }));
    axis.append(element('text', { x: 32, y: y(value) + 4, 'text-anchor': 'end' }, `${value}`));
  }
  let month = new Date(start); month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
  while (month.getTime() <= end) {
    const pos = x(month);
    chart.append(element('line', { x1: pos, x2: pos, y1: 14, y2: height - 41, stroke: '#f1f4f2' }));
    if (scale >= 1.1 || month.getUTCMonth() % 3 === 0) chart.append(element('text', { x: pos + 3, y: height - 17 }, month.toLocaleDateString('de-DE', { month: 'short', timeZone: 'UTC' })));
    if (month.getUTCMonth() === 0) chart.append(element('text', { x: pos + 3, y: height - 3, style: 'fill:#4c6b57;font-size:10px;font-weight:600' }, month.getUTCFullYear()));
    month.setUTCMonth(month.getUTCMonth() + 1);
  }
  chart.append(element('line', { id: 'five-percent-line', x1: 0, x2: width, y1: y(5), y2: y(5), stroke: '#000', 'stroke-width': 1, 'pointer-events': 'none' }));
  for (const party of data.parties.filter(p => active.has(p.id))) {
    let path = '', connected = false;
    for (const point of data.points) {
      const v = point.values[party.id];
      // Connect existing averages across polling pauses, including year changes.
      if (!v) continue;
      path += `${connected ? 'L' : 'M'}${x(point.date).toFixed(2)},${y(v.value).toFixed(2)}`; connected = true;
    }
    // A subtle outline makes the source's bright yellow FDP line readable.
    if (party.id === 'fdp') chart.append(element('path', { d: path, fill: 'none', stroke: '#b0a545', 'stroke-width': 3.3, opacity: .6 }));
    const line = element('path', { d: path, fill: 'none', stroke: party.color, 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'data-line': party.id });
    line.append(element('title', {}, party.label)); chart.append(line);
  }
  for (const series of data.approval.filter(s => active.has(s.id))) {
    const points = series.points.filter(p => p.value !== null);
    const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(2)},${y(p.value).toFixed(2)}`).join('');
    chart.append(element('path', { d: path, fill: 'none', stroke: series.color, 'stroke-width': 1.8, 'stroke-dasharray': '5 4', 'data-line': series.id }));
  }
  for (const election of data.elections || []) {
    for (const party of data.parties.filter(p => active.has(p.id))) {
      const value = election.values[party.id];
      if (value === null || value === undefined) continue;
      const dot = element('circle', { cx: x(election.date), cy: y(value), r: 5.5, fill: party.color, stroke: 'white', 'stroke-width': 2, tabindex: 0, 'data-election': election.date, 'data-party': party.id, 'aria-label': `${election.label || 'Bundestagswahl'} ${dateLabel(election.date)}, ${party.label}: ${number(value, 2)} Prozent` });
      dot.append(element('title', {}, election.label || 'Bundestagswahl'));
      dot.addEventListener('focus', () => showElection(election, x(election.date) - scroll.scrollLeft));
      dot.addEventListener('blur', hideTooltip);
      chart.append(dot);
    }
  }
  chart.append(element('line', { id: 'crosshair', y1: 14, y2: height - 41, stroke: '#7f9688', 'stroke-dasharray': '3 4', visibility: 'hidden', 'pointer-events': 'none' }));
  updatePeriod(); hideTooltip();
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
  for (const p of data.parties.filter(p => active.has(p.id))) if (election.values[p.id] !== null) tooltipRow(tooltip, p, election.values[p.id], null, 2);
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
scroll.addEventListener('scroll', () => { updatePeriod(); hideTooltip(); }, { passive: true });
chart.addEventListener('pointermove', inspect);
chart.addEventListener('pointerleave', hideTooltip);
chart.addEventListener('click', inspect);
new ResizeObserver(() => {
  if (!data) return;
  const wasLatest = scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 40;
  const firstDate = start + scroll.scrollLeft / scale * DAY;
  render(); scroll.scrollLeft = wasLatest ? scroll.scrollWidth : (firstDate - start) / DAY * scale;
}).observe(scroll);

async function load(initial = true) {
  if (initial) { $('loading').hidden = false; $('loading').textContent = 'Die Umfragen werden aus Google Sheets geladen …'; }
  loadController?.abort();
  const controller = new AbortController(); loadController = controller;
  const region = selectedRegion;
  try {
    const response = await fetch(`/api/data?region=${encodeURIComponent(region)}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Die Daten sind derzeit nicht verfügbar.');
    if (region !== selectedRegion) return;
    const wasLatest = !data || scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 40;
    const previousDate = data ? start + scroll.scrollLeft / scale * DAY : null;
    data = result;
    if (initial) {
      active.clear();
      for (const id of selections.get(region) || data.parties.map(p => p.id)) active.add(id);
    }
    if (data.regions) {
      $('region').replaceChildren(...data.regions.map(r => { const option = document.createElement('option'); option.value = r.id; option.textContent = r.label; return option; }));
      $('region').value = region; $('region').disabled = false;
    }
    $('additional').hidden = region !== 'bundestag';
    $('source').href = data.sourceUrl;
    $('average-note').textContent = `Die Grafik zeigt für ${region === 'bundestag' ? 'Parteien sowie die Zufriedenheit mit Regierung und Bundeskanzler' : 'die Parteien in ' + data.region.label} den Durchschnitt aller Umfragen der letzten sieben Tage. Jede Umfrage wird gleich gewichtet; fehlende Werte werden ausgelassen. Vorhandene Kurvenpunkte werden auch über Umfragepausen hinweg verbunden.`;
    $('legend').replaceChildren(...data.parties.map(p => toggle(p)));
    $('approval-legend').replaceChildren(...data.approval.map(p => toggle(p, true)));
    $('status').textContent = `Letzte Umfrage: ${dateLabel(data.latestPollDate)}${data.latestPoll ? ` · ${data.latestPoll.pollster}` : ''} · ${data.pollCount.toLocaleString('de-DE')} Umfragen im Verlauf`;
    $('pollsters').textContent = data.pollsters?.length ? data.pollsters.join(' · ') : 'Die Liste der Umfrageinstitute wird aktualisiert …';
    $('updated').textContent = `${data.stale ? 'Aktualisierung fehlgeschlagen · letzter erfolgreicher Abruf' : 'Daten abgerufen'}: ${new Date(data.fetchedAt).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' })} · alle 15 Minuten`;
    $('loading').hidden = true;
    render(); scroll.scrollLeft = wasLatest ? scroll.scrollWidth : (previousDate - start) / DAY * scale; updatePeriod();
  } catch (error) {
    if (controller.signal.aborted || region !== selectedRegion) return;
    if (!initial) { $('updated').textContent = 'Aktualisierung fehlgeschlagen · die zuletzt geladenen Daten bleiben sichtbar'; return; }
    $('status').textContent = 'Daten aktuell nicht erreichbar';
    $('loading').textContent = error.message;
    const retry = document.createElement('button'); retry.className = 'error-retry'; retry.textContent = 'Erneut laden'; retry.addEventListener('click', () => void load()); $('loading').append(retry);
  }
}
$('region').addEventListener('change', () => {
  if (data) selections.set(selectedRegion, [...active]);
  selectedRegion = $('region').value; data = null; active.clear();
  chart.replaceChildren(); $('y-axis').replaceChildren(); $('legend').replaceChildren(); $('approval-legend').replaceChildren();
  $('additional').hidden = selectedRegion !== 'bundestag';
  $('status').textContent = 'Umfragedaten werden geladen …'; $('period').textContent = 'Letzte 12 Monate';
  $('pollsters').textContent = 'Die Umfrageinstitute werden geladen …'; hideTooltip();
  void load();
});
void load();
setInterval(() => { if (!document.hidden && data) void load(false); }, 15 * 60 * 1000);
