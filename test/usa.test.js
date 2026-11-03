import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUSAData, parseUSAPolls, usDate } from '../src/usa.js';
import { findArea, cacheName } from '../src/countries.js';
import { contextFor } from '../src/context.js';

const today = Date.UTC(2026, 10, 3);
const headers = 'subgroup,pollster,startdate,enddate,population,dem,rep,poll_id,url,samplesize,createddate';
const row = (id, end, dem, rep = '40', population = 'RV', extra = {}) => ({ subgroup: 'All polls', pollster: 'Institut A', startdate: end, enddate: end, population, dem, rep, poll_id: id, url: 'https://example.com/poll', samplesize: '1000', createddate: end, ...extra });
const csv = rows => headers + '\n' + rows.map(r => headers.split(',').map(k => r[k] ?? '').join(',')).join('\n');

test('USA is a separate country with valid defaults and its own cache, without a German seat rule', () => {
  assert.equal(findArea('us').region.id, 'generic-ballot');
  assert.equal(findArea('us', 'bundestag'), null);
  assert.equal(findArea('es', 'generic-ballot'), null);
  assert.equal(cacheName('us', 'generic-ballot'), 'polls-us-generic-ballot');
  const context = contextFor('us', 'generic-ballot');
  assert.equal(context.rule.type, 'gap');
  assert.match(context.rule.reason, /Wahlkreis/);
  assert.deepEqual(context.topics.series, []);
  assert.equal(context.actualSeats, null);
});
test('US dates validate real calendar days', () => {
  assert.equal(usDate('2/29/2024'), Date.UTC(2024, 1, 29));
  for (const value of ['2/29/2026', '2/31/2026', '13/1/2026', '', '2026-11-01']) assert.equal(usDate(value), null);
});
test('US parsing rejects future, invalid and subgroup rows, preserves missing and zero values', () => {
  const polls = parseUSAPolls(csv([
    row('ok', '11/1/2026', '0', ''), row('future', '11/4/2026', '50'),
    row('invalid', '2/31/2026', '50'), row('over', '11/1/2026', '90', '40'),
    row('nan', '11/1/2026', '', ''), row('subgroup', '11/1/2026', '80', '10', 'RV', { subgroup: 'Women' }),
    row('badfield', '11/1/2026', '50', '40', 'RV', { startdate: '11/2/2026' }),
    row('futurePublication', '11/1/2026', '50', '40', 'RV', { createddate: '11/4/2026' }),
  ]), today);
  assert.equal(polls.length, 1);
  assert.deepEqual(polls[0].values, { 'us-dem': 0, 'us-rep': null });
  assert.throws(() => parseUSAPolls('<html>Unavailable</html>', today), /Schema/);
  assert.throws(() => parseUSAPolls(headers, today), /keine verwertbaren/);
});
test('one survey counts once, preferring likely over registered over adult voter versions', () => {
  const polls = parseUSAPolls(csv([
    row('same', '11/1/2026', '41', '40', 'RV'), row('same', '11/1/2026', '51', '40', 'LV'),
    row('same', '11/1/2026', '31', '40', 'A'), row('other', '11/1/2026', '49', '40', 'RV'),
  ]), today);
  assert.equal(polls.length, 2);
  assert.equal(polls.find(p => p.id === 'same').values['us-dem'], 51);
  assert.match(polls.find(p => p.id === 'same').population, /Wahrscheinliche/);
});
test('US cards retain raw latest survey, averages use seven calendar days with equal weights', () => {
  const data = buildUSAData(csv([
    row('old', '10/25/2026', '70', '25'), row('a', '10/26/2026', '40', '45'),
    row('latest', '11/1/2026', '50', '', 'LV', { samplesize: '100000' }),
  ]), today);
  assert.equal(data.latestPoll.values['us-dem'], 50);
  assert.equal(data.latestPoll.values['us-rep'], null);
  assert.equal(data.points.at(-1).values['us-dem'].value, 45);
  assert.equal(data.points.at(-1).values['us-dem'].count, 2);
  assert.equal(data.points.at(-1).values['us-rep'].value, 45);
  assert.equal(data.pollCount, 3);
  assert.equal(data.latestPollDate, '2026-11-01');
  assert.equal(data.fetchedAt, new Date(today).toISOString());
  assert.deepEqual(data.elections, []);
});
