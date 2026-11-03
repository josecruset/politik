import { USA_PARTIES } from './usa.js';

export const MARKET_TTL = 60_000;
export const POLYMARKET_EVENTS = [
  { id: 'house-2026', label: 'Repräsentantenhaus 2026', slug: 'which-party-will-win-the-house-in-2026' },
  { id: 'senate-2026', label: 'Senat 2026', slug: 'which-party-will-win-the-senate-in-2026' },
];
const array = value => Array.isArray(value) ? value : JSON.parse(value);
const partyNames = { 'us-dem': 'Democratic Party', 'us-rep': 'Republican Party' };
export function parsePolymarket(payload, spec, now = Date.now()) {
  const event = Array.isArray(payload) && payload.find(e => e.slug === spec.slug);
  if (!event || !Array.isArray(event.markets)) throw new Error('Polymarket: Ereignis fehlt');
  const outcomes = USA_PARTIES.map(party => {
    const market = event.markets.find(m => m.groupItemTitle === partyNames[party.id]);
    if (!market || market.active !== true && market.closed !== true) throw new Error('Polymarket: Parteimarkt fehlt');
    const names = array(market.outcomes), prices = array(market.outcomePrices);
    const index = names.indexOf('Yes'), raw = prices[index];
    const price = typeof raw === 'number' || typeof raw === 'string' && /^(?:0|1)(?:\.\d+)?$/.test(raw) ? Number(raw) : NaN;
    const updated = Date.parse(market.updatedAt);
    if (index < 0 || prices.length !== names.length || !Number.isFinite(price) || price < 0 || price > 1 || !Number.isFinite(updated) || updated > now + 60_000) throw new Error('Polymarket: ungültiger Kurs oder Zeitstempel');
    return { ...party, probability: Number((price * 100).toFixed(4)), updatedAt: market.updatedAt, closed: market.closed === true };
  });
  return { ...spec, sourceUrl: `https://polymarket.com/event/${spec.slug}`, fetchedAt: new Date(now).toISOString(), outcomes, closed: event.closed === true || outcomes.every(o => o.closed), stale: false, error: null };
}
export async function fetchPolymarket(previous, fetchJson, now = Date.now()) {
  const events = await Promise.all(POLYMARKET_EVENTS.map(async spec => {
    try {
      return parsePolymarket(await fetchJson(`https://gamma-api.polymarket.com/events?slug=${spec.slug}`), spec, now);
    } catch {
      const cached = previous?.events?.find(e => e.id === spec.id);
      return { ...(cached || { ...spec, sourceUrl: `https://polymarket.com/event/${spec.slug}`, outcomes: [], fetchedAt: null }), stale: true, error: 'Aktualisierung fehlgeschlagen' };
    }
  }));
  return { version: 1, events };
}
export function marketStatus(data, now = Date.now()) {
  return { ...data, events: data.events.map(event => ({ ...event, stale: event.stale || !event.fetchedAt || now - Date.parse(event.fetchedAt) > MARKET_TTL * 2 || !event.closed && event.outcomes.some(o => now - Date.parse(o.updatedAt) > 15 * 60_000) })) };
}
