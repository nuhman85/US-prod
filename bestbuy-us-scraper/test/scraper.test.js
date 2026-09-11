import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePrice } from '../src/scraper.js';

test('parsePrice handles Best Buy formatted prices', () => {
  assert.equal(parsePrice('$1,119.99'), 1119.99);
  assert.equal(parsePrice('From $999.00'), 999);
  assert.equal(parsePrice(null), null);
  assert.equal(parsePrice('Unavailable'), null);
});
