import test from "node:test";
import assert from "node:assert/strict";

import { parseProducts } from "../src/import-html.js";

test("parses current Walmart grid cards and search term from the page title", () => {
  const cards = Array.from({ length: 16 }, (_, index) => {
    const itemId = 17789520103 + index;
    const dollars = 699 + index;
    return `
      <div data-item-id="item-${index}" data-dca-id="${itemId}">
        <a href="https://www.walmart.com/ip/Dell-Inspiron-14-Laptop/${itemId}?classType=VARIANT&from=/search">
          <h3>Dell Inspiron 14 Laptop ${index + 1}, 16GB RAM, 512GB SSD</h3>
        </a>
        <span data-test-id="gpt-global-product-title">Dell Inspiron 14 Laptop ${index + 1}, 16GB RAM, 512GB SSD</span>
        <div data-testid="unified-global-product-price" aria-label="Price $ ${dollars}.99"></div>
      </div>`;
  }).join("");
  const products = parseProducts(`<!doctype html><title>dell inspiron 14 laptop - Walmart.com</title>${cards}`);

  assert.equal(products.length, 15);
  assert.equal(products[0].searchTerm, "dell inspiron 14 laptop");
  assert.equal(products[0].sku, "17789520103");
  assert.equal(products[0].price, 699.99);
  assert.equal(products[0].brand, "Dell");
  assert.equal(products[0].url, "https://www.walmart.com/ip/Dell-Inspiron-14-Laptop/17789520103");
});

test("prefers visible cards and saved-page title over stale embedded search state", () => {
  const staleState = {
    query: { q: "Apple 2021 MacBook Pro with M1 Max Chip" },
    props: { pageProps: { item: {
      __typename: "Product",
      usItemId: "15500064838",
      name: "Pre-Owned Macbook Pro 16-inch M1 Max",
      canonicalUrl: "/ip/Macbook-Pro/15500064838",
      // Walmart sometimes serializes embedded prices in cents. This stale
      // value must not override the visible card's decimal-dollar price.
      priceInfo: { currentPrice: 3197 },
    } } },
  };
  const cards = Array.from({ length: 15 }, (_, index) => {
    const itemId = 90000000000 + index;
    return `<article data-item-id="${itemId}">
      <a href="/ip/BLACK-DECKER-12-Cup-Coffee-Maker/${itemId}">
        <h3>BLACK+DECKER 12-Cup Drip Coffee Maker, Model ${index + 1}</h3>
      </a>
      <div data-testid="product-price">Current price $${29 + index}.99</div>
    </article>`;
  }).join("");
  const html = `<!doctype html><title>BLACK DECKER 12-Cup Drip Coffee Maker - Walmart.com</title>
    <script id="__NEXT_DATA__" type="application/json">${JSON.stringify(staleState)}</script>${cards}`;

  const products = parseProducts(html);

  assert.equal(products.length, 15);
  assert.equal(products[0].searchTerm, "BLACK DECKER 12-Cup Drip Coffee Maker");
  assert.equal(products[0].price, 29.99);
  assert.match(products[0].name, /Coffee Maker/);
  assert.doesNotMatch(products[0].name, /Macbook/i);
});

test("preserves decimals when Walmart splits dollars and cents into spans", () => {
  const html = `<!doctype html><title>Samsung Galaxy A16 - Walmart.com</title>
    <div data-dca-id="17283750032">
      <a href="/ip/Open-Box-Samsung-Galaxy-A16/17283750032">
        <h3>Open Box Samsung Galaxy A16 Smartphone $129.99</h3>
      </a>
      <div data-automation-id="product-price"><span>$</span><span>129</span><span>99</span></div>
      <h3 data-automation-id="product-title">Open Box Samsung Galaxy A16 Smartphone</h3>
    </div>`;

  const [product] = parseProducts(html);

  assert.equal(product.price, 129.99);
  assert.equal(product.name, "Open Box Samsung Galaxy A16 Smartphone");
});

test("reads split price spans when Walmart's link price is malformed", () => {
  const html = `<!doctype html><title>Samsung Galaxy A16 - Walmart.com</title>
    <div data-dca-id="17256704364">
      <a href="/ip/Pre-Owned-Samsung-Galaxy-A16/17256704364">
        <h3>Pre-Owned Samsung Galaxy A16 From $NaN/undefined</h3>
      </a>
      <div data-automation-id="product-price"><span>$</span><span>125</span><span>99</span><span>/undefined</span></div>
      <h3 data-automation-id="product-title">Pre-Owned Samsung Galaxy A16</h3>
    </div>`;

  const [product] = parseProducts(html);

  assert.equal(product.price, 125.99);
});
