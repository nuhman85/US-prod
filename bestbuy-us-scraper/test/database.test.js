import test from "node:test";
import assert from "node:assert/strict";
import { saveProduct } from "../src/database.js";

test("saving a product also upserts its search-term association", async () => {
  const calls = [];
  const pool = { query: async (...args) => calls.push(args) };
  await saveProduct(pool, {
    searchQuery: "apple macbook air 13 inch",
    searchUrl: "https://www.bestbuy.com/en-ca/search?search=apple%20macbook%20air%2013%20inch",
    position: 1,
    sku: "12345678",
    name: "Apple MacBook Air 13 inch",
    url: "https://www.bestbuy.com/en-ca/product/macbook/12345678",
    price: 1299.99,
    currency: "USD",
    specifications: [],
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0][0], /INSERT INTO bestbuy_product_searches/);
  assert.match(calls[0][0], /ON CONFLICT \(product_id, search_query\)/);
  assert.equal(calls[0][1][0], "apple macbook air 13 inch");
});
