#!/usr/bin/env node
import "dotenv/config";
import { parseArgs, helpText } from "./args.js";
import { createPool, ensureSchema, saveProduct } from "./database.js";
import { scrapeProducts } from "./scraper.js";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(helpText);
    return;
  }

  const pool = createPool(process.env.DATABASE_URL);
  try {
    await ensureSchema(pool);
    console.log(`Searching Best Buy US for “${args.query}” (results ${args.from}–${args.to})`);
    const products = await scrapeProducts({
      ...args,
      onProduct: async (product) => {
        await saveProduct(pool, product);
        console.log(`[${product.position}] saved ${product.sku} — ${product.name} — ${product.price == null ? "price unavailable" : `$${product.price.toFixed(2)} ${product.currency}`}`);
      },
    });
    console.log(`Done. Saved ${products.length} product${products.length === 1 ? "" : "s"} to bestbuy_products.`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`Scrape failed: ${error.message}`);
  process.exitCode = 1;
});
