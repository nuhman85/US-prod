import test from "node:test";
import assert from "node:assert/strict";
import { detectSearchQuery, parseProducts } from "../src/import-html.js";

test("detects the search query from the canonical Best Buy URL", () => {
  const html = `<link rel="canonical" href="https://www.bestbuy.com/site/searchpage.jsp?st=Dell%20Inspiron%2015.6%22%20Touchscreen%20Laptop">`;
  assert.equal(detectSearchQuery(html), 'Dell Inspiron 15.6" Touchscreen Laptop');
});

test("detects the search query from embedded page data", () => {
  const html = `<script type="application/json">{"searchQuery":"iphone 17"}</script>`;
  assert.equal(detectSearchQuery(html), "iphone 17");
});

test("detects the search query from the saved page search input", () => {
  const html = `<input type="search" value="Dell Inspiron 15.6&quot; Touchscreen Laptop">`;
  assert.equal(detectSearchQuery(html), 'Dell Inspiron 15.6" Touchscreen Laptop');
});

test("falls back to the saved Best Buy filename", () => {
  assert.equal(detectSearchQuery("<html></html>", "iphone 17 - Best Buy US.html"), "iphone 17");
});

test("parses unique Best Buy product cards from saved HTML", () => {
  const html = `<article class="productItem">
    <a href="/site/dell-inspiron-touchscreen/19334630.p?skuId=19334630">Dell Inspiron 15.6&quot; Touchscreen Laptop - Intel Core i5-1334U - 16GB RAM - 512GB SSD - Windows 11</a>
    <div class="price">$1,069.00</div>
  </article>`;
  const products = parseProducts(html);
  assert.equal(products.length, 1);
  assert.equal(products[0].sku, "19334630");
  assert.equal(products[0].price, 1069);
  assert.ok(products[0].specifications.length >= 3);
});

test("parses embedded Best Buy search JSON", () => {
  const html = `<script type="application/json">{"products":[{"sku":"18390512","name":"Samsung Tablet 512GB Storage","salePrice":1799.99,"productUrl":"/site/samsung-tablet/18390512.p?skuId=18390512"}]}</script>`;
  const product = parseProducts(html)[0];
  assert.deepEqual({ ...product, specifications: undefined }, {
    sku: "18390512", name: "Samsung Tablet 512GB Storage",
    url: "https://www.bestbuy.com/site/samsung-tablet/18390512.p",
    price: 1799.99, currency: "USD", imageUrl: null,
    modelNumber: null, mpn: null, upc: null, specifications: undefined,
  });
  assert.deepEqual(product.specifications, [{ group: "Storage", name: "Storage", value: "512GB Storage" }]);
});

test("pairs prices with their SKU in Best Buy Apollo cache data", () => {
  const html = `<script>(window.cache ??= []).push({"rehydrate":{"result":{"data":{"documents":[
    {"product":{"__typename":"Product","skuId":"6684444","url":{"skuSpecificUrl":"https://www.bestbuy.com/product/google-pixel-11/ABC/sku/6684444"},"name":{"short":"Google Pixel 11 256GB"},"price":{"skuId":"6684444","customerPrice":899},"optional":undefined}},
    {"product":{"__typename":"Product","skuId":"6684615","url":{"skuSpecificUrl":"https://www.bestbuy.com/product/google-pixel-11-pro-fold/XYZ/sku/6684615"},"name":{"short":"Google Pixel 11 Pro Fold 256GB"},"price":{"skuId":"6684615","customerPrice":1899}}}
  ]}}}})</script>`;
  const products = parseProducts(html);
  assert.deepEqual(products.map(({ sku, price }) => ({ sku, price })), [
    { sku: "6684444", price: 899 },
    { sku: "6684615", price: 1899 },
  ]);
});

test("ignores colour variant links inside product cards", () => {
  const html = `<article class="productItem">
    <a href="/site/standing-desk-white/17160722.p?skuId=17160722">Standing Desk - 72&quot; White Top</a>
    <div class="price">$493.35</div>
    <a href="/site/standing-desk-black/17160721.p?skuId=17160721">Colour: Black</a>
  </article>`;
  const products = parseProducts(html);
  assert.equal(products.length, 1);
  assert.equal(products[0].sku, "17160722");
  assert.deepEqual(products[0].specifications, [
    { group: "Dimensions", name: "Top Width", value: "72" },
  ]);
});
