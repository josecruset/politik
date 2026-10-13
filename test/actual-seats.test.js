import test from 'node:test';
import assert from 'node:assert/strict';
import { actualSeats, actualSeatsFor, validateActualSeats } from '../src/actual-seats.js';
import { COUNTRIES } from '../src/countries.js';
import { contextFor } from '../src/context.js';
import { currentSeats, coalition, projectSeats } from '../public/seat-model.js';
import { seatRule } from '../src/seat-rules.js';
const today = '2026-10-13';

test('every selectable area has a sourced complete composition in its own context', () => {
  const areas = COUNTRIES.flatMap(c => c.regions.map(r => `${c.id}:${r.id}`));
  assert.deepEqual(actualSeats.map(s => `${s.country}:${s.region}`).sort(), areas.sort());
  for (const s of actualSeats) {
    assert.equal(validateActualSeats([s])[0], s);
    assert.equal(contextFor(s.country, s.region).actualSeats, s);
    const result = currentSeats(s, today);
    assert.equal(result.status, 'actual');
    assert.equal(result.rows.reduce((n, p) => n + p.seats, 0), s.total);
    assert.equal(result.majority, Math.floor(s.total / 2) + 1);
    assert.equal(result.stale, false);
  }
  assert.equal(actualSeatsFor('es', 'bayern'), null);
});
test('actual mandates retain extra seats, small parties and unaffiliated members, without poll allocation', () => {
  const bund = currentSeats(actualSeatsFor('de', 'bundestag'), today);
  assert.equal(bund.rows.find(p => p.id === 'actual-afd').seats, 150);
  assert.equal(bund.rows.find(p => p.id === 'actual-fraktionslos').seats, 3);
  assert.deepEqual(coalition(bund, ['actual-union', 'actual-spd', 'actual-spd']), {seats:328, majority:true, needed:0});
  assert.deepEqual(coalition(bund, ['actual-union']), {seats:208, majority:false, needed:108});
  assert.equal(currentSeats(actualSeatsFor('de', 'baden-wuerttemberg'), today).total, 157);
  assert.equal(currentSeats(actualSeatsFor('de', 'rheinland-pfalz'), today).total, 105);
  assert.equal(currentSeats(actualSeatsFor('de', 'schleswig-holstein'), today).rows.find(p => p.id === 'actual-ssw').seats, 4);
  assert.equal(currentSeats(actualSeatsFor('de', 'thueringen'), today).rows.find(p => p.id === 'actual-tg').seats, 10);
});
test('Spain real compositions work independently of model data gaps and Barcelona response denominators', () => {
  assert.equal(projectSeats({}, seatRule('es', 'congreso')).status, 'gap');
  const congress = actualSeatsFor('es', 'congreso');
  assert.equal(congress.historical, true); assert.equal(congress.asOf, '2026-10-01');
  assert.match(congress.note, /06\.10\.2026 aufgelöst/);
  assert.equal(currentSeats(congress, today).total, 350);
  assert.equal(currentSeats(actualSeatsFor('es', 'katalonien'), today).total, 135);
  const bcn = currentSeats(actualSeatsFor('es', 'barcelona'), today);
  assert.equal(bcn.total, 41); assert.equal(bcn.majority, 21);
  assert.equal(bcn.rows.some(p => p.id.includes('undecided')), false);
  assert.deepEqual(coalition(bcn, ['actual-psc', 'actual-junts']), {seats:21, majority:true, needed:0});
  assert.match(actualSeatsFor('de', 'saarland').qualification, /Wahlverteilung 2022/);
  assert.deepEqual(actualSeatsFor('de', 'saarland').rows.map(p => p.seats), [29,19,3]);
});
test('known legislative transitions expire compositions, while old verification is visibly flagged', () => {
  for (const [country,region,last,next] of [
    ['de','berlin','2026-10-28','2026-10-29'],
    ['de','mecklenburg-vorpommern','2026-10-19','2026-10-20'],
    ['es','congreso','2026-12-22','2026-12-23']
  ]) {
    const s = actualSeatsFor(country,region);
    assert.equal(currentSeats(s,last).status,'actual');
    assert.equal(currentSeats(s,next).status,'gap');
  }
  const s = actualSeatsFor('de','bundestag');
  assert.equal(currentSeats(s,'2026-10-12').status,'gap');
  assert.equal(currentSeats(s,'2026-11-12').stale,false);
  assert.equal(currentSeats(s,'2026-11-13').stale,true);
  const copy = currentSeats(s,today); copy.rows[0].seats=1;
  assert.equal(s.rows[0].seats,150);
});
test('invalid composition dates, totals, duplicates, areas and sources are rejected before serving', () => {
  const s = actualSeatsFor('de','bundestag');
  for (const mutate of [
    c => c.total++, c => c.rows[0].seats=-1, c => c.rows[0].seats=1.5,
    c => c.rows[1].id=c.rows[0].id, c => c.region='barcelona',
    c => c.checkedAt='2026-02-30', c => c.validFrom='2026-10-14',
    c => c.validUntil='2026-10-12', c => c.asOf='2026-10-14',
    c => c.sources[0].url='javascript:alert(1)', c => c.rows[0].color='red',
    c => {c.historical=true;delete c.asOf;}
  ]) {
    const copy=structuredClone(s); mutate(copy); assert.throws(()=>validateActualSeats([copy]));
  }
  assert.throws(()=>validateActualSeats([s,s])); assert.throws(()=>validateActualSeats({}));
  assert.equal(currentSeats(null,today).status,'gap');
  assert.equal(currentSeats({...s,total:631},today).status,'gap');
  assert.equal(currentSeats({...s,rows:[s.rows[0],s.rows[0]]},today).status,'gap');
});
