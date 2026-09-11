import test from "node:test";
import assert from "node:assert/strict";

process.env.DATABASE_URL = "postgresql://unused:unused@127.0.0.1:1/unused";
process.env.MATCHER_UNIT_TEST = "true";

const { canonicalSearchTerm, metadataMatch, phoneModel, productKind, rank } = await import("../server.js");

const pixel10Master = "Google Pixel 10 - Unlocked Smartphone with Gemini - Obsidian - 128 GB | Android phone, advanced triple rear camera, 20x zoom, fast-charging 24+ hour battery, 6.3 Actua Display";

test("extracts distinct Pixel models and variants", () => {
  assert.equal(phoneModel(pixel10Master), "pixel:10:standard");
  assert.equal(phoneModel("Google Pixel 10a 128GB"), "pixel:10a:standard");
  assert.equal(phoneModel("Google Pixel 10 Pro XL 256GB"), "pixel:10:pro-xl");
  assert.equal(phoneModel("Google Pixel 11 Pro Fold"), "pixel:11:pro-fold");
});

test("derives a canonical candidate search term from the master title", () => {
  assert.equal(canonicalSearchTerm(pixel10Master), "Google Pixel 10");
  assert.equal(canonicalSearchTerm("Apple iPhone 16 Pro Max 256GB"), "Apple iPhone 16");
  assert.equal(canonicalSearchTerm("Samsung Galaxy S25 Ultra 512GB"), "Samsung Galaxy S25");
});

test("classifies Pixel cases as accessories", () => {
  assert.equal(productKind("Protective Case for Google Pixel 10"), "phone-case");
  assert.equal(productKind("Google Pixel 10 128GB Unlocked"), "phone");
});

test("accepts exact model and storage while rejecting conflicting variants", () => {
  assert.notEqual(metadataMatch(pixel10Master, { title: "Google - Pixel 10 128GB (Unlocked) - Indigo" }), null);
  assert.equal(metadataMatch(pixel10Master, { title: "Google Pixel 10a 128GB Unlocked" }), null);
  assert.equal(metadataMatch(pixel10Master, { title: "Google Pixel 10 256GB Unlocked" }), null);
  assert.equal(metadataMatch(pixel10Master, { title: "Samsung Galaxy S25 128GB Unlocked" }), null);
});

test("hybrid ranking keeps an exact Pixel match and rejects accessories", () => {
  const rows = [
    { id: "exact", title: "Google - Pixel 10 128GB (Unlocked) - Indigo", price: 799 },
    { id: "variant", title: "Google Pixel 10a 128GB Unlocked", price: 499 },
    { id: "case", title: "Protective Case for Google Pixel 10", price: 20 },
  ];
  const result = rank(pixel10Master, rows, 5, new Map([["exact", 0.96], ["variant", 0.77], ["case", 0.48]]));
  assert.deepEqual(result.map((item) => item.id), ["exact"]);
  assert.equal(result[0].match_method, "hybrid");
  assert.equal(result[0].score_breakdown.semantic, 96);
});
