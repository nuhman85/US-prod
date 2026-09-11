import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSearchUrl,
  parseResultRange,
  parseSearchTerm,
  termFromSearchUrl,
} from '../src/cli.js';

test('parseSearchTerm supports --term and a positional term', () => {
  assert.equal(parseSearchTerm(['--term', 'Samsung Galaxy Tab']), 'Samsung Galaxy Tab');
  assert.equal(parseSearchTerm(['Samsung', 'Galaxy', 'Tab']), 'Samsung Galaxy Tab');
  assert.equal(parseSearchTerm([]), null);
  assert.equal(
    parseSearchTerm(['Samsung Galaxy Tab', '--from', '10', '--to', '15']),
    'Samsung Galaxy Tab',
  );
});

test('parseResultRange supports inclusive result positions', () => {
  assert.deepEqual(parseResultRange(['--from', '10', '--to', '15']), { from: 10, to: 15 });
  assert.deepEqual(parseResultRange([], 20), { from: 1, to: 20 });
  assert.throws(() => parseResultRange(['--from', '15', '--to', '10']), /greater than/);
});

test('buildSearchUrl safely encodes and recovers a term', () => {
  const term = 'Samsung Galaxy Tab S10+ 12.4"';
  const url = buildSearchUrl(term);
  assert.equal(termFromSearchUrl(url), term);
  assert.equal(new URL(url).hostname, 'www.bestbuy.com');
});
