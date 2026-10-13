// Shared by the browser and the source-data checks; no polling or seat-model logic.
export const EVENT_CATEGORIES = { government: 'Regierungswechsel', crisis: 'Krise', decision: 'Politischer Beschluss', statement: 'Politikeraussage' };
const DAY = 86400000;
const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const text = value => typeof value === 'string' && value.trim().length > 0;

export function validateEventData(data, countries, today = new Date().toISOString().slice(0, 10)) {
  if (!Array.isArray(data)) throw new Error('Ungültige Chronik');
  const ids = new Set();
  for (const e of data) {
    const country = countries.find(c => c.id === e.country);
    const regions = country?.regions.map(r => r.id) || [];
    let source;
    try { source = new URL(e.source?.url); } catch {}
    if (!text(e.id) || ids.has(e.id) || !validDate(e.date) || !validDate(e.verifiedAt) || e.date > e.verifiedAt || e.verifiedAt > today ||
        (!country && e.country !== 'all') || !Object.hasOwn(EVENT_CATEGORIES, e.category) || !text(e.title) || !text(e.description) ||
        !Array.isArray(e.regions) || !e.regions.length || new Set(e.regions).size !== e.regions.length ||
        e.regions.some(r => r !== 'all' && !regions.includes(r)) || (e.country === 'all' && (e.regions.length !== 1 || e.regions[0] !== 'all')) ||
        !text(e.source?.title) || source?.protocol !== 'https:' || !source.hostname || source.username || source.password ||
        (e.endDate !== undefined && (!validDate(e.endDate) || e.endDate < e.date || e.endDate > e.verifiedAt))) throw new Error(`Ungültiges Chronikereignis: ${e.id}`);
    if (e.category === 'statement') {
      if (!text(e.speaker) || !text(e.occasion) || (e.statementFormat === 'summary' ? e.quote !== undefined : (e.statementFormat !== undefined && e.statementFormat !== 'quote') || !text(e.quote))) throw new Error(`Unbelegte Aussage: ${e.id}`);
    } else if (e.quote !== undefined || e.statementFormat !== undefined) throw new Error(`Unzulässiges Aussageformat: ${e.id}`);
    ids.add(e.id);
  }
  return data;
}

export function filterEvents(events, { country, region, filterRegion = 'current', category = 'all', start, end }) {
  const selected = filterRegion === 'current' ? region : filterRegion;
  return events.filter(e => (e.country === country || e.country === 'all') &&
    (filterRegion === 'all' || e.regions.includes('all') || e.regions.includes(selected)) &&
    (category === 'all' || e.category === category) && (!start || e.date >= start) && (!end || e.date <= end))
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

export function clusterEvents(events, { start, width, scale }, distance = 24) {
  if (![start, width, scale, distance].every(Number.isFinite) || width < 0 || scale <= 0 || distance <= 0) return [];
  const points = events.map(event => ({ event, position: (Date.parse(event.date) - start) / DAY * scale }))
    .filter(p => Number.isFinite(p.position) && p.position >= 0 && p.position <= width)
    .sort((a, b) => a.position - b.position || a.event.id.localeCompare(b.event.id));
  const groups = [];
  for (const point of points) {
    const previous = groups.at(-1);
    // Anchored groups cannot overlap across arbitrary 24-pixel bin boundaries.
    if (previous && point.position - previous[0].position < distance) previous.push(point);
    else groups.push([point]);
  }
  return groups;
}
