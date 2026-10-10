import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildData, SHEETS, SOURCE_ID } from './data.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const cacheDir = process.env.DATA_DIR || fileURLToPath(new URL('../data/', import.meta.url));
const ttl = 15 * 60 * 1000;
let cache = null, pending = null, lastAttempt = 0, lastError = null;
try { cache = JSON.parse(await readFile(`${cacheDir}/polls.json`, 'utf8')); } catch {}

async function refresh() {
  if (pending) return pending;
  lastAttempt = Date.now();
  pending = (async () => {
    const entries = await Promise.all(Object.entries(SHEETS).map(async ([name, gid]) => {
      const response = await fetch(`https://docs.google.com/spreadsheets/d/${SOURCE_ID}/export?format=csv&gid=${gid}`, { signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error(`Google Sheets: HTTP ${response.status}`);
      const csv = await response.text();
      if (/^\s*</.test(csv)) throw new Error('Google Sheets liefert keine CSV-Daten');
      return [name, csv];
    }));
    const data = buildData(Object.fromEntries(entries));
    await mkdir(cacheDir, { recursive: true });
    await writeFile(`${cacheDir}/polls.tmp`, JSON.stringify(data));
    await rename(`${cacheDir}/polls.tmp`, `${cacheDir}/polls.json`);
    cache = data; lastError = null;
  })().catch(error => { lastError = error.message; console.error('Datenaktualisierung:', error.message); }).finally(() => { pending = null; });
  return pending;
}

const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'] };
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'");
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); return response.end(); }
  try {
    if (path === '/healthz') {
      response.setHeader('Content-Type', 'application/json');
      return response.end(JSON.stringify({ status: 'ok', version: process.env.APP_VERSION || 'local', dataReady: Boolean(cache), fetchedAt: cache?.fetchedAt || null }));
    }
    if (path === '/api/data') {
      if (!cache || !Array.isArray(cache.pollsters) || Date.now() - new Date(cache.fetchedAt).getTime() > ttl) {
        if (Date.now() - lastAttempt > 60000 || pending) await refresh();
      }
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'no-store');
      if (!cache) { response.writeHead(503); return response.end(JSON.stringify({ error: 'Die Umfragedaten konnten noch nicht geladen werden. Bitte erneut versuchen.' })); }
      return response.end(JSON.stringify({ ...cache, stale: Boolean(lastError) || Date.now() - new Date(cache.fetchedAt).getTime() > ttl }));
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
setInterval(() => void refresh(), ttl).unref();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
