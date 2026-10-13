import test from 'node:test';
import assert from 'node:assert/strict';
import { filterEvents, clusterEvents, validateEventData } from '../public/event-data.js';
import { COUNTRIES } from '../src/countries.js';
import { events } from '../src/context.js';

const event = (id, extra = {}) => ({ id, country: 'de', regions: ['all'], date: '2024-01-01', category: 'decision', title: id, description: 'Belegter Beschluss', source: { title: 'Originalbeleg', url: 'https://example.org/beleg' }, verifiedAt: '2026-10-13', ...extra });
const validate = data => validateEventData(data, COUNTRIES, '2026-10-13');

test('published coverage contains dedicated entries for every state and Spanish area, with both statement formats', () => {
  for (const country of COUNTRIES) for (const region of country.regions.filter(r => !['bundestag', 'congreso'].includes(r.id))) {
    assert.ok(events.some(e => e.country === country.id && e.regions.includes(region.id)), `Eigene Ereignisse fehlen: ${region.id}`);
  }
  assert.ok(events.some(e => e.statementFormat === 'summary' && !Object.hasOwn(e, 'quote')));
  assert.ok(events.some(e => e.category === 'statement' && e.quote));
  const identities = events.map(e => `${e.country}:${e.date}:${e.title}`);
  assert.equal(new Set(identities).size, events.length);
});

test('chronicle rejects impossible/future dates, mismatched geography and unsafe or incomplete sources', () => {
  assert.equal(validate([event('valid', { endDate: '2024-01-02' })]).length, 1);
  for (const change of [{ date: '2024-02-30' }, { verifiedAt: '2026-10-14' }, { date: '2026-10-14' }, { endDate: '2023-12-31' }, { endDate: '2026-10-14' }, { country: 'xx' }, { regions: ['katalonien'] }, { regions: ['berlin', 'berlin'] }, { country: 'all', regions: ['berlin'] }, { title: '' }, { source: { title: 'Beleg', url: 'javascript:alert(1)' } }, { source: { title: '', url: 'https://example.org' } }]) assert.throws(() => validate([event('invalid', change)]));
  assert.throws(() => validate([event('same'), event('same')]));
});

test('verified original quotations and explicitly labelled summaries have distinct contracts', () => {
  const statement = event('speech', { category: 'statement', speaker: 'Person', occasion: 'Regierungserklärung' });
  assert.throws(() => validate([statement]));
  assert.equal(validate([{ ...statement, quote: 'Originalwortlaut' }]).length, 1);
  assert.equal(validate([{ ...statement, statementFormat: 'summary' }]).length, 1);
  assert.throws(() => validate([{ ...statement, statementFormat: 'summary', quote: 'Erfundene wörtliche Rede' }]));
  assert.throws(() => validate([{ ...statement, statementFormat: 'summary', occasion: '' }]));
  assert.throws(() => validate([event('decision-with-quote', { quote: 'Originalwortlaut' })]));
});

test('default regional filtering includes national/international context and excludes other countries and states', () => {
  const input = [event('de'), event('berlin', { regions: ['berlin'] }), event('thueringen', { regions: ['thueringen'] }), event('both', { regions: ['bundestag', 'berlin'] }), event('global', { country: 'all' }), event('es', { country: 'es' })];
  const ids = options => filterEvents(input, { country: 'de', region: 'berlin', ...options }).map(e => e.id);
  assert.deepEqual(ids({}), ['berlin', 'both', 'de', 'global']);
  assert.deepEqual(ids({ region: 'bundestag' }), ['both', 'de', 'global']);
  assert.deepEqual(ids({ filterRegion: 'all' }), ['berlin', 'both', 'de', 'global', 'thueringen']);
  assert.deepEqual(ids({ filterRegion: 'thueringen' }), ['de', 'global', 'thueringen']);
});

test('list and marker inputs use the whole poll interval with inclusive dates and the same category selection', () => {
  const input = [event('old', { date: '2018-01-01' }), event('start', { date: '2020-01-01' }), event('crisis', { date: '2024-01-01', category: 'crisis' }), event('end', { date: '2026-01-01' }), event('later', { date: '2026-02-01' })];
  const options = { country: 'de', region: 'bundestag', start: '2020-01-01', end: '2026-01-01' };
  assert.deepEqual(filterEvents(input, options).map(e => e.id), ['start', 'crisis', 'end']);
  assert.deepEqual(filterEvents(input, { ...options, category: 'crisis' }).map(e => e.id), ['crisis']);
  assert.equal(filterEvents(input, { ...options, category: 'government' }).length, 0);
});

test('dense markers cluster across bin boundaries, preserve every event and stay separated', () => {
  const input = [23, 25, 46, 47, 49, 90, -1, 101].map((days, i) => event(String(i), { date: new Date(Date.UTC(2024, 0, 1 + days)).toISOString().slice(0, 10) }));
  const view = { start: Date.UTC(2024, 0, 1), width: 100, scale: 1 };
  const groups = clusterEvents(input.reverse(), view);
  assert.deepEqual(groups.map(g => g.map(p => p.position)), [[23, 25, 46], [47, 49], [90]]);
  assert.equal(groups.flat().length, 6);
  assert.ok(groups.slice(1).every((g, i) => g[0].position - groups[i][0].position >= 24));
  assert.deepEqual(clusterEvents(input, { ...view, scale: 0 }), []);
  assert.deepEqual(clusterEvents([event('first'), event('last', { date: '2024-04-10' })], view).flat().map(p => p.position), [0, 100]);
});
