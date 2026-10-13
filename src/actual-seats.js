import { readFile } from 'node:fs/promises';
import { COUNTRIES } from './countries.js';
const iso = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function validateActualSeats(data) {
  if (!Array.isArray(data)) throw new Error('Ungültiges Sitzdatenregister');
  const areas = new Set();
  for (const s of data) {
    const key = `${s.country}:${s.region}`, country = COUNTRIES.find(c => c.id === s.country);
    if (areas.has(key) || !country?.regions.some(r => r.id === s.region) || !s.title || !s.legislature || !s.note || !iso(s.checkedAt) || !iso(s.validFrom) || s.validFrom > s.checkedAt ||
        s.validUntil !== undefined && (!iso(s.validUntil) || s.validUntil < s.checkedAt) || s.asOf !== undefined && (!iso(s.asOf) || s.asOf > s.checkedAt) || s.historical !== undefined && typeof s.historical !== 'boolean' || s.historical && (!s.asOf || !s.qualification) || !Number.isInteger(s.total) || s.total < 1 || s.total > 1000 ||
        !Array.isArray(s.rows) || !s.rows.length || new Set(s.rows.map(p => p.id)).size !== s.rows.length ||
        s.rows.some(p => !p.id || !p.label || !/^#[0-9a-f]{6}$/i.test(p.color) || !Number.isInteger(p.seats) || p.seats < 1) ||
        s.rows.reduce((n,p) => n+p.seats,0) !== s.total || !Array.isArray(s.sources) || !s.sources.length || s.sources.some(source => !source.title || !URL.canParse(source.url) || new URL(source.url).protocol !== 'https:')) throw new Error(`Ungültige reale Sitzverteilung: ${key}`);
    areas.add(key);
  }
  return data;
}
export const actualSeats = validateActualSeats(JSON.parse(await readFile(new URL('./content/actual-seats.json', import.meta.url), 'utf8')));
export const actualSeatsFor = (country, region) => actualSeats.find(s => s.country === country && s.region === region) || null;
