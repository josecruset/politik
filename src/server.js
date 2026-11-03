import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildData, buildStateData, rollingApprovalAverage, SHEETS, SOURCE_ID } from './data.js';

import { COUNTRIES, findArea, cacheName } from './countries.js';
import { fetchSpainData, SPAIN_POLICY } from './spain.js';
import { fetchCataloniaData, CATALONIA_POLICY } from './catalonia.js';
import { fetchBarcelonaData, BARCELONA_POLICY } from './barcelona.js';
import { contextFor } from './context.js';
import { buildUSAData, USA_POLICY, USA_POLLS_URL } from './usa.js';
import { fetchPolymarket, marketStatus, MARKET_TTL } from './polymarket.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const cacheDir = process.env.DATA_DIR || fileURLToPath(new URL('../data/', import.meta.url));
const ttl = 15 * 60 * 1000;
const areas = COUNTRIES.flatMap(country => country.regions.map(region => ({ ...region, country: country.id })));
const caches = new Map();
for (const region of areas) {
  let data = null;
  try { data = JSON.parse(await readFile(`${cacheDir}/${cacheName(region.country, region.id)}.json`, 'utf8')); } catch {}
  if (region.country === 'us' ? data?.usaPolicy !== USA_POLICY : region.id === 'barcelona' ? data?.barcelonaPolicy !== BARCELONA_POLICY : region.id === 'katalonien' ? data?.cataloniaPolicy !== CATALONIA_POLICY : region.country === 'es' ? data?.spainPolicy !== SPAIN_POLICY : region.id !== 'bundestag' && data?.statePolicy !== 1) data = null;
  // Upgrade persisted raw observations even when the source is temporarily offline.
  for (const series of data?.approval || []) {
    if (series.aggregation !== 'rolling-7-days') {
      series.points = rollingApprovalAverage(series.points);
      series.aggregation = 'rolling-7-days';
    }
  }
  caches.set(region.id, { data, pending: null, lastAttempt: 0, lastError: null });
}

async function fetchSheet(gid) {
  const response = await fetch(`https://docs.google.com/spreadsheets/d/${SOURCE_ID}/export?format=csv&gid=${gid}`, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Google Sheets: HTTP ${response.status}`);
  const csv = await response.text();
  if (/^\s*</.test(csv)) throw new Error('Google Sheets liefert keine CSV-Daten');
  return csv;
}
async function fetchJson(url, options = {}) {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`JSON-Datenquelle: HTTP ${response.status}`);
  return response.json();
}
async function fetchBytes(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Barcelona-Datenquelle: HTTP ${response.status}`);
  if (Number(response.headers.get('content-length')) > 8 * 1024 * 1024) throw new Error('Barcelona: CSV-Download ist zu groß');
  return response.bytes();
}
async function fetchHtml(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Politik/1.0 (public polling visualisation; github.com/josecruset/politik)' }, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Datenquelle: HTTP ${response.status}`);
  return response.text();
}
async function refresh(region = areas[0]) {
  const entry = caches.get(region.id);
  if (entry.pending) return entry.pending;
  entry.lastAttempt = Date.now();
  entry.pending = (async () => {
    let data;
    if (region.country === 'us') data = buildUSAData(await fetchHtml(USA_POLLS_URL));
    else if (region.id === 'barcelona') data = await fetchBarcelonaData(entry.data, fetchJson, fetchBytes);
    else if (region.id === 'katalonien') data = await fetchCataloniaData(fetchHtml);
    else if (region.country === 'es') data = await fetchSpainData(entry.data, fetchJson);
    else if (region.id === 'bundestag') {
      const entries = await Promise.all(Object.entries(SHEETS).map(async ([name, gid]) => [name, await fetchSheet(gid)]));
      data = buildData(Object.fromEntries(entries));
    } else data = buildStateData(await fetchSheet(region.gid), region);
    await mkdir(cacheDir, { recursive: true });
    const file = `${cacheDir}/${cacheName(region.country, region.id)}`;
    await writeFile(`${file}.tmp`, JSON.stringify(data));
    await rename(`${file}.tmp`, `${file}.json`);
    entry.data = data; entry.lastError = null;
  })().catch(error => { entry.lastError = error.message; console.error(`Datenaktualisierung ${region.label}:`, error.message); }).finally(() => { entry.pending = null; });
  return entry.pending;
}

let markets = null, marketPending = null, marketAttempt = 0;
try {
  const stored = JSON.parse(await readFile(`${cacheDir}/markets-us.json`, 'utf8'));
  if (stored.version === 1 && Array.isArray(stored.events)) markets = stored;
} catch {}
async function refreshMarkets() {
  if (marketPending) return marketPending;
  marketAttempt = Date.now();
  marketPending = (async () => {
    markets = await fetchPolymarket(markets, fetchJson);
    await mkdir(cacheDir, { recursive: true });
    await writeFile(`${cacheDir}/markets-us.tmp`, JSON.stringify(markets));
    await rename(`${cacheDir}/markets-us.tmp`, `${cacheDir}/markets-us.json`);
  })().catch(error => console.error('Polymarket-Cache:', error.message)).finally(() => { marketPending = null; });
  return marketPending;
}

const files = { '/markets-ui.js': ['markets-ui.js', 'text/javascript'], '/event-data.js': ['event-data.js', 'text/javascript'], '/context-ui.js': ['context-ui.js', 'text/javascript'], '/seat-model.js': ['seat-model.js', 'text/javascript'], '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/theme.js': ['theme.js', 'text/javascript'], '/chart-scale.js': ['chart-scale.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  const path = url.pathname;
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'");
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); return response.end(); }
  try {
    if (path === '/healthz') {
      response.setHeader('Content-Type', 'application/json');
      return response.end(JSON.stringify({ status: 'ok', version: process.env.APP_VERSION || 'local', dataReady: Boolean(caches.get('bundestag').data), fetchedAt: caches.get('bundestag').data?.fetchedAt || null }));
    }
    if (path === '/api/markets') {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      if ((url.searchParams.get('country') || 'us') !== 'us') { response.writeHead(400); return response.end(JSON.stringify({ error: 'Prognosemärkte sind für die USA angebunden' })); }
      if (marketPending || Date.now() - marketAttempt >= MARKET_TTL) await refreshMarkets();
      if (!markets) { response.writeHead(503); return response.end(JSON.stringify({ error: 'Polymarket derzeit nicht erreichbar' })); }
      return response.end(JSON.stringify(marketStatus(markets)));
    }
    if (path === '/api/data') {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      const area = findArea(url.searchParams.get('country') || 'de', url.searchParams.get('region'));
      if (!area) { response.writeHead(400); return response.end(JSON.stringify({ error: 'Unbekanntes Land oder Wahlgebiet' })); }
      const { country } = area;
      const region = areas.find(r => r.country === country.id && r.id === area.region.id);
      const entry = caches.get(region.id);
      if (!entry.data || !entry.data.latestPoll || !Array.isArray(entry.data.pollsters) || Date.now() - new Date(entry.data.fetchedAt).getTime() > ttl) {
        if (Date.now() - entry.lastAttempt > 60000 || entry.pending) await refresh(region);
      }
      if (!entry.data) { response.writeHead(503); return response.end(JSON.stringify({ error: `Die Umfragedaten für ${region.label} konnten noch nicht geladen werden. Bitte erneut versuchen.` })); }
      return response.end(JSON.stringify({ ...entry.data, country: { id: country.id, label: country.label, context: country.context !== false }, countries: COUNTRIES.map(({ id, label }) => ({ id, label })), region: { id: region.id, label: region.label }, regions: country.regions.map(({ id, label }) => ({ id, label })), stale: Boolean(entry.lastError) || Date.now() - new Date(entry.data.fetchedAt).getTime() > ttl }));
    }
    if (path === '/api/context') {
      const area = findArea(url.searchParams.get('country') || 'de', url.searchParams.get('region'));
      response.setHeader('Content-Type', 'application/json; charset=utf-8'); response.setHeader('Cache-Control', 'no-cache');
      if (!area) { response.writeHead(400); return response.end(JSON.stringify({ error: 'Unbekanntes Wahlgebiet' })); }
      return response.end(JSON.stringify(contextFor(area.country.id, area.region.id)));
    }
    if (!files[path]) { response.writeHead(404); return response.end('Nicht gefunden'); }
    const [file, type] = files[path];
    const body = await readFile(`${publicDir}${file}`);
    response.setHeader('Content-Type', `${type}; charset=utf-8`);
    response.setHeader('Cache-Control', 'no-cache');
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) { console.error(error.message); response.writeHead(500); response.end('Interner Fehler'); }
});
server.requestTimeout = 60000;
server.listen(Number(process.env.PORT || 3000), '0.0.0.0', () => console.log('Politik läuft auf Port', process.env.PORT || 3000));
void refresh();
setInterval(() => {
  for (const region of areas) if (region.id === 'bundestag' || caches.get(region.id).data) void refresh(region);
}, ttl).unref();
setInterval(() => { if (markets) void refreshMarkets(); }, MARKET_TTL).unref();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
