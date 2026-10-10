import test from 'node:test';
import assert from 'node:assert/strict';
import { isoDate, parseSpainArchive, parseSpainElection, buildSpainData, fetchSpainData, SPAIN_POLLS_URL } from '../src/spain.js';
import { findArea, cacheName } from '../src/countries.js';

const parties = ['PP', 'PSOE', 'Vox', 'Sumar', 'Podemos', 'Cs', 'AP'].map(key => ({ key, short: key, color: '#123456' }));
const poll = (id, end, pp, psoe = null) => ({ id, start: end, end, pollster: 'Institut A', values: { PP: pp, PSOE: psoe }, sample: 1000 });
const archive = polls => ({ schemaVersion: 1, country: { slug: 'spain' }, quality: { datasetPublicationAllowed: true, status: 'passed' }, generatedAt: '2026-10-10T00:00:00Z', parties, polls, elections: [{ date: '2023-07-23' }, { date: null }, { date: '2027-01-01' }] });
const results = rows => ({ scope: { type: 'es' }, totals: { valid: 10000 }, results: rows, official: true, source_url: 'https://infoelectoral.interior.gob.es/' });
const today = Date.UTC(2026, 9, 10);

test('country and region validation preserves German API defaults and distinct caches', () => {
  assert.equal(findArea().region.id, 'bundestag');
  assert.equal(findArea('es').region.id, 'congreso');
  assert.equal(findArea('es', 'katalonien').region.label, 'Katalonien');
  assert.equal(findArea('de', 'katalonien'), null);
  assert.equal(findArea('de', 'bayern').region.label, 'Bayern');
  assert.equal(findArea('es', 'bayern'), null);
  assert.equal(findArea('de', 'congreso'), null);
  assert.equal(findArea('xx'), null);
  assert.equal(cacheName('de', 'bundestag'), 'polls');
  assert.equal(cacheName('de', 'bayern'), 'polls-bayern');
  assert.equal(cacheName('es', 'congreso'), 'polls-es-congreso');
  assert.equal(cacheName('es', 'katalonien'), 'polls-es-katalonien');
});

test('Spanish fieldwork dates, invalid values, future polls and duplicate identities are handled', () => {
  assert.equal(isoDate('2026-02-31'), null);
  assert.equal(isoDate(null), null);
  assert.equal(isoDate('2026-10-09'), Date.UTC(2026, 9, 9));
  const data = archive([poll('a', '2026-10-09', 0, 20), poll('a', '2026-10-09', 99), poll('b', '2026-10-11', 40), poll('c', '2026-02-31', 40), poll('d', '2026-10-08', '30'), poll('e', '2026-10-08', 101)]);
  const parsed = parseSpainArchive(data, today);
  assert.equal(parsed.polls.length, 1);
  assert.equal(parsed.polls[0].values['es-pp'], 0);
  assert.equal(parsed.polls[0].values['es-sumar'], null);
  assert.equal(parsed.parties.find(p => p.key === 'Podemos').label, 'Podemos / UP');
  assert.throws(() => parseSpainArchive({ ...data, country: { slug: 'germany' } }, today));
  assert.throws(() => parseSpainArchive({ ...data, quality: { datasetPublicationAllowed: false } }, today));
});

test('Spain uses the same unweighted seven-calendar-day average and raw latest cards', () => {
  const data = archive([poll('last-a', '2026-10-08', 30), poll('last-b', '2026-10-08', 40), poll('old', '2026-10-01', 90)]);
  data.polls[0].sample = 100000;
  const built = buildSpainData(data, [], today);
  assert.equal(built.latestPoll.values['es-pp'], 30);
  assert.equal(built.points.at(-1).values['es-pp'].value, 35);
  assert.equal(built.points.at(-1).values['es-pp'].count, 2);
  assert.equal(built.points.at(-1).values['es-sumar'], null);
  assert.deepEqual(built.approval, []);
  assert.equal(built.dateBasis, 'fieldwork-end');
});

test('historic Podemos coalitions sum votes without incorrectly relabelling them as Sumar', () => {
  const parsed = parseSpainArchive(archive([poll('a', '2026-10-09', 30)]), today);
  const result = results([
    { acronym: 'PP', votes: 3301 }, { acronym: 'PSOE', votes: 2263 },
    { acronym: 'PODEMOS-IU-EQUO', votes: 1342, family: 'sumar' }, { acronym: 'ECP', votes: 355, family: 'sumar' },
    { acronym: 'PODEMOS-COM', votes: 274 }, { acronym: 'PODEMOS-EN MAREA-ANOVA-EU', votes: 144 },
  ]);
  const election = parseSpainElection(result, '2016-06-26', parsed.parties);
  assert.equal(election.values['es-podemos'], 21.15);
  assert.equal(election.values['es-sumar'], null);
  assert.equal(election.values['es-pp'], 33.01);
  assert.match(election.candidacies['es-podemos'], /ECP/);
  const current = parseSpainElection(results([{ acronym: 'SUMAR', votes: 1233 }]), '2023-07-23', parsed.parties);
  assert.equal(current.values['es-sumar'], 12.33);
  assert.equal(current.values['es-podemos'], null);
  assert.throws(() => parseSpainElection({ ...result, scope: { type: 'prov' } }, '2016-06-26', parsed.parties));
});

test('past AP coalitions remain separate from PP; missing candidacies are not zero', () => {
  const parsed = parseSpainArchive(archive([poll('a', '2026-10-09', 30)]), today);
  const election = parseSpainElection(results([{ acronym: 'AP-PDP-PL', votes: 2597 }, { acronym: 'PSOE', votes: 4406 }]), '1986-06-22', parsed.parties);
  assert.equal(election.values['es-ap'], 25.97);
  assert.equal(election.values['es-pp'], null);
  const unrelated = parseSpainElection(results([{ acronym: 'PP', votes: 1, name: 'PARTIDO PROVERISTA' }, { acronym: 'AP-PDP', votes: 2636 }]), '1982-10-28', parsed.parties);
  assert.equal(unrelated.values['es-pp'], null);
  assert.equal(unrelated.values['es-ap'], 26.36);
});

test('Spanish refresh reuses historical election results and propagates source failures', async () => {
  const data = archive([poll('a', '2026-10-09', 30)]), calls = [];
  const fetchJson = async url => { calls.push(url); return url === SPAIN_POLLS_URL ? data : results([{ acronym: 'PP', votes: 3306 }]); };
  const first = await fetchSpainData(null, fetchJson, today);
  assert.equal(calls.length, 2);
  assert.equal(first.elections.length, 1);
  calls.length = 0;
  const second = await fetchSpainData(first, fetchJson, today);
  assert.deepEqual(calls, [SPAIN_POLLS_URL]);
  assert.deepEqual(second.elections, first.elections);
  await assert.rejects(fetchSpainData(first, async () => { throw new Error('Quelle nicht erreichbar'); }, today), /Quelle nicht erreichbar/);
});
