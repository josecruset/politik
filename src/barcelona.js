import { inflateRawSync } from 'node:zlib';
import { parseCSV, rollingAverage, listPollsters } from './data.js';
import { isoDate } from './spain.js';

export const BARCELONA_POLICY = 2;
export const BARCELONA_PORTAL = 'https://portaldades.ajuntament.barcelona.cat';
export const BARCELONA_CONFIG = `${BARCELONA_PORTAL}/portal/config/apimanagerconsumercredentials.json`;
export const BARCELONA_SEARCH = `${BARCELONA_PORTAL}/services/backend/rest/search?${new URLSearchParams({ query: 'Baròmetre de Barcelona', source: 'SURVEY', language: 'ca', start: '0', rows: '100' })}`;
export const barcelonaSurveyUrl = id => `${BARCELONA_PORTAL}/services/backend/rest/survey?${new URLSearchParams({ id, language: 'ca' })}`;
const iso = time => new Date(time).toISOString().slice(0, 10);
const definitions = [
  ['psc', 'PSC', '#FF001C', ['PSC']],
  ['junts', 'Junts', '#00C7AE', ['JUNTS', 'TRIAS PER BARCELONA / JUNTS']],
  ['erc', 'ERC', '#FFB232', ['ERC']],
  ['comu', 'Barcelona en Comú', '#A61A4A', ['BARCELONA EN COMÚ']],
  ['pp', 'PP', '#1D84CE', ['PP']],
  ['vox', 'Vox', '#63BE21', ['VOX']],
  ['cup', 'CUP', '#FFDD00', ['CUP', 'CUP - CAPGIREM BARCELONA']],
  ['alianca', 'Aliança Catalana', '#064A81', ['ALIANÇA CATALANA']],
  ['cs', 'Ciudadanos', '#EB6109', ['CIUTADANS']],
  ['pdecat', 'PDeCAT', '#0263AC', ['PDECAT']],
  ['canvi', 'Barcelona pel Canvi', '#05115B', ['BARCELONA PEL CANVI', 'BCN CANVI']],
];
const normalize = value => value.trim().replace(/\s+/g, ' ').toUpperCase();
const partyIds = new Map(definitions.flatMap(([id, , , names]) => names.map(name => [name, `bcn-${id}`])));
const responseGroups = [
  ['undecided', 'Unentschlossen / keine Antwort', '#78889E', ['NO HO SAP', 'NO CONTESTA']],
  ['abstention', 'Nichtwähler', '#A17C56', ['ABSTENCIÓ']],
  ['blank', 'Leer / ungültig', '#B28AA6', ['BLANC / NUL', 'EN BLANC / NUL']],
  ['other', 'Andere Parteien', '#899C94', ['ALTRES']],
];
const answerIds = new Map([...partyIds, ...responseGroups.flatMap(([id, , , answers]) => answers.map(answer => [answer, `bcn-${id}`]))]);

// The official CSV downloads are ZIPs. Read the single CSV in memory, without
// extracting paths to disk. Central-directory sizes also handle data descriptors.
export function barcelonaCSV(bytes) {
  const zip = Buffer.from(bytes), maximum = 8 * 1024 * 1024;
  if (zip.length > maximum || zip.length < 22) throw new Error('Barcelona: ungültiges CSV-Archiv');
  let end = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50 && i + 22 + zip.readUInt16LE(i + 20) === zip.length) { end = i; break; }
  }
  if (end < 0 || zip.readUInt16LE(end + 10) !== 1) throw new Error('Barcelona: genau eine CSV-Datei erwartet');
  const directory = zip.readUInt32LE(end + 16);
  if (directory + 46 > end || zip.readUInt32LE(directory) !== 0x02014b50) throw new Error('Barcelona: ZIP-Verzeichnis fehlt');
  const method = zip.readUInt16LE(directory + 10), compressed = zip.readUInt32LE(directory + 20), size = zip.readUInt32LE(directory + 24);
  const filenameLength = zip.readUInt16LE(directory + 28), offset = zip.readUInt32LE(directory + 42);
  if (directory + 46 + filenameLength > end || !/\.csv$/i.test(zip.toString('utf8', directory + 46, directory + 46 + filenameLength)) || size > maximum || offset + 30 > directory || zip.readUInt32LE(offset) !== 0x04034b50 || zip.readUInt16LE(directory + 8) & 1) throw new Error('Barcelona: ungültige ZIP-Datei');
  const start = offset + 30 + zip.readUInt16LE(offset + 26) + zip.readUInt16LE(offset + 28);
  if (start + compressed > directory || ![0, 8].includes(method)) throw new Error('Barcelona: ungültige ZIP-Komprimierung');
  const payload = zip.subarray(start, start + compressed);
  const csv = method === 8 ? inflateRawSync(payload, { maxOutputLength: maximum }) : payload;
  if (csv.length !== size) throw new Error('Barcelona: unvollständige CSV-Datei');
  return new TextDecoder('utf-8', { fatal: true }).decode(csv);
}

export function parseBarcelonaPoll(csv, metadata) {
  const info = metadata?.data?.[0], survey = metadata?.value?.[0];
  const date = isoDate(survey?.fieldEndDate?.slice(0, 10)), firstDate = isoDate(survey?.fieldStartDate?.slice(0, 10)), pollster = survey?.company?.trim();
  if (metadata?.code !== 200 || info?.source !== 'SURVEY' || info.license !== 'CC BY 4.0' || !/^Baròmetre de Barcelona - /.test(info?.title || '') || date === null || firstDate === null || firstDate > date || !pollster || info.id !== survey?.registry) throw new Error('Barcelona: ungültige Umfragemetadaten');
  const rows = parseCSV(csv), header = rows.shift() || [], intention = header.indexOf('INT_VOT'), weight = header.indexOf('PES');
  if (weight < 0 || !header.includes('DATA_ENQ') || header.length !== new Set(header).size || !rows.length) throw new Error('Barcelona: unbekannte CSV-Struktur');
  // December 2022 contains vote recall only, not current voting intention.
  if (intention < 0 && info.id === '22041') return null;
  if (intention < 0) throw new Error('Barcelona: kommunale Wahlabsicht INT_VOT fehlt');
  const totals = new Map(); let totalWeight = 0;
  for (const row of rows) {
    if (row.length !== header.length) throw new Error('Barcelona: verschobene CSV-Spalten');
    const rawWeight = row[weight].trim(), value = Number(rawWeight.replace(',', '.')), answer = normalize(row[intention]);
    if (!/^\d+(?:[.,]\d+)?$/.test(rawWeight) || !Number.isFinite(value) || value <= 0) throw new Error('Barcelona: ungültiges Befragungsgewicht');
    const id = answerIds.get(answer);
    if (!id) throw new Error(`Barcelona: unbekannte Antwort zur Wahlabsicht: ${answer}`);
    // Include undecided, abstention and non-answers in the official denominator.
    totalWeight += value;
    totals.set(id, (totals.get(id) || 0) + value);
  }
  if (!totals.size || !Number.isFinite(totalWeight)) throw new Error('Barcelona: keine kommunalen Parteianteile');
  const values = Object.fromEntries(definitions.map(([id]) => [`bcn-${id}`, totals.has(`bcn-${id}`) ? Math.round(totals.get(`bcn-${id}`) / totalWeight * 1000) / 10 : null]));
  // Combine raw weights before rounding. An absent response category is a
  // measured zero, unlike a party without its own reported category.
  for (const [id] of responseGroups) values[`bcn-${id}`] = Math.round((totals.get(`bcn-${id}`) || 0) / totalWeight * 1000) / 10;
  return { id: info.id, date, pollster, values, fieldwork: `${survey.fieldStartDate.slice(0, 10)} – ${iso(date)}`, publishedAt: info.publishDate, sourceUrl: `${BARCELONA_PORTAL}/ca/enquestes/${info.id}` };
}

export function buildBarcelonaData(polls, today = Date.now()) {
  const unique = [...new Map(polls.filter(p => p && p.date <= today).map(p => [p.id, p])).values()].sort((a, b) => a.date - b.date);
  if (!unique.length) throw new Error('Barcelona: keine verwertbaren Umfragen');
  const latest = unique.at(-1);
  const parties = [
    ...definitions.filter(([id]) => unique.some(p => p.values[`bcn-${id}`] !== null)).map(([id, label, color]) => ({ id: `bcn-${id}`, label, color })),
    ...responseGroups.map(([id, label, color]) => ({ id: `bcn-${id}`, label, color, kind: 'response-group' })),
  ];
  return {
    barcelonaPolicy: BARCELONA_POLICY, barcelonaPolls: unique, fetchedAt: new Date().toISOString(), sourceUrl: latest.sourceUrl,
    dateBasis: 'fieldwork-end', measurement: 'direct-intention', axisLabel: 'Direkte Wahlabsicht in %',
    measurementNote: 'Direkte kommunale Wahlabsicht unter allen Befragten mit Wahlrecht. Die Antwortgruppen ergänzen die Parteien auf rund 100 %; kleine Abweichungen entstehen durch Rundung. „Nichtwähler“ bezeichnet Befragte, die nicht wählen möchten. Keine modellierte Wahlschätzung.',
    dataNote: 'Barcelona: Originalanteile des städtischen Barometers mit offizieller Befragungsgewichtung, auf eine Nachkommastelle gerundet. Datierung am Ende des Befragungszeitraums. Das Barometer erscheint überwiegend halbjährlich; der 7-Tage-Durchschnitt entspricht deshalb meist einer Einzelumfrage. Kleine Punkte markieren Umfragetage. Reine Rückblicke auf bereits abgegebene Stimmen (unter anderem Ende 2022 und die Nachwahlwellen 2019/2023) werden ausgelassen. Wahlergebnisse werden wegen ihrer abweichenden Bezugsgröße nicht mit diesen Anteilen vermischt. Junts umfasst auch Trias per Barcelona / Junts, CUP auch CUP – Capgirem Barcelona; Barcelona pel Canvi bleibt separat.',
    parties, points: rollingAverage(unique, parties.map(p => p.id)), pollCount: unique.length, latestPollDate: iso(latest.date),
    latestPoll: { date: iso(latest.date), pollster: latest.pollster, values: latest.values, fieldwork: latest.fieldwork },
    observationDates: unique.map(p => iso(p.date)), pollsters: listPollsters(unique), elections: [], approval: [],
    sources: [
      { label: 'Ajuntament de Barcelona · Oficina Municipal de Dades · Baròmetre de Barcelona', url: `${BARCELONA_PORTAL}/ca/enquestes/25049` },
      { label: 'CC BY 4.0 · eigene Aggregation mit offizieller Gewichtung und 7-Tage-Durchschnitt', url: 'https://creativecommons.org/licenses/by/4.0/' },
    ],
  };
}

export async function fetchBarcelonaData(previous, fetchJson, fetchBytes, today = Date.now()) {
  // This client identifier is public configuration used by the portal itself.
  const config = await fetchJson(BARCELONA_CONFIG);
  if (typeof config?.clientId !== 'string' || !config.clientId) throw new Error('Barcelona: öffentliche API-Konfiguration fehlt');
  const options = { headers: { 'X-IBM-Client-Id': config.clientId } };
  const catalogue = await fetchJson(BARCELONA_SEARCH, options);
  if (catalogue?.code !== 200 || !Array.isArray(catalogue.data) || catalogue.count > catalogue.data.length) throw new Error('Barcelona: unvollständiges Umfragearchiv');
  const surveys = catalogue.data.filter(s => s.source === 'SURVEY' && /^\d+$/.test(s.id) && /^Baròmetre de Barcelona - /.test(s.title) && !/Post-Electoral/i.test(s.title) && s.showDate >= '2019-01-01' && isoDate(s.showDate?.slice(0, 10)) !== null && isoDate(s.showDate.slice(0, 10)) <= today);
  if (!surveys.length) throw new Error('Barcelona: Umfragearchiv ist leer');
  const latestId = [...surveys].sort((a, b) => a.showDate.localeCompare(b.showDate)).at(-1).id;
  const cached = new Map((previous?.barcelonaPolicy === BARCELONA_POLICY ? previous.barcelonaPolls || [] : []).map(p => [p.id, p]));
  const queue = [...new Map(surveys.map(s => [s.id, s])).values()], polls = [];
  await Promise.all(Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift(), saved = cached.get(item.id);
      if (item.id !== latestId && saved?.publishedAt === item.publishDate && iso(saved.date) === item.showDate.slice(0, 10)) { polls.push(saved); continue; }
      const metadata = await fetchJson(barcelonaSurveyUrl(item.id), options);
      if (metadata?.data?.[0]?.id !== item.id) throw new Error('Barcelona: falsche Erhebung geliefert');
      const document = metadata?.value?.[0]?.documents?.find(d => /CSV/i.test(d.name) && /text/i.test(d.name));
      const url = document?.link && new URL(document.link);
      if (!url || url.origin !== 'https://w10.bcn.cat' || url.pathname !== '/APPS/riswestudis/documentacio.do' || url.searchParams.get('reqCode') !== 'mostrarImatge' || !/^\d+$/.test(url.searchParams.get('idDoc') || '')) throw new Error('Barcelona: offizieller CSV-Download fehlt');
      const poll = parseBarcelonaPoll(barcelonaCSV(await fetchBytes(url.href)), metadata);
      if (poll) polls.push(poll);
    }
  }));
  return buildBarcelonaData(polls, today);
}
