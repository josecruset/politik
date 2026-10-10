import { rollingAverage, listPollsters } from './data.js';
import { isoDate } from './spain.js';

export const CATALONIA_POLICY = 1;
export const CATALONIA_SOURCES = [
  { title: 'Next_Catalan_regional_election', label: 'Aktuelle Katalonien-Umfragen' },
  { title: '2024_Catalan_regional_election', label: 'Katalonien-Umfragen 2021–2024' },
].map(s => ({ ...s, url: `https://en.wikipedia.org/wiki/${s.title}` }));
const iso = time => new Date(time).toISOString().slice(0, 10);
const definitions = [
  ['psc', 'PSC', ["Socialists'_Party_of_Catalonia"]],
  ['junts', 'Junts', ['Together_for_Catalonia_(2020)']],
  ['erc', 'ERC', ['Republican_Left_of_Catalonia']],
  ['pp', 'PP', ["People's_Party_of_Catalonia"]],
  ['vox', 'Vox', ['Vox_(political_party)']],
  ['comuns', 'Comuns / ECP', ['En_Comú_Podem', 'Comuns_Sumar']],
  ['cup', 'CUP', ['Popular_Unity_Candidacy']],
  ['alianca', 'Aliança Catalana', ['Catalan_Alliance']],
  ['podem', 'Podem', ['Podemos_(Spanish_political_party)']],
  ['cs', 'Ciudadanos', ['Citizens_(Spanish_political_party)']],
  ['pdecat', 'PDeCAT', ['Catalan_European_Democratic_Party']],
  ['valents', 'Valents', ['Valents']],
  ['alhora', 'Alhora', ['Alhora']],
  ['salf', 'SALF', ['Se_Acabó_La_Fiesta']],
];
const partyByTitle = new Map(definitions.flatMap(([id, , titles]) => titles.map(title => [title, `cat-${id}`])));
const entities = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ', ndash: '–', mdash: '—', minus: '−' };
function decode(text) {
  return text.replace(/&(#x[\da-f]+|#\d+|\w+);/gi, (original, code) => {
    if (code[0] !== '#') return entities[code] ?? original;
    const value = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
    return value <= 0x10ffff ? String.fromCodePoint(value) : original;
  });
}
function descendants(node, tag) {
  return node.children.flatMap(child => typeof child === 'string' ? [] : [...(child.tag === tag ? [child] : []), ...descendants(child, tag)]);
}
function text(node) {
  if (typeof node === 'string') return node;
  if (['sup', 'small', 'script', 'style'].includes(node.tag) || /font-size\s*:\s*75%/.test(node.attrs.style || '')) return '';
  if (node.tag === 'br') return '\n';
  return node.children.map(text).join('');
}
const clean = node => text(node).replace(/\s+/g, ' ').trim();

// Only the estimates table is parsed. Quoted attributes can themselves contain
// HTML fragments; a plain <...> regex would corrupt MediaWiki's data-mw attrs.
function estimateTable(html) {
  const heading = html.search(/\bid=["']Voting_intention_estimates["']/);
  const start = html.indexOf('<table', heading);
  const nextHeading = heading < 0 ? -1 : html.slice(heading).search(/<h[2-4]\b/i);
  if (heading < 0 || start < 0 || (nextHeading >= 0 && start > heading + nextHeading)) throw new Error('Katalonien: Tabelle der Wahlabsichtsschätzungen fehlt');
  const root = { tag: 'root', attrs: {}, children: [] }, stack = [root];
  for (const match of html.slice(start).matchAll(/<!--[\s\S]*?-->|<\/?[A-Za-z][^\s/>]*(?:[^<>"']|"[^"]*"|'[^']*')*>|[^<]+/g)) {
    const token = match[0];
    if (token.startsWith('<!--')) continue;
    if (!token.startsWith('<')) { stack.at(-1).children.push(decode(token)); continue; }
    const tag = token.match(/^<\/?([^\s/>]+)/)[1].toLowerCase();
    if (token.startsWith('</')) {
      const index = stack.findLastIndex(n => n.tag === tag);
      if (index > 0) stack.length = index;
      if (tag === 'table' && stack.length === 1) return root.children[0];
      continue;
    }
    const attrs = {};
    for (const a of token.slice(tag.length + 1, -1).matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) attrs[a[1].toLowerCase()] = decode(a[2] ?? a[3] ?? a[4] ?? '');
    const node = { tag, attrs, children: [] }; stack.at(-1).children.push(node);
    if (!['br', 'img', 'hr', 'input', 'meta', 'link'].includes(tag) && !token.endsWith('/>')) stack.push(node);
  }
  throw new Error('Katalonien: unvollständige Umfragetabelle');
}
function tableGrid(table) {
  const rows = descendants(table, 'tr'), grid = [];
  for (let r = 0; r < rows.length; r++) {
    grid[r] ??= []; let column = 0;
    for (const cell of rows[r].children.filter(n => typeof n !== 'string' && ['td', 'th'].includes(n.tag))) {
      while (grid[r][column]) column++;
      const across = Number(cell.attrs.colspan || 1), down = Number(cell.attrs.rowspan || 1);
      if (!Number.isInteger(across) || !Number.isInteger(down) || across < 1 || down < 1 || across > 40 || down > 10) throw new Error('Katalonien: ungültige Tabellenstruktur');
      for (let dr = 0; dr < down; dr++) for (let dc = 0; dc < across; dc++) { grid[r + dr] ??= []; grid[r + dr][column + dc] = cell; }
      column += across;
    }
  }
  return grid;
}
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fieldworkDate(value) {
  // Use the final date of single-month, cross-month and cross-year ranges.
  const match = value.trim().match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/);
  return match ? isoDate(`${match[3]}-${String(months.indexOf(match[2]) + 1).padStart(2, '0')}-${match[1].padStart(2, '0')}`) : null;
}
export function catalanPercent(cellText) {
  const value = cellText.trim();
  const interval = percentInterval(value);
  if (interval) return (interval.low + interval.high) / 2;
  if (!/^\d{1,3}(?:[.,]\d+)?\s*%?$/.test(value)) return null;
  const number = Number(value.replace('%', '').replace(',', '.'));
  return number <= 100 ? number : null;
}
function percentInterval(value) {
  const match = value.match(/^(\d{1,3}(?:[.,]\d+)?)\s*%?\s*[–—-]\s*(\d{1,3}(?:[.,]\d+)?)\s*%?$/);
  if (!match) return null;
  const low = Number(match[1].replace(',', '.')), high = Number(match[2].replace(',', '.'));
  return low <= high && high <= 100 ? { low, high } : null;
}
export function parseCataloniaTable(html, today = Date.now()) {
  const grid = tableGrid(estimateTable(html)), header = grid[0];
  if (clean(header[0]) !== 'Polling firm/Commissioner' || clean(header[1]) !== 'Fieldwork date') throw new Error('Katalonien: unbekannte Spaltenstruktur');
  const columns = [], parties = [];
  for (let column = 4; column < header.length - 1; column++) {
    const titles = descendants(header[column], 'a').map(a => {
      try { return decodeURIComponent(new URL(a.attrs.href, CATALONIA_SOURCES[0].url).pathname).replace(/^\/wiki\//, ''); } catch { return ''; }
    });
    const ids = [...new Set(titles.map(t => partyByTitle.get(t)).filter(Boolean))];
    if (ids.length !== 1) throw new Error(`Katalonien: unbekannte Parteispalte ${titles.join(', ') || clean(header[column])}`);
    const color = grid[1][column]?.attrs.style?.match(/background(?:-color)?\s*:\s*(#[\da-f]{6})/i)?.[1];
    if (!color) throw new Error('Katalonien: Parteifarbe fehlt');
    columns.push({ column, id: ids[0] }); parties.push({ id: ids[0], color });
  }
  if (new Set(parties.map(p => p.id)).size !== parties.length || !parties.some(p => p.id === 'cat-psc')) throw new Error('Katalonien: doppelte oder fehlende Parteispalten');
  const polls = [], elections = [];
  for (const row of grid.slice(2)) {
    if (!row[0] || !row[1] || row[0] === row[1]) continue;
    const pollster = clean(row[0]), fieldwork = clean(row[1]), date = fieldworkDate(fieldwork);
    if (date === null || date > today || !pollster) continue;
    if (row.length !== header.length) throw new Error('Katalonien: verschobene Umfragespalten');
    const ranges = {};
    const values = Object.fromEntries(columns.map(({ column, id }) => {
      if (Number(row[column]?.attrs.colspan || 1) !== 1) throw new Error('Katalonien: gemeinsamer Wert mehrerer Parteien');
      const cellText = clean(row[column]), interval = percentInterval(cellText);
      if (interval) ranges[id] = interval;
      return [id, catalanPercent(cellText)];
    }));
    if (!Object.values(values).some(v => v !== null)) continue;
    if (/\belection\b/i.test(pollster)) {
      if (/^\d{4} regional election$/.test(pollster)) elections.push({ date: iso(date), label: 'Parlamentswahl Katalonien', values });
      continue;
    }
    if (/projection|forecast/i.test(pollster)) continue;
    polls.push({ date, pollster, fieldwork, values, ranges, alternative: /Logoslab/i.test(pollster) });
  }
  if (!polls.length || !elections.length) throw new Error('Katalonien: keine verwertbaren Umfragen oder Wahlresultate');
  return { parties, polls, elections };
}
export function buildCataloniaData(documents, today = Date.now()) {
  const parsed = documents.map(html => parseCataloniaTable(html, today));
  const colors = new Map(parsed.flatMap(p => p.parties).reverse().map(p => [p.id, p.color]));
  const parties = definitions.filter(([id]) => colors.has(`cat-${id}`)).map(([id, label]) => ({ id: `cat-${id}`, label, color: colors.get(`cat-${id}`) }));
  const ids = parties.map(p => p.id), normalize = values => Object.fromEntries(ids.map(id => [id, values[id] ?? null]));
  const polls = [], seen = new Set(), electionMap = new Map();
  for (const source of parsed) {
    for (const p of source.polls) {
      if (p.alternative) continue;
      const key = JSON.stringify([p.pollster.toLowerCase(), p.date, normalize(p.values)]);
      if (!seen.has(key)) { seen.add(key); polls.push(p); }
    }
    for (const e of source.elections) {
      const previous = electionMap.get(e.date);
      if (previous) {
        for (const [id, value] of Object.entries(e.values)) {
          if (value !== null && previous.values[id] !== null && previous.values[id] !== undefined && previous.values[id] !== value) throw new Error('Katalonien: widersprüchliche Wahlresultate');
          if (value !== null) previous.values[id] = value;
        }
      } else electionMap.set(e.date, { ...e, values: { ...e.values } });
    }
  }
  polls.sort((a, b) => a.date - b.date);
  const latest = polls.find(p => p.date === polls.at(-1)?.date);
  if (!latest) throw new Error('Katalonien: Umfragen fehlen');
  return {
    cataloniaPolicy: CATALONIA_POLICY, fetchedAt: new Date().toISOString(), sourceUrl: CATALONIA_SOURCES[0].url,
    dateBasis: 'fieldwork-end', observationDates: [...new Set(polls.map(p => iso(p.date)))],
    dataNote: 'Katalonien: Datierung am Ende des Befragungszeitraums, ersatzweise am Veröffentlichungstag gemäß Quelle. Comuns / ECP umfasst die jeweiligen Bündnisse der Quelle; Podem wird separat geführt, wenn eigenständig erhoben. Prozentintervalle gehen mit ihrem arithmetischen Mittelpunkt in den Durchschnitt ein; die neuesten Karten zeigen gegebenenfalls das gemeldete Intervall. Bei CIS zählt nur die Originalschätzung, keine Logoslab-Neuberechnung. Befragungen, die am Wahltag enden, einschließlich Wahlabendbefragungen, werden einbezogen. Kleine Punkte markieren Umfragetage mit ihrem 7-Tage-Durchschnitt. Die Linien verbinden vorhandene Werte über Umfragepausen hinweg; im Tooltip erscheint bei leeren 7-Tage-Fenstern kein Wert.',
    parties, points: rollingAverage(polls, ids), pollCount: polls.length, latestPollDate: iso(latest.date),
    latestPoll: { date: iso(latest.date), pollster: latest.pollster, values: normalize(latest.values), ranges: latest.ranges, fieldwork: latest.fieldwork },
    elections: [...electionMap.values()].map(e => ({ ...e, values: normalize(e.values) })).sort((a, b) => a.date.localeCompare(b.date)),
    pollsters: listPollsters(polls), approval: [],
    sources: [
      ...CATALONIA_SOURCES.map(s => ({ label: `Wikipedia-Autorinnen und -Autoren · ${s.label}`, url: s.url })),
      { label: 'CC BY-SA 4.0 · eigener 7-Tage-Durchschnitt', url: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    ],
  };
}
export async function fetchCataloniaData(fetchHtml, today = Date.now()) {
  return buildCataloniaData(await Promise.all(CATALONIA_SOURCES.map(s => fetchHtml(s.url))), today);
}
