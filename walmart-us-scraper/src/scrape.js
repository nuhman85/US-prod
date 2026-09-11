import "dotenv/config";
import { chromium } from "playwright";
import pg from "pg";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SEARCH_URL = process.env.SEARCH_URL;
const SEARCH_TERM = process.env.SEARCH_TERM || (() => {
  try {
    return new URL(SEARCH_URL).searchParams.get("q")?.replace(/\s+/g, " ").trim();
  } catch {
    return null;
  }
})();
const MAX_ITEMS = Number.parseInt(process.env.MAX_ITEMS || "15", 10);
const HEADLESS = process.env.HEADLESS === "true";
const PROFILE_DIR = path.resolve(ROOT, process.env.PROFILE_DIR || ".walmart-browser-profile");
const BROWSER_CHANNEL = process.env.BROWSER_CHANNEL || undefined;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!SEARCH_URL) throw new Error("SEARCH_URL is required");
if (!SEARCH_TERM) throw new Error("SEARCH_TERM is required, or SEARCH_URL must contain a q parameter");
if (!Number.isInteger(MAX_ITEMS) || MAX_ITEMS < 1) throw new Error("MAX_ITEMS must be a positive integer");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

function normalizeProductUrl(href) {
  try {
    const url = new URL(href, "https://www.walmart.com");
    if (url.hostname !== "www.walmart.com" && url.hostname !== "walmart.com") return null;
    if (!url.pathname.includes("/ip/")) return null;
    url.protocol = "https:";
    url.hostname = "www.walmart.com";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function waitForHumanIfNeeded(page) {
  const isBlocked = () => page.evaluate(() => {
    const text = document.body?.innerText?.toLowerCase() || "";
    return /human verification|verify you are human|press and hold|captcha|robot or human/.test(text);
  });
  const blocked = await isBlocked();
  if (!blocked) return;
  if (HEADLESS) throw new Error("Human verification detected. Run with HEADLESS=false.");

  console.log("\nWalmart human verification detected in the browser.");
  console.log("Complete it in the open browser; scraping will resume automatically.");
  console.log("If the challenge stays stuck, the page will retry every 20 seconds.");
  const deadline = Date.now() + 10 * 60_000;
  let checks = 0;
  while (Date.now() < deadline) {
    await page.waitForTimeout(2_000);
    if (!await isBlocked()) {
      console.log("Verification cleared. Resuming...");
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      return;
    }
    checks += 1;
    if (checks % 10 === 0) {
      console.log("Verification still present; reloading and trying again...");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 }).catch(() => {});
    }
  }
  throw new Error("Human verification was not completed within 10 minutes");
}

async function collectProductUrls(page) {
  console.log(`Opening search: ${SEARCH_URL}`);
  await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await waitForHumanIfNeeded(page);

  const urls = new Set();
  for (let attempt = 0; attempt < 20 && urls.size < MAX_ITEMS; attempt += 1) {
    await waitForHumanIfNeeded(page);
    const hrefs = await page.locator('a[href*="/ip/"]').evaluateAll((links) =>
      links.map((link) => link.href),
    );
    for (const href of hrefs) {
      const normalized = normalizeProductUrl(href);
      if (normalized) urls.add(normalized);
      if (urls.size === MAX_ITEMS) break;
    }
    if (urls.size < MAX_ITEMS) {
      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(1200);
    }
  }

  const result = [...urls].slice(0, MAX_ITEMS);
  if (result.length === 0) throw new Error("No product URLs found on the search page");
  console.log(`Found ${result.length} unique product URLs.`);
  return result;
}

async function scrapeProduct(page, url) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await waitForHumanIfNeeded(page);
      await page.waitForTimeout(1500);

      const product = await page.evaluate(() => {
    const clean = (value) => value?.replace(/\s+/g, " ").trim() || null;
    const firstText = (selectors) => {
      for (const selector of selectors) {
        const text = clean(document.querySelector(selector)?.textContent);
        if (text) return text;
      }
      return null;
    };
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .flatMap((el) => {
        try {
          const parsed = JSON.parse(el.textContent);
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch { return []; }
      })
      .flatMap((value) => value?.["@graph"] || value)
      .find((value) => value?.["@type"] === "Product") || {};
    const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : (jsonLd.offers || {});

    const specifications = {};
    const addSpec = (key, value) => {
      key = clean(key); value = clean(value);
      if (key && value && key.length < 150 && value.length < 2000) specifications[key] = value;
    };
    for (const row of document.querySelectorAll("table tr")) {
      const cells = row.querySelectorAll("th, td");
      if (cells.length >= 2) addSpec(cells[0].textContent, cells[1].textContent);
    }
    for (const node of document.querySelectorAll("dl")) {
      const terms = node.querySelectorAll("dt");
      for (const term of terms) addSpec(term.textContent, term.nextElementSibling?.textContent);
    }
    for (const item of document.querySelectorAll('[data-testid*="spec"], [class*="specification"] li')) {
      const children = item.children;
      if (children.length >= 2) addSpec(children[0].textContent, children[1].textContent);
      else {
        const text = clean(item.textContent);
        const separator = text?.indexOf(":");
        if (separator > 0) addSpec(text.slice(0, separator), text.slice(separator + 1));
      }
    }

    const rawPrice = offers.price ?? firstText([
      '[itemprop="price"]', '[data-automation-id="product-price"]',
      '[data-testid="product-price"]', '[class*="price-current"]',
    ]);
    const priceText = rawPrice == null ? null : String(rawPrice);
    const priceMatch = priceText?.replace(/,/g, "").match(/\d+(?:\.\d{1,2})?/);

        return {
      name: clean(jsonLd.name) || firstText(["h1", '[data-automation-id="product-title"]']),
      price: priceMatch ? Number(priceMatch[0]) : null,
      currency: offers.priceCurrency || "USD",
      sku: clean(jsonLd.sku) || clean(jsonLd.mpn) || null,
      brand: clean(typeof jsonLd.brand === "object" ? jsonLd.brand?.name : jsonLd.brand),
      imageUrl: clean((Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image)
        || document.querySelector('meta[property="og:image"]')?.content),
      modelNumber: clean(jsonLd.model || jsonLd.modelNumber),
      mpn: clean(jsonLd.mpn || jsonLd.manufacturerPartNumber),
      upc: clean(jsonLd.gtin12 || jsonLd.upc),
      availability: clean(offers.availability)?.split("/").pop() || null,
      specifications,
        };
      });

      if (!product.name || /real shoppers|not robots|human verification/i.test(product.name)) {
        throw new Error("Product content was not available after verification");
      }
      return product;
    } catch (error) {
      lastError = error;
      if (attempt < 4) {
        console.log(`  Retry ${attempt}/3: ${error.message}`);
        await page.waitForTimeout(attempt * 2_000);
      }
    }
  }
  throw lastError;
}

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS walmart_us_products (
      id BIGSERIAL PRIMARY KEY,
      url TEXT NOT NULL UNIQUE,
      name TEXT,
      price NUMERIC(12, 2),
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      sku TEXT,
      brand TEXT,
      availability TEXT,
      image_url TEXT,
      model_number TEXT,
      mpn TEXT,
      upc TEXT,
      specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
      search_term TEXT NOT NULL,
      search_url TEXT NOT NULL,
      scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    ALTER TABLE walmart_us_products
    ADD COLUMN IF NOT EXISTS search_term TEXT
  `);
  await client.query("ALTER TABLE walmart_us_products ADD COLUMN IF NOT EXISTS image_url TEXT");
  await client.query("ALTER TABLE walmart_us_products ADD COLUMN IF NOT EXISTS model_number TEXT");
  await client.query("ALTER TABLE walmart_us_products ADD COLUMN IF NOT EXISTS mpn TEXT");
  await client.query("ALTER TABLE walmart_us_products ADD COLUMN IF NOT EXISTS upc TEXT");
  await client.query(`
    CREATE TABLE IF NOT EXISTS walmart_us_product_search_terms (
      product_id BIGINT NOT NULL REFERENCES walmart_us_products(id) ON DELETE CASCADE,
      search_term TEXT NOT NULL,
      search_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (product_id, search_term)
    )
  `);
  await client.query(`
    INSERT INTO walmart_us_product_search_terms (product_id, search_term, search_url)
    SELECT id, search_term, search_url
    FROM walmart_us_products
    WHERE search_term IS NOT NULL AND BTRIM(search_term) <> ''
    ON CONFLICT (product_id, search_term) DO NOTHING
  `);
}

async function upsertProduct(client, product) {
  const saved = await client.query(`
    INSERT INTO walmart_us_products
      (url, name, price, currency, sku, brand, availability, image_url, model_number, mpn, upc, specifications, search_term, search_url, scraped_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, NOW())
    ON CONFLICT (url) DO UPDATE SET
      name = EXCLUDED.name, price = EXCLUDED.price, currency = EXCLUDED.currency,
      sku = EXCLUDED.sku, brand = EXCLUDED.brand, availability = EXCLUDED.availability,
      image_url = COALESCE(EXCLUDED.image_url, walmart_us_products.image_url),
      model_number = COALESCE(EXCLUDED.model_number, walmart_us_products.model_number),
      mpn = COALESCE(EXCLUDED.mpn, walmart_us_products.mpn),
      upc = COALESCE(EXCLUDED.upc, walmart_us_products.upc),
      specifications = EXCLUDED.specifications, search_term = EXCLUDED.search_term,
      search_url = EXCLUDED.search_url,
      scraped_at = NOW()
    RETURNING id
  `, [product.url, product.name, product.price, product.currency, product.sku,
    product.brand, product.availability, product.imageUrl, product.modelNumber, product.mpn, product.upc, JSON.stringify(product.specifications), SEARCH_TERM, SEARCH_URL]);
  await client.query(`
    INSERT INTO walmart_us_product_search_terms
      (product_id, search_term, search_url, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (product_id, search_term) DO UPDATE SET
      search_url = EXCLUDED.search_url,
      updated_at = NOW()
  `, [saved.rows[0].id, SEARCH_TERM, SEARCH_URL]);
}

async function main() {
  const client = await pool.connect();
  let context;
  try {
    await ensureSchema(client);
    context = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: HEADLESS,
      channel: BROWSER_CHANNEL,
      viewport: { width: 1440, height: 1000 },
      locale: "en-US",
      slowMo: HEADLESS ? 0 : 50,
    });
    const page = context.pages()[0] || await context.newPage();
    const urls = await collectProductUrls(page);

    let saved = 0;
    for (const [index, url] of urls.entries()) {
      try {
        console.log(`[${index + 1}/${urls.length}] Scraping ${url}`);
        const product = { url, ...await scrapeProduct(page, url) };
        await upsertProduct(client, product);
        saved += 1;
        console.log(`  Saved: ${product.name || "Unknown product"} — ${product.price ?? "price unavailable"} ${product.currency}`);
      } catch (error) {
        console.error(`  Failed: ${error.message}`);
      }
    }
    console.log(`\nDone. Saved ${saved}/${urls.length} products to walmart_us_products.`);
    if (saved !== urls.length) process.exitCode = 1;
  } finally {
    await context?.close();
    client.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(`Fatal error: ${error.message}`);
  await pool.end().catch(() => {});
  process.exitCode = 1;
});
