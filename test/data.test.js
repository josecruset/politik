import test from 'node:test';
import assert from 'node:assert/strict';
import { DAY, parseCSV, parsePolls, rollingAverage, rollingApprovalAverage, parseApproval, parseElections, parseDate, percentage, buildData } from '../src/data.js';

const header = ['Datum\nPublication date', 'Institut\nPollster', '', '', 'Union\nEVP', 'AfD\nESN', 'SPD\nS&D', 'GRÜNE\nG/EFA', 'LINKE\nLINKE', 'BSW\nNI', 'FDP\nRE'];
const poll = (date, institute, union, afd = '20%') => [date, institute, '', '', union, afd, '15%', '12%', '8%', '', '4%'];

test('CSV preserves multiline headers, commas, quotes and CRLF', () => {
  assert.deepEqual(parseCSV('\uFEFF"a\nb","x,""y"""\r\n"c","d"\r\n'), [['a\nb', 'x,"y"'], ['c', 'd']]);
  assert.throws(() => parseCSV('"broken'));
});
test('calendar dates and percent values are validated, zero is a measurement', () => {
  assert.equal(parseDate('31.02.2026'), null);
  assert.equal(parseDate('08.10.2026'), Date.UTC(2026, 9, 8));
  assert.equal(percentage('4,98%'), 4.98);
  assert.equal(percentage('0%'), 0);
  assert.equal(percentage('—'), null);
  assert.equal(percentage(' -2,0'), null);
});
test('each poll has equal weight; seven calendar days, missing values excluded, gaps preserved', () => {
  const rows = [header, poll('01.01.2026', 'Forsa', '10%'), poll('01.01.2026', 'INSA', '20%'), poll('07.01.2026', 'FG Wahlen', '30%', ''), poll('08.01.2026', 'Ipsos', '40%'), poll('20.01.2026', 'INSA', '0%')];
  const points = rollingAverage(parsePolls(rows));
  assert.equal(points[6].values.union.value, 20);
  assert.equal(points[6].values.union.count, 3);
  assert.equal(points[6].values.afd.count, 2);
  assert.equal(points[7].values.union.value, 35);
  assert.equal(points[13].values.union.value, 40);
  assert.equal(points[14].values.union, null);
  assert.equal(points.at(-1).values.union.value, 0);
  assert.equal(points.at(-1).values.bsw, null);
});
test('historical headers remap parties and FG Wahlen is a pollster', () => {
  const oldHeader = [...header]; [oldHeader[4], oldHeader[5]] = [oldHeader[5], oldHeader[4]];
  const rows = [header, poll('08.01.2026', 'FG Wahlen', '30%', '20%'), oldHeader, poll('01.01.2026', 'INSA', '10%', '40%')];
  const parsed = parsePolls(rows);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].values.afd, 10);
  assert.equal(parsed[0].values.union, 40);
});
test('elections stay out of averages and repeated boundary rows yield one election marker', () => {
  const rows = [header, poll('08.01.2026', 'Bundestagswahl', '90%'), poll('08.01.2026', 'FG Wahlen', '30%'), poll('08.01.2026', 'Bundestagswahl', '89%')];
  assert.equal(parsePolls(rows).length, 1);
  assert.equal(rollingAverage(parsePolls(rows))[0].values.union.value, 30);
  assert.equal(parseElections(rows).length, 1);
  assert.equal(parseElections(rows)[0].values.union, 90);
});
test('F+G are summed, merged-date rows inherited, scale scores omitted, same-day polls preserved', () => {
  const points = parseApproval([
    ['08.10.2026', 'FG Wahlen', 'ZDF', '', 'Skala von -5 bis +5', ' -2,0', ''],
    ['', '', '', '', 'Macht seine Arbeit eher…', '18%', ''],
    ['08.10.2026', 'INSA', 'BILD', '', 'Zufriedenheit', '1%', '9%'],
    ['', '', '', '', '', '', ''],
    ['', '', '', '', 'Zufriedenheit', '99%', ''],
    ['06.10.2026', 'Forsa', 'RTL', '', 'Zufriedenheit', '', '0%'],
  ]);
  assert.deepEqual(points.map(p => p.value), [0, 18, 10]);
  assert.equal(points[1].date, '2026-10-08');
  assert.equal(points[1].pollster, 'FG Wahlen');
});
test('future dates are not included', () => {
  const today = Date.UTC(2026, 0, 1);
  assert.equal(parsePolls([header, poll('02.01.2026', 'Forsa', '40%')], today).length, 0);
  assert.equal(parseElections([header, poll('02.01.2026', 'Bundestagswahl', '40%')], today).length, 0);
});

test('approval averages sum F+G first, weight each poll equally and expire after seven calendar days', () => {
  const observations = parseApproval([
    ['20.01.2026', 'INSA', '', '', 'Zufriedenheit', '0%', ''],
    ['08.01.2026', 'Ipsos', '', '', 'Zufriedenheit', '30%', '10%'],
    ['07.01.2026', 'Forsa', '', '', 'Zufriedenheit', '20%', '10%'],
    ['01.01.2026', 'INSA', '', '', 'Zufriedenheit', '5%', '15%'],
    ['01.01.2026', 'Forsa', '', '', 'Zufriedenheit', '0%', '10%'],
  ]);
  const points = rollingApprovalAverage(observations);
  assert.deepEqual(points[0], { date: '2026-01-01', value: 15, count: 2 });
  assert.deepEqual(points[6], { date: '2026-01-07', value: 20, count: 3 });
  assert.deepEqual(points[7], { date: '2026-01-08', value: 35, count: 2 });
  assert.deepEqual(points[13], { date: '2026-01-14', value: 40, count: 1 });
  assert.deepEqual(points[14], { date: '2026-01-15', value: null, count: 0 });
  assert.deepEqual(points.at(-1), { date: '2026-01-20', value: 0, count: 1 });
  assert.deepEqual(rollingApprovalAverage([]), []);
});

test('sources include all contributing sheets, deduplicate case variants and exclude election rows', () => {
  const csv = rows => rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
  const data = buildData({
    polls: csv([header, poll('01.01.2026', 'Pollytix', '30%'), poll('02.01.2026', 'pollytix', '31%'), poll('03.01.2026', 'Bundestagswahl', '40%')]),
    government: csv([['01.01.2026', 'FG Wahlen', 'ZDF', '', 'Zufriedenheit', '20%', '10%'], ['02.01.2026', 'INSA', '', '', 'Zufriedenheit', '10%', '']]),
    chancellor: csv([['01.01.2026', 'Forsa', 'RTL', '', 'Zufriedenheit', '30%', ''], ['02.01.2026', 'Forsa', 'RTL', '', 'Zufriedenheit', '20%', '20%']]),
  });
  assert.deepEqual(data.pollsters, ['FG Wahlen', 'Forsa', 'INSA', 'Pollytix']);
  assert.deepEqual(data.approval.map(s => s.points.at(-1)), [
    { date: '2026-01-02', value: 20, count: 2 },
    { date: '2026-01-02', value: 35, count: 2 },
  ]);
  assert.ok(data.approval.every(s => s.aggregation === 'rolling-7-days'));
});

test('latest cards use one raw poll, source order breaks same-day ties, missing and zero stay distinct', () => {
  const csv = rows => rows.map(row => row.map(value => `"${value.replaceAll('"', '""')}"`).join(',')).join('\n');
  const data = buildData({
    polls: csv([header,
      poll('09.10.2026', 'Bundestagswahl', '90%'),
      poll('08.10.2026', 'Ipsos', '0%', ''),
      poll('08.10.2026', 'FG Wahlen', '21%', '28%'),
      poll('07.10.2026', 'Forsa', '19%', '26%'),
    ]),
    government: csv([['08.10.2026', 'FG Wahlen', 'ZDF', '', 'Zufriedenheit', '22%', '']]),
    chancellor: csv([['08.10.2026', 'Forsa', 'RTL', '', 'Zufriedenheit', '18%', '']]),
  });
  assert.equal(data.latestPoll.date, '2026-10-08');
  assert.equal(data.latestPoll.pollster, 'Ipsos');
  assert.equal(data.latestPoll.values.union, 0);
  assert.equal(data.latestPoll.values.afd, null);
  assert.equal(data.latestPoll.values.bsw, null);
  assert.equal(data.points.at(-1).values.union.value, 13.3333);
  assert.equal(data.points.at(-1).values.afd.value, 27);
});
