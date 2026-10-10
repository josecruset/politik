import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildData, buildStateData, rollingApprovalAverage, SHEETS, SOURCE_ID } from './data.js';

import { REGIONS } from './regions.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const cacheDir = process.env.DATA_DIR || fileURLToPath(new URL('../data/', import.meta.url));
const ttl = 15 * 60 * 1000;
const caches = new Map();
for (const region of REGIONS) {
  let data = null;
  try { data = JSON.parse(await readFile(`${cacheDir}/${region.id === 'bundestag' ? 'polls' : 'polls-' + region.id}.json`, 'utf8')); } catch {}
  if (region.id !== 'bundestag' && data?.statePolicy !== 1) data = null;
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
async function refresh(region = REGIONS[0]) {
  const entry = caches.get(region.id);
  if (entry.pending) return entry.pending;
  entry.lastAttempt = Date.now();
  entry.pending = (async () => {
    let data;
    if (region.id === 'bundestag') {
      const entries = await Promise.all(Object.entries(SHEETS).map(async ([name, gid]) => [name, await fetchSheet(gid)]));
      data = buildData(Object.fromEntries(entries));
    } else data = buildStateData(await fetchSheet(region.gid), region);
    await mkdir(cacheDir, { recursive: true });
    const file = `${cacheDir}/${region.id === 'bundestag' ? 'polls' : 'polls-' + region.id}`;
    await writeFile(`${file}.tmp`, JSON.stringify(data));
    await rename(`${file}.tmp`, `${file}.json`);
    entry.data = data; entry.lastError = null;
  })().catch(error => { entry.lastError = error.message; console.error(`Datenaktualisierung ${region.label}:`, error.message); }).finally(() => { entry.pending = null; });
  return entry.pending;
}

const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
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
    if (path === '/api/data') {
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      const region = REGIONS.find(r => r.id === (url.searchParams.get('region') || 'bundestag'));
      if (!region) { response.writeHead(400); return response.end(JSON.stringify({ error: 'Unbekanntes Wahlgebiet' })); }
      const entry = caches.get(region.id);
      if (!entry.data || !entry.data.latestPoll || !Array.isArray(entry.data.pollsters) || Date.now() - new Date(entry.data.fetchedAt).getTime() > ttl) {
        if (Date.now() - entry.lastAttempt > 60000 || entry.pending) await refresh(region);
      }
      if (!entry.data) { response.writeHead(503); return response.end(JSON.stringify({ error: `Die Umfragedaten für ${region.label} konnten noch nicht geladen werden. Bitte erneut versuchen.` })); }
      return response.end(JSON.stringify({ ...entry.data, region: { id: region.id, label: region.label }, regions: REGIONS.map(({ id, label }) => ({ id, label })), stale: Boolean(entry.lastError) || Date.now() - new Date(entry.data.fetchedAt).getTime() > ttl }));
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
  for (const region of REGIONS) if (region.id === 'bundestag' || caches.get(region.id).data) void refresh(region);
}, ttl).unref();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
