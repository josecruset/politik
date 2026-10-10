import test from 'node:test';
import assert from 'node:assert/strict';
import { barcelonaCSV, parseBarcelonaPoll, buildBarcelonaData, fetchBarcelonaData, BARCELONA_CONFIG, BARCELONA_SEARCH, barcelonaSurveyUrl } from '../src/barcelona.js';

// A standard deflated ZIP with a text CSV; the portal uses this download format.
const zip = Buffer.from('UEsDBBQAAAAIAByqSl0Dy6y7SAAAAGMAAAANAAAAYmFyb21ldHJlLmNzdnNxDHGMd/UL1PH0C4kP8w/RCXAN1vEN9fMEcbiMDIzMdA0NdA0sdAKCnXUMdVyDnJEFgVwdI5AUsqCfv4KHv0KwY4COOVgKAFBLAQIUAxQAAAAIAByqSl0Dy6y7SAAAAGMAAAANAAAAAAAAAAAAAACAAQAAAABiYXJvbWV0cmUuY3N2UEsFBgAAAAABAAEAOwAAAHMAAAAAAA==', 'base64');
const csv = 'DATA_ENQ,INT_VOT,PES,MUNI_VOT\n2026-10-08,PSC,1,ERC\n2026-10-08,ERC,2,PSC\n2026-10-08,NO HO SAP,7,PSC\n';
const metadata = (id = '26046', date = '2026-10-08') => ({
  code: 200,
  data: [{ id, source: 'SURVEY', license: 'CC BY 4.0', title: 'Baròmetre de Barcelona - Primera onada 2026', publishDate: date + 'T00:00:00Z' }],
  value: [{ registry: id, fieldStartDate: date + 'T00:00:00Z', fieldEndDate: date + 'T00:00:00Z', company: 'Opinòmetre, S.L.', documents: [{ name: 'Base de dades CSV (format text)', link: 'https://w10.bcn.cat/APPS/riswestudis/documentacio.do?reqCode=mostrarImatge&idDoc=21228' }] }],
});

test('Barcelona reads official ZIP CSVs and rejects invalid or oversized archives', () => {
  assert.equal(barcelonaCSV(zip), csv);
  assert.throws(() => barcelonaCSV(Buffer.from('<html>temporary source failure</html>')), /Barcelona:/);
  assert.throws(() => barcelonaCSV(zip.subarray(0, zip.length - 1)), /Barcelona:/);
  const huge = Buffer.from(zip), central = huge.indexOf(Buffer.from('504b0102', 'hex'));
  huge.writeUInt32LE(1000000000, central + 24);
  assert.throws(() => barcelonaCSV(huge), /ZIP/);
});

test('Barcelona applies respondent weights to the whole sample and uses intention, not recalled votes', () => {
  const poll = parseBarcelonaPoll(csv, metadata());
  assert.equal(poll.values['bcn-psc'], 10);
  assert.equal(poll.values['bcn-erc'], 20);
  assert.equal(poll.values['bcn-junts'], null);
  assert.equal(poll.values['bcn-undecided'], 70);
  assert.equal(poll.values['bcn-abstention'], 0);
  assert.equal(poll.values['bcn-blank'], 0);
  assert.equal(poll.values['bcn-other'], 0);
  assert.equal(poll.date, Date.UTC(2026, 9, 8));
  const aliases = 'DATA_ENQ,INT_VOT,PES\n2026-10-08,TRIAS PER BARCELONA / JUNTS,1\n2026-10-08,JUNTS,1\n2026-10-08,CUP - CAPGIREM BARCELONA,1\n2026-10-08,ABSTENCIÓ,7\n';
  const mapped = parseBarcelonaPoll(aliases, metadata());
  assert.equal(mapped.values['bcn-junts'], 20);
  assert.equal(mapped.values['bcn-cup'], 10);
  const rounded = parseBarcelonaPoll(csv.replace(',7,PSC', ',3,PSC'), metadata());
  assert.equal(rounded.values['bcn-psc'], 16.7);
});

test('Barcelona groups every remaining answer using original weights before rounding', () => {
  const full = 'DATA_ENQ,INT_VOT,PES\n2026-10-08,PSC,42.8\n2026-10-08,NO HO SAP,37.4\n2026-10-08,NO CONTESTA,7.7\n2026-10-08,ABSTENCIÓ,9.8\n2026-10-08,EN BLANC / NUL,1.6\n2026-10-08,ALTRES,0.6\n';
  const poll = parseBarcelonaPoll(full, metadata());
  assert.equal(poll.values['bcn-undecided'], 45.1);
  assert.equal(poll.values['bcn-abstention'], 9.8);
  assert.equal(poll.values['bcn-blank'], 1.6);
  assert.equal(poll.values['bcn-other'], 0.6);
  const sum = Object.values(poll.values).reduce((s, v) => s + (v ?? 0), 0);
  assert.ok(Math.abs(sum - 100) <= .2);
  const rounding = parseBarcelonaPoll('DATA_ENQ,INT_VOT,PES\n2026-10-08,PSC,97.92\n2026-10-08,NO HO SAP,1.04\n2026-10-08,NO CONTESTA,1.04\n', metadata());
  assert.equal(rounding.values['bcn-undecided'], 2.1);
  assert.equal(parseBarcelonaPoll(full.replace('EN BLANC / NUL', 'BLANC / NUL'), metadata()).values['bcn-blank'], 1.6);
});

test('Barcelona excludes known recall-only data and fails on unknown schema, answers or weights', () => {
  assert.equal(parseBarcelonaPoll(csv.replace('INT_VOT', 'OTHER'), metadata('22041')), null);
  assert.throws(() => parseBarcelonaPoll(csv.replace('INT_VOT', 'OTHER'), metadata()), /INT_VOT/);
  assert.throws(() => parseBarcelonaPoll(csv.replace(',1,ERC', ',0,ERC'), metadata()), /gewicht/i);
  assert.throws(() => parseBarcelonaPoll(csv.replace('NO HO SAP', 'NEW PARTY'), metadata()), /unbekannte Antwort/);
  assert.throws(() => parseBarcelonaPoll(csv + 'misaligned,row\n', metadata()), /Spalten/);
  assert.throws(() => parseBarcelonaPoll(csv, metadata('26046', '2026-02-31')), /metadaten/i);
});

test('Barcelona keeps raw latest values, uses equal survey weights, and preserves historical gaps', () => {
  const older = parseBarcelonaPoll(csv, metadata('25049', '2026-10-01'));
  const latest = parseBarcelonaPoll(csv.replace('PSC,1', 'PSC,11'), metadata());
  const data = buildBarcelonaData([older, latest, latest], Date.UTC(2026, 9, 10));
  assert.equal(data.pollCount, 2);
  assert.equal(data.latestPoll.values['bcn-psc'], 55);
  assert.equal(data.points.at(-1).values['bcn-psc'].value, 55); // October 1 is outside the seven-day window.
  assert.equal(data.points.at(-1).values['bcn-psc'].count, 1);
  assert.deepEqual(data.approval, []);
  assert.deepEqual(data.elections, []);
  assert.equal(data.measurement, 'direct-intention');
  assert.equal(data.latestPoll.values['bcn-undecided'], 35);
  assert.equal(data.points.at(-1).values['bcn-undecided'].value, 35);
  assert.equal(data.parties.filter(p => p.kind === 'response-group').length, 4);
  const nearby = { ...older, date: Date.UTC(2026, 9, 7) };
  assert.equal(buildBarcelonaData([nearby, latest]).points.at(-1).values['bcn-psc'].value, 32.5);
  assert.equal(buildBarcelonaData([nearby, latest]).points.at(-1).values['bcn-undecided'].value, 52.5);
  const far = { ...older, date: Date.UTC(2026, 8, 1) };
  assert.equal(buildBarcelonaData([far, latest]).points.find(p => p.date === '2026-09-08').values['bcn-psc'], null);
  assert.equal(buildBarcelonaData([older, latest], Date.UTC(2026, 9, 7)).latestPollDate, '2026-10-01');
});

test('Barcelona discovers new waves, refreshes latest and corrected data, and reuses unchanged history', async () => {
  const calls = [], docs = [metadata('25049', '2025-11-25'), metadata('26046')];
  const catalogue = () => ({ code: 200, count: 3, data: [...docs.map(m => ({ ...m.data[0], showDate: m.value[0].fieldEndDate })), { ...docs[0].data[0], id: '23039', title: 'Baròmetre de Barcelona - Primera onada 2023 - Post-Electoral', showDate: '2023-06-08T00:00:00Z' }] });
  const fetchJson = async (url, options) => {
    calls.push(url);
    if (url === BARCELONA_CONFIG) return { clientId: 'public-portal-client' };
    assert.equal(options.headers['X-IBM-Client-Id'], 'public-portal-client');
    if (url === BARCELONA_SEARCH) return catalogue();
    const doc = docs.find(m => barcelonaSurveyUrl(m.data[0].id) === url);
    assert.ok(doc); return doc;
  };
  let downloads = 0;
  const fetchBytes = async () => { downloads++; return zip; };
  const first = await fetchBarcelonaData(null, fetchJson, fetchBytes);
  assert.equal(first.pollCount, 2); assert.equal(downloads, 2);
  calls.length = 0; downloads = 0;
  const refreshed = await fetchBarcelonaData(first, fetchJson, fetchBytes);
  assert.equal(downloads, 1);
  assert.deepEqual(calls, [BARCELONA_CONFIG, BARCELONA_SEARCH, barcelonaSurveyUrl('26046')]);
  assert.deepEqual(refreshed.latestPoll, first.latestPoll);
  docs[0].data[0].publishDate = '2026-10-09T00:00:00Z';
  downloads = 0;
  await fetchBarcelonaData(first, fetchJson, fetchBytes);
  assert.equal(downloads, 2);
  downloads = 0;
  await fetchBarcelonaData({ ...first, barcelonaPolicy: 1 }, fetchJson, fetchBytes);
  assert.equal(downloads, 2); // Older caches lack the response groups and must be rebuilt.
  await assert.rejects(fetchBarcelonaData(first, async () => { throw new Error('offline'); }, fetchBytes), /offline/);
  await assert.rejects(fetchBarcelonaData(first, async url => url === BARCELONA_CONFIG ? { clientId: 'public' } : { code: 200, count: 100, data: [] }, fetchBytes), /unvollständiges/);
});
