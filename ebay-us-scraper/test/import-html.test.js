import test from "node:test";
import assert from "node:assert/strict";
import { parsePage } from "../src/import-html.js";

test("parses an eBay card and adds American shipping to price", () => {
  const html = `<link rel="canonical" href="https://www.ebay.com/sch/i.html?_nkw=standing+desk">
    <li class="s-card"><a class="s-card__link" href="https://www.ebay.com/itm/123456789012?x=1">Desk Opens in a new window or tab</a>
    <div class="s-card__title">Standing Desk Opens in a new window or tab</div>
    <span class="s-card__price">C $86.57</span><span>+C $28.08 shipping</span></li>`;
  const page = parsePage(html);
  assert.equal(page.searchTerm, "standing desk");
  assert.deepEqual(page.products[0], {
    url: "https://www.ebay.com/itm/123456789012", itemId: "123456789012", name: "Standing Desk", imageUrl: null,
    itemPrice: 86.57, shippingFee: 28.08, totalPrice: 114.65, currency: "USD",
    condition: null, shippingText: "+C $28.08 shipping", modelNumber: null, mpn: null, upc: null, searchTerm: "standing desk",
    specifications: { features: ["standing desk"] },
  });
});

test("treats free shipping as zero", () => {
  const html = `<li class="s-card"><a href="/itm/987654321098">Desk</a><div class="s-card__title">Desk</div><span class="s-card__price">C $100.00</span><span>Free 3-day shipping</span></li>`;
  assert.equal(parsePage(html).products[0].totalPrice, 100);
});

test("does not limit the number of HTML listings by default", () => {
  const cards = Array.from({ length: 20 }, (_, index) => {
    const itemId = String(100000000000 + index);
    return `<li class="s-card"><a href="/itm/${itemId}">Desk ${index}</a><div class="s-card__title">Desk ${index}</div><span class="s-card__price">C $10.00</span><span>Free shipping</span></li>`;
  }).join("");
  assert.equal(parsePage(cards).products.length, 20);
  assert.equal(parsePage(cards, { maxItems: 7 }).products.length, 7);
});
