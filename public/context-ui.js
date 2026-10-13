import { projectSeats, coalition } from './seat-model.js';
import { EVENT_CATEGORIES as category, filterEvents, clusterEvents } from './event-data.js';
const $ = id => document.getElementById(id), NS = 'http://www.w3.org/2000/svg';
const date = value => new Date(value).toLocaleDateString('de-DE', { timeZone: 'UTC' });
const percent = value => value.toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' %';
const palette = ['#408fca', '#ba6b9e', '#d79535', '#5a9b78', '#9982cf', '#ca665d', '#72a6aa', '#807866'];
let context, poll, timeline, key, controller, result, topicSet = new Set(), chosen = new Set(), exceptions = new Set();
function node(tag, text, cls) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; }
function svg(tag, attrs, text) { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); if (text !== undefined) e.textContent = text; return e; }
function links(container, sources) { container.replaceChildren(...sources.map(s => { const a = node('a', s.title); a.href = s.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; })); }
function button(label, pressed, color, action) {
  const b = node('button', label, 'context-toggle'); b.type = 'button'; b.setAttribute('aria-pressed', String(pressed));
  if (color) { const i = node('i', undefined, 'swatch'); i.style.background = color; b.prepend(i); }
  b.addEventListener('click', action); return b;
}
export function clearContext() {
  controller?.abort(); context = null; poll = null;
  for (const id of ['hemicycle', 'seat-parties', 'seat-exceptions', 'seat-sources', 'topic-ranking', 'topic-toggles', 'topic-chart', 'event-list', 'event-detail']) $(id).replaceChildren();
  $('event-track').hidden = true; $('seat-basis').textContent = 'Warte auf Umfragedaten …'; $('seat-warning').textContent = '';
  $('coalition-result').textContent = ''; $('seat-threshold').textContent = ''; $('coalition-progress').hidden = true;
  for (const id of ['topic-series', 'topic-question', 'topic-method', 'topic-fieldwork', 'topic-updated', 'topic-scope', 'topic-selection']) $(id).textContent = '';
  $('topic-sources').replaceChildren(); $('topic-wave').replaceChildren(); $('event-count').textContent = ''; $('event-detail').hidden = true;
}
export async function loadContext(data, getTimeline) {
  controller?.abort(); const current = new AbortController(); controller = current;
  const nextKey = `${data.country.id}:${data.region.id}`;
  if (nextKey !== key) { chosen.clear(); exceptions.clear(); topicSet.clear(); $('seat-mode').value = 'poll'; $('event-region').value = 'current'; key = nextKey; }
  poll = data; timeline = getTimeline;
  try {
    const response = await fetch(`/api/context?country=${data.country.id}&region=${data.region.id}`, { signal: current.signal });
    if (!response.ok) throw new Error('Zusatzdaten derzeit nicht verfügbar');
    const loaded = await response.json(); if (current.signal.aborted) return;
    context = loaded; renderSeats(); renderTopics(true); renderEvents();
  } catch (error) { if (!current.signal.aborted) { $('seat-warning').textContent = error.message; $('topic-updated').textContent = 'Themen und Chronik konnten nicht geladen werden.'; } }
}
function renderSeats() {
  if (!context || !poll) return;
  const rule = context.rule, mode = $('seat-mode').value;
  result = projectSeats(poll, rule, mode, [...exceptions]);
  const basis = mode === 'poll' ? `Einzelumfrage: ${date(poll.latestPoll.date)} · ${poll.latestPoll.pollster}${poll.latestPoll.fieldwork ? ' · Feldzeit ' + poll.latestPoll.fieldwork : poll.dateBasis === 'fieldwork-end' ? ' · Datum: Befragungsende' : ' · Datum der Quelle; Feldzeit nicht verfügbar'}` : `7-Tage-Durchschnitt am ${date(poll.points.at(-1).date)} · alle vorhandenen Institute; fehlende Parteiwert-Fenster ausgelassen`;
  $('seat-basis').textContent = `${rule.title} · ${basis}${poll.stale ? ' · Umfragedaten veraltet' : ''}`;
  $('seat-warning').textContent = result.status === 'gap' ? result.reason : Array.isArray(rule.assumptions) ? rule.assumptions.join(' ') : rule.assumptions;
  links($('seat-sources'), rule.sources); $('seat-sources').append(node('span', `Regelstand geprüft: ${date(rule.checkedAt)}`));
  const exceptionsOpen = $('seat-exceptions').querySelector('details')?.open;
  $('hemicycle').replaceChildren(); $('seat-parties').replaceChildren(); $('seat-exceptions').replaceChildren();
  const layout = document.querySelector('.seat-layout'); layout.hidden = result.status !== 'model';
  if (result.status !== 'model') return;
  if (result.missing.length) $('seat-warning').append(document.createTextNode(' Nicht ausgewiesen und im Modell ausgeschlossen: ' + result.missing.join(', ') + '.'));
  if (result.total !== result.baseTotal) $('seat-warning').append(document.createTextNode(` Mehrheitsgarantie: ${result.total - result.baseTotal} zusätzliche Sitze gegenüber der regulären Größe.`));
  if (result.tied) $('seat-warning').append(document.createTextNode(' Ein Sitzgleichstand wurde für das Szenario stabil nach Stimmenzahl/ID aufgelöst; gesetzliche Losentscheidungen können abweichen.'));
  if (rule.type === 'bundestag' || rule.directException) {
    const count = rule.directException || 3;
    const wrap = node('details'); wrap.open = Boolean(exceptionsOpen); wrap.append(node('summary', `Annahmen zur Grundmandatsklausel (mindestens ${count} gewonnene Wahlkreise)`));
    for (const p of result.rows.filter(p => p.value < rule.threshold && p.value > 0 && !rule.exceptions?.includes(p.id))) {
      const label = node('label'), input = node('input'); input.type = 'checkbox'; input.checked = exceptions.has(p.id);
      input.setAttribute('aria-label', `${p.label}: ${count} Wahlkreise annehmen`);
      input.addEventListener('change', () => { input.checked ? exceptions.add(p.id) : exceptions.delete(p.id); renderSeats(); }); label.append(input, document.createTextNode(p.label)); wrap.append(label);
    }
    $('seat-exceptions').append(wrap);
  }
  $('seat-threshold').textContent = `Absolute rechnerische Mehrheit: ${result.majority} von ${result.total} Sitzen`;
  for (const p of result.rows) $('seat-parties').append(button(`${p.label}: ${p.seats} Sitze`, chosen.has(p.id), p.color, () => { chosen.has(p.id) ? chosen.delete(p.id) : chosen.add(p.id); renderSeats(); }));
  const positions = [], rings = result.total > 200 ? 9 : result.total > 80 ? 6 : 3;
  const radii = Array.from({ length: rings }, (_, i) => 100 + i * 100 / (rings - 1));
  let remaining = result.total;
  radii.forEach((r, i) => { const n = i === rings - 1 ? remaining : Math.floor(result.total * r / radii.reduce((a, b) => a + b, 0)); remaining -= n;
    for (let j = 0; j < n; j++) { const angle = Math.PI - Math.PI * (j + .5) / n; positions.push({ angle, x: 230 + r * Math.cos(angle), y: 215 - r * Math.sin(angle) }); }
  });
  positions.sort((a, b) => b.angle - a.angle); let index = 0;
  for (const p of result.rows) for (let i = 0; i < p.seats; i++) {
    const pos = positions[index++], dot = svg('circle', { cx: pos.x, cy: pos.y, r: result.total > 200 ? 3.4 : result.total > 80 ? 5 : 7, fill: p.color, opacity: chosen.size && !chosen.has(p.id) ? '.25' : '1', 'data-seat-party': p.id });
    dot.append(svg('title', {}, `${p.label}: ${p.seats} Modellsitze`)); $('hemicycle').append(dot);
  }
  $('hemicycle').append(svg('line', { x1: 230, x2: 230, y1: 9, y2: 83, stroke: 'var(--text)', 'stroke-dasharray': '3 3' }), svg('text', { x: 230, y: 160, 'text-anchor': 'middle', style: 'font-size:20px;font-weight:700;fill:var(--text)' }, `${result.total} Sitze`), svg('text', { x: 230, y: 185, 'text-anchor': 'middle' }, `Mehrheit ab ${result.majority}`));
  const sum = coalition(result, [...chosen]);
  $('coalition-result').textContent = chosen.size ? `${sum.seats} Sitze · ${sum.majority ? 'rechnerische Mehrheit' : 'keine Mehrheit; es fehlen ' + sum.needed + ' Sitze'}. Keine Aussage über politische Koalitionsbereitschaft.` : 'Wähle eine oder mehrere Parteien.';
  $('coalition-progress').hidden = false; $('coalition-progress').max = result.total; $('coalition-progress').value = sum.seats;
}
const series = () => context?.topics.series[0];
function renderTopics(initial = false) {
  const s = series(); if (!s) { $('topic-updated').textContent = 'Keine vergleichbare Themenreihe importiert.'; return; }
  const observations = s.observations;
  if (initial) {
    $('topic-wave').replaceChildren(...observations.map(o => { const option = node('option', date(o.date)); option.value = o.id; return option; })); $('topic-wave').value = observations.at(-1).id;
  }
  const observation = observations.find(o => o.id === $('topic-wave').value) || observations.at(-1);
  const ranking = Object.entries(observation.values).filter(([, v]) => v !== null).sort((a, b) => b[1] - a[1]);
  if (!topicSet.size && initial) topicSet = new Set(ranking.slice(0, 4).map(([label]) => label));
  $('topic-scope').textContent = context.topics.scopeNote; $('topic-series').textContent = s.label;
  $('topic-question').textContent = 'Fragewortlaut: „' + s.question + '“'; $('topic-method').textContent = `${s.population}. ${s.measurement}`;
  $('topic-fieldwork').textContent = `Datierung: ${s.dateBasis}. Feldzeit: ${observation.fieldwork ? date(observation.fieldwork.start) + ' – ' + date(observation.fieldwork.end) : 'in der Langzeitdatei nicht angegeben; Quellendatum ' + date(observation.date)}.`;
  links($('topic-sources'), [{ title: 'Originalergebnisse der Erhebung', url: observation.url }, { title: 'Frage und Methodik', url: s.questionUrl }]);
  $('topic-ranking').replaceChildren(...ranking.map(([label, v]) => { const li = node('li'); li.append(node('span', label), node('strong', percent(v))); return li; }));
  $('topic-updated').textContent = `Daten geprüft/importiert: ${date(context.topics.checkedAt)}. ${context.topics.updatePolicy} Importiert: ${observations.length} Erhebungen. Frühere oder weitere Erhebungen können ergänzt werden.`;
  $('topic-toggles').replaceChildren(...s.topics.map((label, i) => button(label, topicSet.has(label), palette[i % palette.length], () => { topicSet.has(label) ? topicSet.delete(label) : topicSet.add(label); renderTopics(); })));
  drawTopics();
}
function drawTopics() {
  const s = series(); if (!s) return;
  const until = new Date(s.observations.at(-1).date), cutoff = new Date(until); cutoff.setUTCMonth(cutoff.getUTCMonth() - 24);
  const observations = s.observations.filter(o => $('topic-period').value === 'all' || new Date(o.date) >= cutoff);
  const frame = $('topic-chart'); frame.replaceChildren();
  if (!topicSet.size) { $('topic-selection').textContent = 'Wähle Themen für den Verlauf.'; return; }
  const first = new Date(observations[0].date).getTime(), last = new Date(observations.at(-1).date).getTime();
  const x = day => 45 + (new Date(day).getTime() - first) / Math.max(1, last - first) * 720;
  const max = Math.max(10, ...observations.flatMap(o => [...topicSet].map(t => o.values[t] ?? 0)));
  const top = Math.min(100, Math.ceil((max + 2) / 10) * 10), y = value => 265 - value / top * 240;
  for (let v = 0; v <= top; v += top / 5) frame.append(svg('line', { x1: 45, x2: 765, y1: y(v), y2: y(v), stroke: 'var(--grid)' }), svg('text', { x: 36, y: y(v) + 4, 'text-anchor': 'end' }, Math.round(v) + '%'));
  for (const [i, topic] of s.topics.entries()) if (topicSet.has(topic)) {
    let path = '', connected = false;
    for (const obs of observations) {
      const value = obs.values[topic];
      if (value === undefined || value === null) { connected = false; continue; }
      path += `${connected ? 'L' : 'M'}${x(obs.date)},${y(value)}`; connected = true;
      const circle = svg('circle', { cx: x(obs.date), cy: y(value), r: 4, fill: palette[i % palette.length], tabindex: 0, 'data-topic': topic, 'aria-label': `${topic}, ${date(obs.date)}: ${percent(value)}` });
      circle.append(svg('title', {}, `${topic} · ${date(obs.date)} · ${percent(value)}`));
      for (const event of ['focus', 'pointerenter', 'click']) circle.addEventListener(event, () => { $('topic-selection').textContent = `${topic} · ${date(obs.date)} · ${percent(value)}${obs.fieldwork ? ' · Feldzeit ' + date(obs.fieldwork.start) + ' – ' + date(obs.fieldwork.end) : ''}`; });
      frame.append(circle);
    }
    frame.prepend(svg('path', { d: path, fill: 'none', stroke: palette[i % palette.length], 'stroke-width': 2, 'data-topic-line': topic }));
  }
  for (const [day, pos, anchor] of [[observations[0].date, 45, 'start'], [observations.at(-1).date, 765, 'end']]) frame.append(svg('text', { x: pos, y: 290, 'text-anchor': anchor }, date(day)));
  $('topic-selection').textContent = `${observations.length} Erhebungen im dargestellten Zeitraum. Punkte zeigen die tatsächlich erhobenen Werte.`;
}
function eventFilter(withDates = true) {
  return { country: poll.country.id, region: poll.region.id, filterRegion: $('event-region').value,
    category: $('event-category').value, ...(withDates && poll.points.length ? { start: poll.points[0].date, end: poll.points.at(-1).date } : {}) };
}
function filteredEvents() { return filterEvents(context?.events || [], eventFilter()); }
const eventDate = event => date(event.date) + (event.endDate && event.endDate !== event.date ? ' – ' + date(event.endDate) : '');
function eventArea(event) {
  if (event.country === 'all') return 'International';
  if (event.regions.includes('all')) return poll.country.label + ' · landesweiter Kontext';
  return event.regions.map(id => poll.regions.find(r => r.id === id)?.label || id).join(', ');
}
function eventCard(event) {
  const article = node('article'); article.append(node('strong', `${eventDate(event)} · ${event.title}`), node('p', `${category[event.category]} · ${eventArea(event)}` , 'context-note'), node('p', event.description));
  if (event.quote) article.append(node('blockquote', `„${event.quote}“ — ${event.speaker}`), node('p', 'Anlass: ' + event.occasion));
  if (event.statementFormat === 'summary') article.append(node('p', `Sinngemäße Zusammenfassung · ${event.speaker} · Anlass: ${event.occasion}`, 'context-note'));
  const sources = node('div', undefined, 'context-sources'); links(sources, [event.source]); article.append(sources, node('small', `Beleg geprüft: ${date(event.verifiedAt)}`)); return article;
}
function renderEvents() {
  if (!context || !poll) return;
  const selected = $('event-region').value;
  $('event-region').replaceChildren(node('option', 'Zum ausgewählten Wahlgebiet'), node('option', 'Alle Regionen des Landes'), ...poll.regions.map(r => { const opt = node('option', r.label); opt.value = r.id; return opt; }));
  $('event-region').options[0].value = 'current'; $('event-region').options[1].value = 'all'; $('event-region').value = selected || 'current';
  const events = filteredEvents(); $('event-list').replaceChildren(...[...events].reverse().map(e => { const li = node('li'); li.append(eventCard(e)); return li; }));
  const outside = filterEvents(context.events, eventFilter(false)).length - events.length;
  $('event-count').textContent = `${events.length} ${events.length === 1 ? 'Ereignis' : 'Ereignisse'} im importierten Umfragezeitraum ${date(poll.points[0].date)} – ${date(poll.points.at(-1).date)}. Die Liste zeigt alle passenden Ereignisse dieses Zeitraums, neueste zuerst.${outside === 1 ? ' 1 weiterer passender Eintrag liegt außerhalb dieses Umfragezeitraums.' : outside > 1 ? ' ' + outside + ' weitere passende Einträge liegen außerhalb dieses Umfragezeitraums.' : ''}`;
  $('event-detail').hidden = true; drawEventTrack();
}
export function drawEventTrack() {
  if (!context || !poll || !timeline) return;
  const show = $('events-visible').checked; $('event-track').hidden = !show; if (!show) return;
  const view = timeline(); if (!Number.isFinite(view.start)) return;
  const inner = $('event-track-inner'); inner.style.width = view.width + 'px'; inner.style.transform = `translateX(${-view.scrollLeft}px)`; inner.replaceChildren();
  for (const group of clusterEvents(filteredEvents(), view)) {
    const b = node('button', group.length === 1 ? '◆' : String(group.length), 'event-marker'); b.type = 'button'; b.style.left = group[0].position + 'px';
    b.setAttribute('aria-label', group.map(({ event }) => eventDate(event) + ' ' + event.title).join('; ')); b.title = b.getAttribute('aria-label'); b.dataset.event = group[0].event.id;
    b.addEventListener('click', () => { $('event-detail').replaceChildren(...group.map(({ event }) => eventCard(event))); $('event-detail').hidden = false; $('event-detail').scrollIntoView({ block: 'nearest', behavior: 'auto' }); }); inner.append(b);
  }
}
$('seat-mode').addEventListener('change', renderSeats);
$('topic-wave').addEventListener('change', () => renderTopics()); $('topic-period').addEventListener('change', drawTopics);
for (const id of ['event-region', 'event-category']) $(id).addEventListener('change', renderEvents);
$('events-visible').addEventListener('change', drawEventTrack);
