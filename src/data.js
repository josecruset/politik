export const SOURCE_ID = '1aT2f8yc8p9-XjOqFCTQ1nDeP5GEORu9QZDOtUwF8smI';
export const DAY = 86400000;
// Effective background colours from the conditional formatting of row 9.
export const PARTIES = [
  { id: 'afd', label: 'AfD', header: 'AFD', color: '#009EE0' },
  { id: 'union', label: 'Union', header: 'UNION', color: '#005974' },
  { id: 'spd', label: 'SPD', header: 'SPD', color: '#E3000F' },
  { id: 'gruene', label: 'Grüne', header: 'GRÜNE', color: '#008939' },
  { id: 'linke', label: 'Linke', header: 'LINKE', color: '#B61C3E' },
  { id: 'bsw', label: 'BSW', header: 'BSW', color: '#792351' },
  { id: 'fdp', label: 'FDP', header: 'FDP', color: '#FFE209' },
];
export const SHEETS = { polls: '2003908598', government: '1264011241', chancellor: '667187835' };

export function parseCSV(text) {
  const rows = []; let row = [], value = '', quoted = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++; }
      else quoted = !quoted;
    } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
      row.push(value); value = '';
      if (c !== ',') { rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else value += c;
  }
  if (quoted) throw new Error('Unvollständiger CSV-Export');
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

export function parseDate(value = '') {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value.trim());
  if (!m) return null;
  const date = Date.UTC(+m[3], +m[2] - 1, +m[1]);
  const d = new Date(date);
  return d.getUTCDate() === +m[1] && d.getUTCMonth() === +m[2] - 1 ? date : null;
}
export function percentage(value = '') {
  // Require a percent sign: ratings on a -5..+5 scale are not percentages.
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*%\s*$/.exec(value);
  if (!m) return null;
  const number = Number(m[1].replace(',', '.'));
  return number >= 0 && number <= 100 ? number : null;
}
const iso = time => new Date(time).toISOString().slice(0, 10);
const validPollster = name => Boolean(name?.trim()) && !/^(Bundestagswahl|Europawahl|Landtagswahl)$|durchschnitt|institut|ergebnis|^[—―–-]+$/i.test(name.trim());

export function parsePolls(rows, today = Date.now()) {
  let mapping = null; const polls = [];
  for (const row of rows) {
    if (/Institut\s*\n?\s*Pollster/i.test(row[1] || '')) {
      mapping = Object.fromEntries(PARTIES.map(p => [p.id, row.findIndex(cell => cell?.split('\n')[0].trim().toUpperCase() === p.header)]));
      continue;
    }
    const date = parseDate(row[0]);
    if (!mapping || date === null || date > today || !validPollster(row[1])) continue;
    const values = Object.fromEntries(PARTIES.map(p => [p.id, percentage(row[mapping[p.id]])]));
    if (Object.values(values).some(v => v !== null)) polls.push({ date, pollster: row[1], values });
  }
  return polls.sort((a, b) => a.date - b.date);
}

export function parseElections(rows, today = Date.now()) {
  let mapping = null; const points = [], seen = new Set();
  for (const row of rows) {
    if (/Institut\s*\n?\s*Pollster/i.test(row[1] || '')) {
      mapping = Object.fromEntries(PARTIES.map(p => [p.id, row.findIndex(cell => cell?.split('\n')[0].trim().toUpperCase() === p.header)]));
      continue;
    }
    const date = parseDate(row[0]);
    if (!mapping || date === null || date > today || row[1]?.trim() !== 'Bundestagswahl' || seen.has(date)) continue;
    seen.add(date);
    points.push({ date: iso(date), values: Object.fromEntries(PARTIES.map(p => [p.id, percentage(row[mapping[p.id]])])) });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export function rollingAverage(polls) {
  if (!polls.length) throw new Error('Keine verwertbaren Bundestagsumfragen');
  const points = []; let left = 0, right = 0;
  const sums = Object.fromEntries(PARTIES.map(p => [p.id, 0]));
  const counts = { ...sums };
  function update(poll, direction) {
    for (const p of PARTIES) {
      const value = poll.values[p.id];
      if (value !== null && value !== undefined) { sums[p.id] += direction * value; counts[p.id] += direction; }
    }
  }
  for (let date = polls[0].date; date <= polls.at(-1).date; date += DAY) {
    while (right < polls.length && polls[right].date <= date) update(polls[right++], 1);
    while (left < right && polls[left].date < date - 6 * DAY) update(polls[left++], -1);
    points.push({ date: iso(date), values: Object.fromEntries(PARTIES.map(p => [p.id,
      counts[p.id] ? { value: Number((sums[p.id] / counts[p.id]).toFixed(4)), count: counts[p.id] } : null])) });
  }
  return points;
}

export function parseApproval(rows, today = Date.now()) {
  let date = null, pollster = '', client = ''; const points = [];
  for (const row of rows) {
    const ownDate = parseDate(row[0]);
    if (ownDate !== null) { date = ownDate; pollster = row[1]; client = row[2]; }
    else if (row[0]?.trim() || !row[4]?.trim()) { date = null; continue; }
    if (date === null || date > today || !validPollster(pollster) || /Skala/i.test(row[4] || '')) continue;
    const f = percentage(row[5]), g = percentage(row[6]);
    if (f === null && g === null) continue;
    const value = (f ?? 0) + (g ?? 0);
    if (value <= 100) points.push({ date: iso(date), value, pollster, client, question: row[4] });
  }
  // Preserve every poll, including several polls on the same date; never average.
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export function listPollsters(...collections) {
  const names = new Map();
  for (const point of collections.flat()) {
    const name = point.pollster.trim().replace(/\s+/g, ' ');
    const key = name.toLocaleLowerCase('de-DE');
    if (!names.has(key)) names.set(key, name);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, 'de'));
}

export function buildData(csv, today = Date.now()) {
  const pollRows = parseCSV(csv.polls);
  const polls = parsePolls(pollRows, today);
  const elections = parseElections(pollRows, today);
  const government = parseApproval(parseCSV(csv.government), today);
  const chancellor = parseApproval(parseCSV(csv.chancellor), today);
  if (!government.length || !chancellor.length) throw new Error('Zufriedenheitswerte fehlen im Export');
  const points = rollingAverage(polls);
  return {
    fetchedAt: new Date().toISOString(), sourceUrl: `https://docs.google.com/spreadsheets/d/${SOURCE_ID}/htmlview`,
    parties: PARTIES.map(({ header, ...p }) => p), points, elections,
    pollCount: polls.length, latestPollDate: iso(polls.at(-1).date),
    pollsters: listPollsters(polls, government, chancellor),
    approval: [
      { id: 'government', label: 'Zufriedenheit Regierung', color: '#626B80', points: government },
      { id: 'chancellor', label: 'Zufriedenheit Bundeskanzler', color: '#D47730', points: chancellor },
    ],
  };
}
