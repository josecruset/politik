const $ = id => document.getElementById(id);
const time = value => new Date(value).toLocaleString('de-DE', { timeZone: 'Europe/Madrid', dateStyle: 'short', timeStyle: 'short' });
let visible = false, controller;
function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}
function renderMarket(event) {
  const card = node('article', undefined, 'market-card');
  card.dataset.market = event.id;
  card.append(node('h3', `Mehrheit · ${event.label}`));
  card.append(node('p', event.closed ? 'Markt abgeschlossen' : event.stale ? 'Veralteter Stand · Aktualisierung fehlgeschlagen oder Quellkurs älter als 15 Minuten' : 'Markt aktiv', 'market-state'));
  if (!event.outcomes.length) card.append(node('p', 'Kurse derzeit nicht verfügbar. Erneuter Abruf in einer Minute.', 'context-note'));
  for (const outcome of event.outcomes) {
    const row = node('div', undefined, 'market-row'), name = node('span', outcome.label);
    const swatch = node('i', undefined, 'swatch'); swatch.style.background = outcome.color; name.prepend(swatch);
    row.append(name, node('strong', `${outcome.probability.toLocaleString('de-DE', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} %`));
    const bar = node('div', undefined, 'market-bar'), fill = node('span');
    bar.setAttribute('aria-hidden', 'true'); fill.style.width = `${outcome.probability}%`; fill.style.background = outcome.color; bar.append(fill);
    card.append(row, bar);
  }
  if (event.outcomes.length) {
    const oldest = Math.min(...event.outcomes.map(o => Date.parse(o.updatedAt)));
    card.append(node('p', `Kursstand: ${time(oldest)} · Abruf: ${time(event.fetchedAt)} (Madrid)${event.closed && event.stale ? ' · Aktualisierung fehlgeschlagen' : ''}`, 'context-note'));
  }
  const link = node('a', 'Markt und Auflösungsregeln auf Polymarket ↗');
  link.href = event.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
  card.append(link);
  return card;
}
async function loadMarkets() {
  if (!visible || document.hidden) return;
  controller?.abort(); const current = new AbortController(); controller = current;
  try {
    const response = await fetch('/api/markets?country=us', { signal: AbortSignal.any([current.signal, AbortSignal.timeout(55_000)]) });
    if (!response.ok) throw new Error('Polymarket derzeit nicht erreichbar');
    const data = await response.json();
    if (current.signal.aborted || !visible) return;
    $('market-cards').replaceChildren(...data.events.map(renderMarket));
    $('market-status').textContent = data.events.some(e => e.stale) ? 'Mindestens ein Markt ist nicht aktuell verfügbar. Vorhandene Werte zeigen den letzten erfolgreichen Stand.' : 'Öffentliche Polymarket-Kurse · automatische Aktualisierung jede Minute';
  } catch {
    if (!current.signal.aborted && visible) {
      $('market-status').textContent = 'Aktualisierung fehlgeschlagen · vorhandene Kurse sind möglicherweise veraltet. Erneuter Abruf in einer Minute.';
      for (const state of $('market-cards').querySelectorAll('.market-state')) state.textContent = 'Veralteter Stand · Abruf fehlgeschlagen';
    }
  }
}
export function showMarkets(country) {
  controller?.abort(); visible = country === 'us';
  $('markets').hidden = !visible;
  for (const section of document.querySelectorAll('[data-country-context]')) section.hidden = visible;
  if (visible) {
    $('market-cards').replaceChildren(); $('market-status').textContent = 'Polymarket-Kurse werden geladen …';
    void loadMarkets();
  }
}
setInterval(() => void loadMarkets(), 60_000);
