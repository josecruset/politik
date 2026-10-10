import { rollingAverage, listPollsters } from './data.js';

export const SPAIN_POLLS_URL = 'https://bismuthmedia.net/api/v1/countries/spain';
export const SPAIN_RESULTS_URL = 'https://generales29n.com/datos-historicos/';
export const SPAIN_POLICY = 2;
const iso = time => new Date(time).toISOString().slice(0, 10);
const percent = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;

export function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) && iso(time) === value ? time : null;
}

export function parseSpainArchive(archive, today = Date.now()) {
  if (archive?.schemaVersion !== 1 || archive.country?.slug !== 'spain' || !Array.isArray(archive.parties) || !Array.isArray(archive.polls)
      || archive.quality?.datasetPublicationAllowed !== true || archive.quality?.status !== 'passed') throw new Error('Spanien-Archiv ist nicht validiert oder hat ein unbekanntes Format');
  const labels = { Podemos: 'Podemos / UP', AP: 'AP / CD', Cs: 'Ciudadanos' };
  const parties = archive.parties.map(p => {
    if (typeof p.key !== 'string' || !/^[A-Za-z0-9 -]+$/.test(p.key) || !/^#[0-9a-f]{6}$/i.test(p.color)) throw new Error('Ungültige Parteidefinition im Spanien-Archiv');
    return { id: `es-${p.key.toLowerCase().replaceAll(' ', '-')}`, key: p.key, label: labels[p.key] || p.short || p.key, color: p.color };
  });
  if (new Set(parties.map(p => p.id)).size !== parties.length || !parties.some(p => p.key === 'PP') || !parties.some(p => p.key === 'PSOE')) throw new Error('Parteien fehlen im Spanien-Archiv');
  const seen = new Set(), polls = [];
  for (const p of archive.polls) {
    const date = isoDate(p.end), first = isoDate(p.start);
    if (date === null || first === null || first > date || date > today || typeof p.pollster !== 'string' || !p.pollster.trim() || !p.values || typeof p.id !== 'string') continue;
    if (seen.has(p.id)) continue;
    const values = Object.fromEntries(parties.map(party => [party.id, percent(p.values[party.key])]));
    if (!Object.values(values).some(v => v !== null)) continue;
    seen.add(p.id);
    polls.push({ date, pollster: p.pollster.trim(), values, id: p.id, fieldworkStart: p.start, fieldworkEnd: p.end });
  }
  if (!polls.length) throw new Error('Keine verwertbaren nationalen Spanien-Umfragen');
  polls.sort((a, b) => a.date - b.date);
  return { parties, polls };
}

function electionParty(acronym, date) {
  const name = acronym.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[. '’]/g, '');
  // Before the 1989 renaming, "PP" can mean the unrelated Partido Proverista.
  if (name === 'PP' && date >= '1989-01-01') return 'PP';
  if (name === 'PSOE' || name.startsWith('PSOE-PROGR')) return 'PSOE';
  if (name === 'VOX') return 'Vox';
  if (date >= '2023-07-23' && name.startsWith('SUMAR')) return 'Sumar';
  // Do not use the source's editorial "sumar" family for earlier elections:
  // those candidacies belonged to Podemos/UP, not the later Sumar coalition.
  if (date < '2023-07-23' && /^(PODEMOS|ECP|ENCOMU|ENMAREA)/.test(name)) return 'Podemos';
  if (name === 'CS') return 'Cs';
  if (/^IU(?:-|$)/.test(name)) return 'IU';
  if (name === 'UCD') return 'UCD';
  if (/^AP(?:-|$)/.test(name) || name === 'CD' || name === 'CP') return 'AP';
  if (name === 'PCE') return 'PCE';
  if (name === 'CDS') return 'CDS';
  if (/^PSP(?:-|$)/.test(name)) return 'PSP';
  return null;
}

export function parseSpainElection(result, date, parties) {
  if (isoDate(date) === null || result?.scope?.type !== 'es' || !Array.isArray(result.results) || !Number.isSafeInteger(result.totals?.valid) || result.totals.valid <= 0) throw new Error(`Ungültiges Wahlergebnis für ${date}`);
  const votes = new Map(), names = new Map();
  for (const row of result.results) {
    if (typeof row.acronym !== 'string' || !Number.isSafeInteger(row.votes) || row.votes < 0 || row.votes > result.totals.valid) throw new Error(`Ungültige Stimmenzahl für ${date}`);
    const key = electionParty(row.acronym, date);
    if (!key) continue;
    votes.set(key, (votes.get(key) || 0) + row.votes);
    names.set(key, [...(names.get(key) || []), row.acronym]);
  }
  const values = Object.fromEntries(parties.map(p => [p.id, votes.has(p.key) ? Number((votes.get(p.key) / result.totals.valid * 100).toFixed(2)) : null]));
  if (!Object.values(values).some(v => v !== null) || Object.values(values).some(v => v > 100)) throw new Error(`Keine passenden Parteiergebnisse für ${date}`);
  return { date, label: 'Parlamentswahl (Congreso)', values, candidacies: Object.fromEntries(parties.filter(p => names.has(p.key)).map(p => [p.id, names.get(p.key).join(' + ')])), sourceUrl: result.source_url, official: result.official === true };
}

export function buildSpainData(archive, elections, today = Date.now()) {
  const { parties, polls } = parseSpainArchive(archive, today);
  const latestPoll = polls.find(p => p.date === polls.at(-1).date);
  return {
    spainPolicy: SPAIN_POLICY, fetchedAt: new Date().toISOString(), sourcePublishedAt: archive.generatedAt,
    sourceUrl: 'https://bismuthmedia.net/country/spain', dateBasis: 'fieldwork-end',
    dataNote: 'Spanien: Die Zeitachse verwendet das Ende des Befragungszeitraums. Historische Wahlbündnisse werden gemäß der Quelle geführt, insbesondere Podemos / UP und AP / CD. Fehlende Werte bedeuten nicht null Prozent.',
    sources: [
      { label: 'Umfragen: Bismuth Media', url: 'https://bismuthmedia.net/country/spain' },
      { label: 'Wikipedia-Autorinnen und -Autoren · Quelltabellen', url: 'https://en.wikipedia.org/wiki/Opinion_polling_for_Spanish_general_elections' },
      { label: 'Umfragedaten: CC BY-SA 4.0 · eigener 7-Tage-Durchschnitt', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
      { label: 'Wahlergebnisse: Ministerio del Interior, via Elecciones 29N', url: SPAIN_RESULTS_URL },
    ],
    parties: parties.map(({ key, ...p }) => p), points: rollingAverage(polls, parties.map(p => p.id)),
    elections: elections.filter(e => isoDate(e.date) !== null && isoDate(e.date) <= today).sort((a, b) => a.date.localeCompare(b.date)),
    pollCount: polls.length, latestPollDate: iso(latestPoll.date),
    latestPoll: { date: iso(latestPoll.date), pollster: latestPoll.pollster, values: latestPoll.values, fieldworkStart: latestPoll.fieldworkStart, fieldworkEnd: latestPoll.fieldworkEnd },
    pollsters: listPollsters(polls), approval: [],
  };
}

export async function fetchSpainData(previous, fetchJson, today = Date.now()) {
  const archive = await fetchJson(SPAIN_POLLS_URL);
  const { parties } = parseSpainArchive(archive, today);
  const previousElections = new Map((previous?.spainPolicy === SPAIN_POLICY ? previous.elections : [])?.map(e => [e.date, e]) || []);
  const dates = [...new Set((archive.elections || []).map(e => e.date).filter(date => isoDate(date) !== null && isoDate(date) <= today))];
  // Historical results are immutable and persist with the country cache.
  const elections = await Promise.all(dates.map(async date => {
    if (previousElections.has(date)) return previousElections.get(date);
    const result = await fetchJson(`https://datos.generales29n.com/v1/hist/congreso-${date.slice(0, 7)}/es.json`);
    return parseSpainElection(result, date, parties);
  }));
  if (!elections.length) throw new Error('Spanische Wahlergebnisse fehlen');
  return buildSpainData(archive, elections, today);
}
