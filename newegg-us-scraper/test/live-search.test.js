import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { searchNewegg } from '../src/live-search.js';

function card(id) {
  return `<div class="item-cell"><a class="item-title" href="https://www.newegg.com/p/${id}">Gaming laptop product ${id}</a><li class="price-current">$999.99</li></div>`;
}

test('collects every requested page, deduplicates, and accepts short searches', async () => {
  const original = chromium.launch;
  const visited = [];
  let closed = false;
  chromium.launch = async () => ({
    newPage: async () => ({
      goto: async url => visited.push(new URL(url).searchParams.get('page')),
      waitForSelector: async () => {},
      locator: () => ({ press: async () => {} }),
      waitForTimeout: async () => {},
      content: async () => card('N82E16800000001') + card(`N82E1680000000${visited.length + 1}`),
    }),
    close: async () => { closed = true; },
  });
  try {
    const products = await searchNewegg('gaming laptop', 15, 3, 10);
    assert.equal(products.length, 11);
    assert.deepEqual(visited, Array.from({ length: 10 }, (_, i) => String(i + 3)));
    assert.equal(closed, true);
  } finally { chromium.launch = original; }
});

test('rejects invalid page ranges before opening a browser', async () => {
  for (const [start, count] of [[1, 21], [1, 0], [95, 10], [1.5, 2], [1, 2.5]]) {
    await assert.rejects(searchNewegg('gaming laptop', 15, start, count), /[Pp]age/);
  }
});
