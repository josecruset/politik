import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePolymarket, fetchPolymarket, marketStatus, POLYMARKET_EVENTS, MARKET_TTL } from '../src/polymarket.js';

const now = Date.UTC(2026, 10, 3, 8), time = new Date(now).toISOString();
const fixture = (spec = POLYMARKET_EVENTS[0]) => [{ slug: spec.slug, closed: false, markets: [
  { groupItemTitle: 'Democratic Party', active: true, closed: false, outcomes: '["No","Yes"]', outcomePrices: '["0.3","0.7"]', updatedAt: time },
  { groupItemTitle: 'Republican Party', active: true, closed: false, outcomes: ['Yes', 'No'], outcomePrices: ['0.32', '0.68'], updatedAt: time },
  { groupItemTitle: 'Party A', active: false },
] }];
test('Polymarket maps Yes by name, ignores inactive placeholders and does not normalize independent prices', () => {
  const parsed = parsePolymarket(fixture(), POLYMARKET_EVENTS[0], now);
  assert.deepEqual(parsed.outcomes.map(p => p.probability), [70, 32]);
  assert.equal(parsed.fetchedAt, time);
  assert.equal(parsed.stale, false);
});
test('Polymarket rejects missing, empty, invalid or out-of-range prices and future timestamps', () => {
  for (const price of ['', ' ', null, false, 'NaN', '1.01', '-0.1']) {
    const data = fixture(); data[0].markets[0].outcomePrices = [0.3, price];
    assert.throws(() => parsePolymarket(data, POLYMARKET_EVENTS[0], now));
  }
  const future = fixture(); future[0].markets[0].updatedAt = new Date(now + 120000).toISOString();
  assert.throws(() => parsePolymarket(future, POLYMARKET_EVENTS[0], now));
  const wrong = fixture(); wrong[0].slug = 'unrelated-election';
  assert.throws(() => parsePolymarket(wrong, POLYMARKET_EVENTS[0], now));
  const incomplete = fixture(); incomplete[0].markets.pop(); incomplete[0].markets.pop();
  assert.throws(() => parsePolymarket(incomplete, POLYMARKET_EVENTS[0], now));
});
test('closed markets and resolved zero/one prices stay explicit', () => {
  const data = fixture(); data[0].closed = true;
  for (const market of data[0].markets.slice(0, 2)) { market.closed = true; market.active = false; market.outcomePrices = ['0', '1']; }
  const parsed = parsePolymarket(data, POLYMARKET_EVENTS[0], now);
  assert.equal(parsed.closed, true);
  assert.deepEqual(parsed.outcomes.map(p => p.probability), [100, 0]);
});
test('one chamber can refresh while the other keeps its prior values and original timestamps', async () => {
  const previous = await fetchPolymarket(null, async url => fixture(POLYMARKET_EVENTS.find(e => url.endsWith(e.slug))), now);
  const refreshed = await fetchPolymarket(previous, async url => {
    if (url.endsWith(POLYMARKET_EVENTS[1].slug)) throw new Error('offline');
    return fixture();
  }, now + MARKET_TTL);
  assert.equal(refreshed.events[0].fetchedAt, new Date(now + MARKET_TTL).toISOString());
  assert.equal(refreshed.events[1].fetchedAt, time);
  assert.equal(refreshed.events[1].stale, true);
  assert.deepEqual(refreshed.events[1].outcomes, previous.events[1].outcomes);
});
test('first-load outage returns explicit unavailable chambers without invented probabilities', async () => {
  const data = await fetchPolymarket(null, async () => { throw new Error('offline'); }, now);
  for (const event of data.events) { assert.deepEqual(event.outcomes, []); assert.equal(event.fetchedAt, null); assert.equal(event.stale, true); }
});
test('freshness uses both fetch time and upstream course time, with no live label for old data', () => {
  const data = { version: 1, events: [parsePolymarket(fixture(), POLYMARKET_EVENTS[0], now)] };
  assert.equal(marketStatus(data, now).events[0].stale, false);
  assert.equal(marketStatus(data, now + MARKET_TTL * 2 + 1).events[0].stale, true);
  const oldSource = structuredClone(data); oldSource.events[0].outcomes[0].updatedAt = new Date(now - 16 * 60000).toISOString();
  assert.equal(marketStatus(oldSource, now).events[0].stale, true);
  assert.equal(data.events[0].stale, false);
});
