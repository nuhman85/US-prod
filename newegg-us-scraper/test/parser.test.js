import test from "node:test";
import assert from "node:assert/strict";
import { buildSearchUrl, parseProducts } from "../src/parser.js";

test("builds paginated live-search URLs with the standard page boundary", () => {
  const url = new URL(buildSearchUrl("Samsung Galaxy A16", { page: 2, pageSize: 36 }));
  assert.equal(url.searchParams.get("d"), "Samsung Galaxy A16");
  assert.equal(url.searchParams.get("page"), "2");
  assert.equal(url.searchParams.get("PageSize"), "36");
});

test("parses the first 15 Newegg search cards", () => {
  const cards = Array.from({ length: 16 }, (_, index) => `<div class="item-cell" data-item-number="N82E168000${index}"><a href="https://www.newegg.com/p/N82E168000${index}">Quick View</a><a class="item-title" href="https://www.newegg.com/p/N82E168000${index}?Item=N82E168000${index}">Example Gaming Laptop ${index}, Intel Core i7, 16GB RAM, 1TB SSD</a><div class="item-brand"><img title="Example"></div><div class="price-current">$${799 + index}.99</div><div class="item-seller">Sold by Newegg</div></div>`).join("");
  const products = parseProducts(`<title>Search Results: gaming laptop - Newegg.com</title>${cards}`);
  assert.equal(products.length, 15);
  assert.equal(products[0].searchTerm, "gaming laptop");
  assert.equal(products[0].price, 799.99);
  assert.equal(products[0].sku, "N82E1680000");
  assert.equal(products[0].brand, "Example");
  assert.equal(products[0].modelNumber, null);
  assert.equal(products[0].mpn, null);
  assert.equal(products[0].upc, null);
  assert.match(products[0].name, /^Example Gaming Laptop/);
});

test("rejects non-Newegg and non-product URLs", () => {
  const html = `<title>Search Results: laptop - Newegg.com</title><div class="item-cell"><a class="item-title" href="https://example.com/p/ABC">Wrong site product</a><div class="price-current">$10.00</div></div>`;
  assert.deepEqual(parseProducts(html), []);
});
