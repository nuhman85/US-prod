import test from "node:test";
import assert from "node:assert/strict";
import { parseArgs } from "../src/args.js";
import { priceToNumber, skuFromUrl } from "../src/scraper.js";

test("defaults to results 1 through 15", () => {
  assert.deepEqual(parseArgs(["Samsung Galaxy Tab S10+ 512GB"]), {
    query: "Samsung Galaxy Tab S10+ 512GB", from: 1, to: 15,
  });
});

test("supports a result range", () => {
  assert.deepEqual(parseArgs(["laptop", "--from", "10", "--to", "15"]), {
    query: "laptop", from: 10, to: 15,
  });
});

test("rejects an inverted range", () => {
  assert.throws(() => parseArgs(["laptop", "--from", "10", "--to", "5"]), /cannot be greater/);
});

test("extracts American product SKU and numeric prices", () => {
  assert.equal(skuFromUrl("https://www.bestbuy.com/en-ca/product/name/17901234"), "17901234");
  assert.equal(priceToNumber("$1,299.99"), 1299.99);
  assert.equal(priceToNumber(null), null);
});
