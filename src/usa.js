import { parseCSV, rollingAverage, listPollsters } from './data.js';

export const USA_POLICY = 1;
export const USA_SOURCE = 'https://www.natesilver.net/p/generic-ballot-average-2026-nate-silver-bulletin-congress-polls';
// Public download linked by Silver Bulletin under “Every generic ballot poll”.
export const USA_POLLS_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRsvXNCZ0ubJr8D_yNcU5q6C0_HBa35K7oDK03KpO7Ca43UwdXaIdvVLWoXEmHHph0EREz5430Hm5yZ/pub?output=csv';
export const USA_PARTIES = [
  { id: 'us-dem', label: 'Demokraten', color: '#2874D0' },
  { id: 'us-rep', label: 'Republikaner', color: '#D84444' },
];
const populations = { LV: 'Wahrscheinliche Wähler (LV)', RV: 'Registrierte Wähler (RV)', A: 'Erwachsene (A)' };
const priority = { LV: 3, RV: 2, A: 1 };
const iso = date => new Date(date).toISOString().slice(0, 10);
export function usDate(value = '') {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const [, month, day, year] = match.map(Number), date = Date.UTC(year, month - 1, day);
  const parsed = new Date(date);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? date : null;
}
function percent(value = '') {
  if (!/^\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const number = Number(value);
  return number <= 100 ? number : null;
}
export function parseUSAPolls(csv, today = Date.now()) {
  const [headers = [], ...rows] = parseCSV(csv);
  const required = ['subgroup', 'pollster', 'startdate', 'enddate', 'population', 'dem', 'rep', 'poll_id', 'url'];
  if (!required.every(name => headers.includes(name))) throw new Error('USA: unbekanntes CSV-Schema');
  const polls = new Map();
  for (const row of rows) {
    const r = Object.fromEntries(headers.map((key, i) => [key, (row[i] || '').trim()]));
    const date = usDate(r.enddate), start = usDate(r.startdate), published = usDate(r.createddate);
    if (r.subgroup !== 'All polls' || !r.poll_id || !r.pollster || !priority[r.population] || date === null || start === null || start > date || date > today || published !== null && published > today) continue;
    const dem = percent(r.dem), rep = percent(r.rep);
    if (dem === null && rep === null || (dem ?? 0) + (rep ?? 0) > 100.1) continue;
    // Count each survey once, preferring LV, then RV, then adults when released together.
    const previous = polls.get(r.poll_id);
    if (previous && priority[previous.populationCode] >= priority[r.population]) continue;
    polls.set(r.poll_id, {
      id: r.poll_id, date, pollster: r.pollster, populationCode: r.population,
      population: populations[r.population], sample: /^\d+$/.test(r.samplesize) ? Number(r.samplesize) : null,
      fieldworkStart: iso(start), fieldworkEnd: iso(date),
      sourceUrl: /^https:\/\//.test(r.url) ? r.url : null,
      values: { 'us-dem': dem, 'us-rep': rep },
    });
  }
  const result = [...polls.values()].sort((a, b) => a.date - b.date || a.id.localeCompare(b.id, 'en', { numeric: true }));
  if (!result.length) throw new Error('USA: keine verwertbaren Kongressumfragen');
  return result;
}
export function buildUSAData(csv, today = Date.now()) {
  const polls = parseUSAPolls(csv, today), latest = polls.at(-1);
  return {
    usaPolicy: USA_POLICY, fetchedAt: new Date(today).toISOString(), sourceUrl: USA_SOURCE,
    dateBasis: 'fieldwork-end', parties: USA_PARTIES,
    points: rollingAverage(polls, USA_PARTIES.map(p => p.id)), approval: [], elections: [],
    pollCount: polls.length, pollsters: listPollsters(polls), latestPollDate: iso(latest.date),
    latestPoll: { ...latest, date: iso(latest.date), fieldwork: `${latest.fieldworkStart} – ${latest.fieldworkEnd}` },
    sources: [{ label: 'Silver Bulletin: öffentlicher CSV-Download', url: USA_POLLS_URL }, ...(latest.sourceUrl ? [{ label: 'Originalquelle der letzten Einzelumfrage', url: latest.sourceUrl }] : [])],
    measurementNote: `USA · Generic Congressional Ballot 2026: landesweite Wahlabsicht für demokratische oder republikanische Kongresskandidaten. Originalanteile, ohne Umrechnung auf zwei Parteien. Letzte Einzelumfrage: ${latest.population}${latest.sample ? ' · n = ' + latest.sample.toLocaleString('de-DE') : ''}.`,
    dataNote: 'Quelle: Silver Bulletin, unbereinigte Einzelumfragen (dem/rep). Eigener gleich gewichteter 7-Tage-Durchschnitt, nicht der gewichtete Silver-Bulletin-Modellwert. Je Erhebung zählt eine Version: LV vor RV vor Erwachsenen. Diese Bezugsgruppen unterscheiden sich und können den Verlauf beeinflussen. Datum: Befragungsende. Fehlende Werte bleiben offen; übrige Antworten werden nicht als Parteianteile geschätzt. Nationale Wahlabsichten lassen sich ohne Wahlkreisprognosen nicht in US-Sitze umrechnen.',
  };
}
