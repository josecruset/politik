import { readFile } from 'node:fs/promises';
import { seatRule } from './seat-rules.js';
import { actualSeatsFor } from './actual-seats.js';
import { COUNTRIES } from './countries.js';
import { validateEventData } from '../public/event-data.js';
const read = async name => JSON.parse(await readFile(new URL(`./content/${name}.json`, import.meta.url), 'utf8'));
export const topics = await read('topics');
export const events = await read('events');
export function validateTopics(data) {
  if (data.version !== 1 || !Array.isArray(data.series) || !data.checkedAt) throw new Error('Ungültige Themenversion');
  for (const series of data.series) {
    if (!series.question || !series.population || !series.measurement || !series.observations.length) throw new Error('Themenmetadaten fehlen');
    const ids = new Set(); let previous = '';
    for (const observation of series.observations) {
      if (ids.has(observation.id) || observation.date < previous || observation.date > data.checkedAt || !/^\d{4}-\d{2}-\d{2}$/.test(observation.date) || !observation.url.startsWith('https://')) throw new Error('Ungültige Themenerhebung');
      ids.add(observation.id); previous = observation.date;
      if (Object.values(observation.values).some(v => v !== null && (!Number.isFinite(v) || v < 0 || v > 100))) throw new Error('Ungültiger Themenanteil');
      if (observation.fieldwork && (observation.fieldwork.start > observation.fieldwork.end || observation.fieldwork.end > observation.date)) throw new Error('Ungültige Feldzeit');
    }
  }
  return data;
}
export const validateEvents = data => validateEventData(data, COUNTRIES);
validateTopics(topics); validateEvents(events);
export function contextFor(country, region) {
  return { rule: seatRule(country, region), actualSeats: actualSeatsFor(country, region), events: events.filter(e => e.country === country || e.country === 'all'), topics: { ...topics, series: topics.series.filter(s => s.country === country && (s.region === region || country === 'de' && s.region === 'bundestag')), scopeNote: country === 'de' && region !== 'bundestag' ? 'Bundesweite Themenumfrage als Kontext. Für dieses Bundesland ist keine eigene Themenreihe angebunden.' : '' } };
}
