import test from 'node:test';
import assert from 'node:assert/strict';
import { fieldworkDate, catalanPercent, parseCataloniaTable, buildCataloniaData, fetchCataloniaData, CATALONIA_SOURCES } from '../src/catalonia.js';

const today = Date.UTC(2026, 9, 10);
const columns = [
  ["Socialists'_Party_of_Catalonia", '#FF001C'],
  ['Together_for_Catalonia_(2020)', '#00C7AE'],
  ['Comuns_Sumar', '#A61A4A'],
];
const cell = value => `<td>${value}</td>`;
const row = (institute, date, values) => `<tr>${[institute, date, '1,000', '?', ...values, '?'].map(cell).join('')}</tr>`;
const election = row('2024 regional election', '12 May 2024', [28, 21.6, 5.8]);
function table(rows, parties = columns) {
  return `<h3 id="Voting_intention_estimates">Estimates</h3><table>
    <tr><th rowspan="2">Polling firm/Commissioner</th><th rowspan="2">Fieldwork date</th><th rowspan="2">Sample size</th><th rowspan="2">Turnout</th>${parties.map(([title]) => `<th><a href="./${title}">${title}</a></th>`).join('')}<th rowspan="2">Lead</th></tr>
    <tr>${parties.map(([, color]) => `<th style="background-color:${color}"></th>`).join('')}</tr>
    ${rows}</table><h3 id="Voting_preferences">Raw preferences</h3><table>${row('Wrong table', '9 Oct 2026', [99, 99, 99])}</table>`;
}

test('Catalan fieldwork ranges use the final valid date; missing values are distinct from zero', () => {
  for (const value of ['1–9 Sep 2026', '23 Aug–9 Sep 2026', '9 Sep 2026']) assert.equal(fieldworkDate(value), Date.UTC(2026, 8, 9));
  assert.equal(fieldworkDate('27 Dec 2025–4 Jan 2026'), Date.UTC(2026, 0, 4));
  for (const value of ['31 Feb 2026', 'Unknown', 'Oct 2026']) assert.equal(fieldworkDate(value), null);
  assert.equal(catalanPercent('0'), 0);
  assert.equal(catalanPercent('21,7 %'), 21.7);
  assert.equal(catalanPercent('27–30'), 28.5);
  assert.equal(catalanPercent('26.9– 28.3'), 27.6);
  for (const value of ['?', '–', '30–27', '90–101', '40/44', '-1', '101', '']) assert.equal(catalanPercent(value), null);
});

test('HTML estimates exclude seat forecasts, footnotes and other polling sections', () => {
  const value = `<b data-mw='{"html":"<span>quoted > markup</span>"}'>21.7</b><sup>[1]</sup><br/><span style="font-size:75%">40/44</span>`;
  const html = table(election + row('Ipsos/La Vanguardia', '23 Sep–1 Oct 2026', [value, '0', '?']) + row('Future', '11 Oct 2026', [99, 99, 99]) + row('Seat forecast', '30 Sep 2026', ['<span style="font-size:75%">42</span>', '?', '?']));
  const parsed = parseCataloniaTable(html, today);
  assert.equal(parsed.polls.length, 1);
  assert.deepEqual(parsed.polls[0].values, { 'cat-psc': 21.7, 'cat-junts': 0, 'cat-comuns': null });
  assert.equal(parsed.parties[0].color, '#FF001C');
  assert.equal(parsed.elections.length, 1);
  assert.equal(parsed.polls[0].fieldwork, '23 Sep–1 Oct 2026');
});

test('rowspans preserve CIS fieldwork and only original estimates count in the average', () => {
  const cis = `<tr><td>CIS</td><td rowspan="2">1–8 Oct 2026</td><td rowspan="2">3,000</td><td rowspan="2">?</td>${[30, 10, 5, '?'].map(cell).join('')}</tr><tr><td>CIS (Logoslab)</td>${[90, 90, 90, '?'].map(cell).join('')}</tr>`;
  const built = buildCataloniaData([table(election + cis + row('Institut A', '8 Oct 2026', [40, '?', 7]))], today);
  assert.equal(built.pollCount, 2);
  assert.equal(built.latestPoll.pollster, 'CIS');
  assert.equal(built.latestPoll.values['cat-psc'], 30);
  assert.equal(built.points.at(-1).values['cat-psc'].value, 35);
  assert.equal(built.points.at(-1).values['cat-psc'].count, 2);
  assert.deepEqual(built.pollsters, ['CIS', 'Institut A']);
});

test('source overlap and reordered party columns do not double-count polls or elections', () => {
  const first = table(election + row('Institut A', '8 Oct 2026', [30, 10, 5]));
  const second = table(row('2024 regional election', '12 May 2024', [21.6, 28, 5.8]) + row('Institut A', '8 Oct 2026', [10, 30, 5]), [columns[1], columns[0], columns[2]]);
  const built = buildCataloniaData([first, second], today);
  assert.equal(built.pollCount, 1);
  assert.equal(built.elections.length, 1);
  assert.equal(built.elections[0].values['cat-psc'], 28);
  assert.equal(built.elections[0].label, 'Parlamentswahl Katalonien');
  assert.deepEqual(built.parties.map(p => p.label), ['PSC', 'Junts', 'Comuns / ECP']);
  assert.throws(() => buildCataloniaData([first, second.replace('<td>28</td>', '<td>29</td>')], today), /widersprüchliche Wahlresultate/);
});

test('seven-day windows preserve gaps, raw latest cards and regional election isolation', () => {
  const html = table(election + row('2024 European election', '9 Jun 2024', [99, 99, 99]) + row('Exit poll', '12 May 2024', [99, 99, 99]) + row('Old', '30 Sep 2026', [90, '?', '?']) + row('A', '2 Oct 2026', [20, '?', '?']) + row('B', '8 Oct 2026', [30, '?', 0]));
  const built = buildCataloniaData([html], today);
  assert.equal(built.pollCount, 4);
  assert.equal(built.latestPoll.values['cat-psc'], 30);
  assert.deepEqual(built.points.at(-1).values['cat-psc'], { value: 25, count: 2 });
  assert.equal(built.points.at(-1).values['cat-comuns'].value, 0);
  assert.equal(built.points.at(-1).values['cat-junts'], null);
  assert.equal(built.elections.length, 1);
  assert.match(built.dataNote, /Linien verbinden vorhandene Werte/);
  assert.deepEqual(built.observationDates, ['2024-05-12', '2026-09-30', '2026-10-02', '2026-10-08']);
  assert.deepEqual(built.approval, []);
  const sparse = buildCataloniaData([table(election + row('Old', '1 Sep 2026', [20, 10, 5]) + row('Latest', '1 Oct 2026', [30, 10, 5]))], today);
  assert.equal(sparse.points.find(p => p.date === '2026-09-08').values['cat-psc'], null);
});

test('percentage intervals use midpoints in averages while latest raw intervals stay available', () => {
  const built = buildCataloniaData([table(election + row('CIS', '8 Oct 2026', ['26.9–<br/>28.3', '0–2', '?']) + row('A', '7 Oct 2026', [30, 10, 5]))], today);
  assert.equal(built.latestPoll.values['cat-psc'], 27.6);
  assert.deepEqual(built.latestPoll.ranges['cat-psc'], { low: 26.9, high: 28.3 });
  assert.equal(built.points.at(-1).values['cat-psc'].value, 28.8);
  assert.equal(built.points.at(-1).values['cat-psc'].count, 2);
  assert.match(built.dataNote, /arithmetischen Mittelpunkt/);
  assert.match(built.dataNote, /Wahlabendbefragungen/);
});

test('unexpected table structure fails instead of silently shifting parties or importing raw preferences', () => {
  const html = table(election + row('A', '8 Oct 2026', [30, 10, 5]));
  assert.throws(() => parseCataloniaTable(html.replace("Socialists'_Party_of_Catalonia", 'Unknown_party'), today), /unbekannte Parteispalte/);
  assert.throws(() => parseCataloniaTable(html.replace('id="Voting_intention_estimates"', 'id="Wrong_section"'), today), /Tabelle.*fehlt/);
  assert.throws(() => parseCataloniaTable(html.replace('</h3><table>', '</h3><h3>Different section</h3><table>'), today), /Tabelle.*fehlt/);
  assert.throws(() => parseCataloniaTable(html.replace('<td>30</td><td>10</td>', '<td colspan="2">30</td>'), today), /gemeinsamer Wert/);
});

test('Catalonia fetches both historical and current estimates and propagates source failures', async () => {
  const calls = [];
  const data = await fetchCataloniaData(async url => { calls.push(url); return table(election + row('A', '8 Oct 2026', [30, 10, 5])); }, today);
  assert.deepEqual(calls, CATALONIA_SOURCES.map(s => s.url));
  assert.equal(data.pollCount, 1);
  await assert.rejects(fetchCataloniaData(async () => { throw new Error('Unavailable'); }, today), /Unavailable/);
});
