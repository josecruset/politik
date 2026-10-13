// node scripts/event-coverage.js [baseline-events.json] [poll-bounds.json]
// No downloads or automatic curation. Optional bounds: [{country, region, start, end}].
import { readFile } from 'node:fs/promises';
import { COUNTRIES, cacheName } from '../src/countries.js';
import { events } from '../src/context.js';
import { filterEvents } from '../public/event-data.js';

const json = async path => JSON.parse(await readFile(path, 'utf8'));
const before = process.argv[2] ? await json(process.argv[2]) : null;
const bounds = process.argv[3] ? await json(process.argv[3]) : null;
const countBy = key => Object.fromEntries([...new Set(events.map(key))].sort().map(value => [value, events.filter(e => key(e) === value).length]));
const areas = [];
for (const country of COUNTRIES) for (const region of country.regions) {
  let span = bounds?.find(b => b.country === country.id && b.region === region.id);
  if (!bounds) {
    try {
      const poll = await json(new URL(`../data/${cacheName(country.id, region.id)}.json`, import.meta.url));
      if (poll.points?.length) span = { start: poll.points[0].date, end: poll.points.at(-1).date };
    } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const scope = { country: country.id, region: region.id };
  const scoped = filterEvents(events, scope);
  const visible = span ? filterEvents(events, { ...scope, start: span.start, end: span.end }) : null;
  areas.push({ ...scope, label: region.label, start: span?.start ?? null, end: span?.end ?? null,
    before: before && span ? filterEvents(before, { ...scope, start: span.start, end: span.end }).length : null,
    visible: visible?.length ?? null, outside: visible ? scoped.length - visible.length : null,
    own: (visible || scoped).filter(e => e.regions.includes(region.id) && !e.regions.includes('all')).length,
    scoped: scoped.length });
}
console.log(JSON.stringify({ total: events.length, byYear: countBy(e => e.date.slice(0, 4)), byCategory: countBy(e => e.category), byCountry: countBy(e => e.country), areas }, null, 2));
