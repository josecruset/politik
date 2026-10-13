import test from 'node:test';
import assert from 'node:assert/strict';
import { apportion, projectSeats, coalition } from '../public/seat-model.js';
import { seatRule } from '../src/seat-rules.js';
import { topics, events, validateTopics, validateEvents, contextFor } from '../src/context.js';
import { REGIONS } from '../src/regions.js';
const survey = values => ({ parties: Object.keys(values).map(id => ({ id, label: id, color: '#111', ...(id.startsWith('bcn-') && ['bcn-undecided','bcn-abstention','bcn-blank','bcn-other'].includes(id) ? { kind: 'response-group' } : {}) })), latestPoll: { date: '2026-10-08', values }, points: [{ date: '2026-10-08', values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v === null ? null : { value: v, count: 1 }])) }] });

test('D’Hondt matches the official LOREG eight-seat example; Sainte-Laguë conserves seats and scale', () => {
  const votes = [168, 104, 72, 64, 40, 32].map((value, i) => ({ id: String(i), value }));
  assert.deepEqual(apportion(votes, 8, 'dhondt').rows.map(p => p.seats), [4, 2, 1, 1, 0, 0]);
  const a = apportion(votes, 630), b = apportion(votes.map(p => ({ ...p, value: p.value * 4 })), 630);
  assert.equal(a.rows.reduce((s, p) => s + p.seats, 0), 630);
  assert.deepEqual(a.rows.map(p => p.seats), b.rows.map(p => p.seats));
  assert.equal(apportion([{ id: 'a', value: 1 }, { id: 'b', value: 1 }], 1).tied, true);
  assert.throws(() => apportion([{ id: 'a', value: NaN }], 4));
});
test('thresholds are inclusive, exceptions explicit, missing values not fake zeros, coalitions deduplicate', () => {
  const data = survey({ a: 46, b: 44.9, c: 5, d: 4.1, missing: null });
  const normal = projectSeats(data, seatRule('de', 'bundestag'));
  assert.equal(normal.rows.find(p => p.id === 'c').seats > 0, true);
  assert.equal(normal.rows.find(p => p.id === 'd').seats, 0);
  assert.deepEqual(normal.missing, ['missing']);
  assert.equal(projectSeats(data, seatRule('de', 'bundestag'), 'poll', ['d']).rows.find(p => p.id === 'd').seats > 0, true);
  assert.equal(coalition(normal, ['a', 'a']).seats, normal.rows[0].seats);
  assert.equal(coalition(normal, ['a', 'b']).majority, true);
  assert.equal(coalition(normal, []).needed, 316);
  data.points[0].values.a.value = 30;
  assert.notDeepEqual(projectSeats(data, seatRule('de', 'bundestag'), 'average').rows, normal.rows);
});
test('Hare largest remainders and jurisdiction-specific majority clauses preserve the right denominator', () => {
  const data = survey({ a: 50.1, b: 24.95, c: 24.95 });
  const base = { type: 'state', seats: 3, threshold: 0, method: 'hare' };
  assert.equal(projectSeats(data, base).rows[0].seats, 1);
  assert.equal(projectSeats(data, { ...base, majorityGuarantee: true }).rows[0].seats, 2);
  const remainders = projectSeats(survey({ a: 50.01, b: 1, c: 12, d: 36.99 }), { ...base, seats: 5, majorityGuarantee: true });
  assert.deepEqual(remainders.rows.map(p => p.seats), [3, 0, 0, 2]); // Original remainders, not renormalised opposition quotas.
  const belowHalfAll = survey({ a: 49, b: 24, c: 24, small: 3 });
  const rule = { ...base, threshold: 5 };
  assert.equal(projectSeats(belowHalfAll, { ...rule, majorityGuarantee: true }).rows[0].seats, 2);
  assert.equal(projectSeats(belowHalfAll, { ...rule, majorityGuarantee: 'all' }).rows[0].seats, 1);
  const additional = projectSeats(survey({ a: 50.01, b: 49.99 }), { ...base, seats: 630, method: 'sainte-lague', majorityGuarantee: 'additional' });
  assert.equal(additional.total, 631); assert.equal(additional.rows[0].seats, 316); assert.equal(additional.majority, 316);
});
test('Barcelona response groups receive no seats; denominator/blank assumption and unidentified eligible others block', () => {
  const data = survey({ psc: 13, erc: 11.1, pp: 3.1, small: 1, 'bcn-undecided': 45.1, 'bcn-abstention': 9.8, 'bcn-blank': 1.6, 'bcn-other': .6 });
  const result = projectSeats(data, seatRule('es', 'barcelona'));
  assert.equal(result.total, 41); assert.equal(result.majority, 21);
  assert.ok(Math.abs(result.denominator - 30.4) < 1e-8);
  assert.equal(result.rows.some(p => p.kind === 'response-group'), false);
  assert.equal(result.rows.find(p => p.id === 'small').seats, 0);
  assert.equal(result.rows.reduce((s, p) => s + p.seats, 0), 41);
  data.latestPoll.values['bcn-other'] = 10;
  assert.equal(projectSeats(data, seatRule('es', 'barcelona')).status, 'gap');
  delete data.latestPoll.values['bcn-blank'];
  assert.equal(projectSeats(data, seatRule('es', 'barcelona')).status, 'gap');
});
test('Catalonia and all sixteen states use reviewed regular-seat models; Congreso has an explicit gap', () => {
  const rule = seatRule('es', 'katalonien'); assert.deepEqual(rule.districts, [85, 17, 15, 18]);
  assert.equal(projectSeats(survey({ a: 50, b: 47, c: 3 }), rule).rows.reduce((s, p) => s + p.seats, 0), 135);
  for (const region of REGIONS.filter(r => r.id !== 'bundestag')) {
    const state = seatRule('de', region.id), result = projectSeats(survey({ a: 42, b: 31, c: 22, d: 5 }), state);
    assert.equal(state.type, 'state'); assert.ok(state.sources.length);
    assert.equal(result.status, 'model'); assert.equal(result.total, state.seats);
    if (state.districts) assert.equal(state.districts.reduce((s, d) => s + d.seats, 0), state.seats);
  }
  assert.equal(projectSeats(survey({ a: 80 }), seatRule('es', 'congreso')).status, 'gap');
});
test('state rules isolate regional rounding, minority exemptions and direct-seat assumptions', () => {
  assert.equal(seatRule('de', 'niedersachsen').method, 'sainte-lague');
  assert.equal(seatRule('de', 'saarland').method, 'dhondt');
  assert.deepEqual(seatRule('de', 'bremen').districts.map(d => d.seats), [72, 15]);
  assert.equal(seatRule('de', 'sachsen').directException, 2);
  assert.equal(seatRule('de', 'brandenburg').directException, 1);
  const data = survey({ a: 50, b: 46, ssw: 4 });
  assert.ok(projectSeats(data, seatRule('de', 'schleswig-holstein')).rows.find(p => p.id === 'ssw').seats > 0);
  assert.equal(projectSeats(data, seatRule('de', 'sachsen')).rows.find(p => p.id === 'ssw').seats, 0);
  assert.ok(projectSeats(data, seatRule('de', 'sachsen'), 'poll', ['ssw']).rows.find(p => p.id === 'ssw').seats > 0);
});
test('real topic imports preserve source totals, dates, missing categories and geographically separate questions', () => {
  assert.equal(validateTopics(topics), topics);
  assert.equal(topics.series.length, 4);
  const fgw = topics.series.find(s => s.id === 'fgw'), cis = topics.series.find(s => s.id === 'cis'), ceo = topics.series.find(s => s.id === 'ceo');
  assert.equal(fgw.observations.at(-1).date, '2026-10-08');
  assert.equal(fgw.observations.at(-1).values.Wirtschaftslage, 17);
  assert.equal(cis.observations.at(-1).values['La vivienda'], 37.5); // TOTAL, not first response 19.5
  assert.equal(ceo.observations.at(-1).values["Accés a l'habitatge"], 43.5); // Q1 all respondents, not Q2 28.5
  assert.ok(fgw.observations.some(o => Object.values(o.values).includes(null)));
  assert.equal(contextFor('es', 'barcelona').topics.series[0].id, 'bcn');
  assert.equal(contextFor('de', 'bayern').topics.series[0].id, 'fgw');
  assert.match(contextFor('de', 'bayern').topics.scopeNote, /Bundesweite/);
  const invalid = structuredClone(topics); invalid.series[0].observations[0].values.bad = -1;
  assert.throws(() => validateTopics(invalid));
});
test('curated chronicle has sources, no elections, verified quotations and isolated country/region scope', () => {
  assert.equal(validateEvents(events), events); assert.ok(events.length >= 20);
  assert.equal(events.find(e => e.id.includes('ukraine') && e.date === '2022-02-24')?.category, 'crisis');
  assert.ok(contextFor('de', 'bundestag').events.every(e => ['de', 'all'].includes(e.country)));
  assert.ok(contextFor('es', 'barcelona').events.every(e => ['es', 'all'].includes(e.country)));
  const bad = structuredClone(events); bad[0].category = 'election'; assert.throws(() => validateEvents(bad));
  const quote = events.find(e => e.category === 'statement' && e.quote); assert.ok(quote.quote && quote.occasion && quote.speaker);
});
