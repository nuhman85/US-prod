import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { load } from "cheerio";
import pg from "pg";

const { Pool } = pg;

function clean(value) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function imageUrl(value) {
  const candidate = clean(value);
  return /^https?:\/\//i.test(candidate || "") ? candidate : null;
}

function productIdentifiers(name) {
  const mpn = name?.match(/\bMPN\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{2,})\b/i)?.[1];
  const model = name?.match(/\bmodel(?:\s+(?:number|no\.?))?\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{2,})\b/i)?.[1]
    || name?.match(/\b((?:UN|QN|LH|HG)\d{2}[A-Z][A-Z0-9._/-]{3,})\b/i)?.[1];
  return {
    modelNumber: clean(model || mpn),
    mpn: clean(mpn),
    upc: clean(name?.match(/\bUPC\s*[:#-]?\s*(\d{12})\b/i)?.[1]),
  };
}

function money(value) {
  const match = clean(value)?.replace(/,/g, "").match(/(?:C\s*)?\$\s*(\d+(?:\.\d{1,2})?)/i);
  return match ? Number(match[1]) : null;
}

function canonicalUrl(href) {
  try {
    const url = new URL(href, "https://www.ebay.com");
    const match = url.pathname.match(/\/itm\/(?:[^/]+\/)?(\d{9,15})/);
    if (!match || !/(^|\.)ebay\.(ca|com)$/.test(url.hostname)) return null;
    return `https://www.ebay.com/itm/${match[1]}`;
  } catch {
    return null;
  }
}

function getSearchTerm($, override) {
  if (clean(override)) return clean(override);
  const candidates = [
    $('meta[rel="canonical"]').attr("href"),
    $('link[rel="canonical"]').attr("href"),
    $("form input[name='_nkw']").attr("value"),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (!candidate.includes("/") && !candidate.includes("?")) return clean(candidate);
    try {
      const term = new URL(candidate, "https://www.ebay.com").searchParams.get("_nkw");
      if (clean(term)) return clean(term);
    } catch { /* Try the next source. */ }
  }
  return clean($("title").text().replace(/\s+(?:for sale\s*\|\s*eBay|\|\s*eBay).*$/i, ""));
}

function shippingFromCard($, card) {
  const texts = card.find("span, div").filter((_index, node) => $(node).children().length === 0)
    .map((_index, node) => clean($(node).text())).get();
  const shippingText = texts.find((text) => /shipping|delivery|local pickup/i.test(text) && text.length < 120) || null;
  if (!shippingText) return { shippingFee: null, shippingText: null };
  if (/free\b.*(?:shipping|delivery)|local pickup/i.test(shippingText)) {
    return { shippingFee: 0, shippingText };
  }
  return { shippingFee: money(shippingText), shippingText };
}

function extractSpecifications($, card, name, condition) {
  const leafTexts = card.find("span, div").filter((_index, node) => $(node).children().length === 0)
    .map((_index, node) => clean($(node).text())).get().filter(Boolean);
  const specifications = {};
  if (condition) specifications.condition = condition;
  const dimensions = [...name.matchAll(/\b(\d+(?:\.\d+)?(?:\s*[x×]\s*\d+(?:\.\d+)?){0,2})\s*(?:in(?:ch(?:es)?)?|["”])/gi)]
    .map((match) => clean(`${match[1]} in`));
  if (dimensions.length) specifications.dimensions = [...new Set(dimensions)];
  const features = [
    ["electric", /\belectric\b/i], ["height adjustable", /\b(?:height\s+)?adjustable\b/i],
    ["standing desk", /\bstanding desk|sit[ -]stand\b/i], ["mobile", /\bmobile|rolling\b/i],
    ["drawers", /\bdrawers?\b/i], ["keyboard tray", /\bkeyboard tray\b/i],
    ["power outlet", /\bpower outlet\b/i], ["LED lighting", /\bLED\b/i],
    ["memory settings", /\bmemory (?:height )?settings?\b/i],
  ].filter(([, pattern]) => pattern.test(name)).map(([feature]) => feature);
  if (features.length) specifications.features = features;
  const priceValues = card.find(".s-card__price, .s-item__price").map((_index, node) => money($(node).text()))
    .get().filter((value) => value !== null);
  if (priceValues.length > 1) specifications.price_range = { min: priceValues[0], max: priceValues.at(-1) };
  const find = (pattern) => leafTexts.find((text) => pattern.test(text));
  const values = {
    buying_format: find(/^(?:Buy It Now|or Best Offer|Auction)$/i),
    item_location: find(/^from\s+/i)?.replace(/^from\s+/i, ""),
    sold: find(/\b\d[\d,+]*\s+sold\b/i),
    watchers: find(/\b\d[\d,+]*\s+watchers?\b/i),
    seller_feedback: find(/\d+(?:\.\d+)?%\s+positive/i),
  };
  for (const [key, value] of Object.entries(values)) if (value) specifications[key] = value;
  return specifications;
}

export function parsePage(html, options = {}) {
  const $ = load(html);
  const configuredLimit = options.maxItems ?? process.env.MAX_ITEMS;
  const parsedLimit = configuredLimit === undefined || configuredLimit === ""
    ? Number.POSITIVE_INFINITY
    : Number.parseInt(String(configuredLimit), 10);
  const maxItems = Number.isInteger(parsedLimit) && parsedLimit > 0
    ? parsedLimit
    : Number.POSITIVE_INFINITY;
  const searchTerm = getSearchTerm($, options.searchTerm ?? process.env.SEARCH_TERM);
  const products = [];
  const seen = new Set();

  $("li.s-card, li.s-item, .s-card").each((_index, element) => {
    if (products.length >= maxItems) return false;
    const card = $(element);
    const titleLink = card.find('a[href*="/itm/"]').filter((_i, link) => clean($(link).text())).last();
    const url = canonicalUrl(titleLink.attr("href"));
    let name = clean(card.find(".s-card__title, .s-item__title").first().text()) || clean(titleLink.text());
    name = clean(name?.replace(/Opens in a new window or tab/gi, ""));
    if (!url || !name || /^Shop on eBay$/i.test(name) || seen.has(url)) return;

    const priceTexts = card.find(".s-card__price, .s-item__price").map((_i, node) => clean($(node).text())).get();
    const price = money(priceTexts.find((text) => money(text) !== null));
    if (price === null) return;

    const { shippingFee, shippingText } = shippingFromCard($, card);
    const condition = clean(card.find(".s-card__subtitle, .SECONDARY_INFO").first().text());
    const image = card.find("img").first();
    const itemId = url.split("/").pop();
    const identifiers = productIdentifiers(name);
    seen.add(url);
    products.push({
      url,
      itemId,
      name,
      imageUrl: imageUrl(image.attr("src") || image.attr("data-src")),
      ...identifiers,
      itemPrice: price,
      shippingFee,
      totalPrice: shippingFee === null ? null : Number((price + shippingFee).toFixed(2)),
      currency: "USD",
      condition,
      shippingText,
      searchTerm,
      specifications: extractSpecifications($, card, name, condition),
    });
  });

  return { searchTerm, products };
}

export function parseProducts(html, options = {}) {
  return parsePage(html, options).products;
}

export async function saveProducts(products, searchTerm, { log = true } = {}) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to import products");
  if (!products.length) throw new Error("No eBay products with item URLs and prices were found");
  const effectiveSearchTerm = clean(searchTerm || products[0]?.searchTerm);
  if (!effectiveSearchTerm) throw new Error("A search term is required to import products");
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS ebay_us_products (
        id BIGSERIAL PRIMARY KEY,
        url TEXT NOT NULL UNIQUE,
        item_id TEXT NOT NULL,
        name TEXT NOT NULL,
        item_price NUMERIC(12, 2) NOT NULL,
        shipping_fee NUMERIC(12, 2),
        total_price NUMERIC(12, 2),
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        condition TEXT,
        shipping_text TEXT,
        image_url TEXT,
        model_number TEXT,
        mpn TEXT,
        upc TEXT,
        search_term TEXT,
        specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
        scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`ALTER TABLE ebay_us_products
      ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '{}'::jsonb`);
    await client.query("ALTER TABLE ebay_us_products ADD COLUMN IF NOT EXISTS image_url TEXT");
    await client.query("ALTER TABLE ebay_us_products ADD COLUMN IF NOT EXISTS model_number TEXT");
    await client.query("ALTER TABLE ebay_us_products ADD COLUMN IF NOT EXISTS mpn TEXT");
    await client.query("ALTER TABLE ebay_us_products ADD COLUMN IF NOT EXISTS upc TEXT");
    await client.query(`
      CREATE TABLE IF NOT EXISTS ebay_us_searches (
        id BIGSERIAL PRIMARY KEY,
        search_term TEXT NOT NULL,
        normalized_term TEXT NOT NULL UNIQUE,
        imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS ebay_us_search_results (
        search_id BIGINT NOT NULL REFERENCES ebay_us_searches(id) ON DELETE CASCADE,
        product_id BIGINT NOT NULL REFERENCES ebay_us_products(id) ON DELETE CASCADE,
        position INTEGER,
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (search_id, product_id)
      )
    `);
    const searchResult = await client.query(`
      INSERT INTO ebay_us_searches (search_term, normalized_term, imported_at)
      VALUES ($1, LOWER($1), NOW())
      ON CONFLICT (normalized_term) DO UPDATE SET
        search_term=EXCLUDED.search_term, imported_at=NOW()
      RETURNING id
    `, [effectiveSearchTerm]);
    const searchId = searchResult.rows[0].id;
    for (const [index, product] of products.entries()) {
      const productResult = await client.query(`
        INSERT INTO ebay_us_products
          (url, item_id, name, item_price, shipping_fee, total_price, currency,
           condition, shipping_text, image_url, model_number, mpn, upc, search_term, specifications, scraped_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,NOW())
        ON CONFLICT (url) DO UPDATE SET
          item_id=EXCLUDED.item_id, name=EXCLUDED.name,
          item_price=EXCLUDED.item_price, shipping_fee=EXCLUDED.shipping_fee,
          total_price=EXCLUDED.total_price, currency=EXCLUDED.currency,
          condition=EXCLUDED.condition, shipping_text=EXCLUDED.shipping_text,
          image_url=COALESCE(EXCLUDED.image_url, ebay_us_products.image_url),
          model_number=COALESCE(EXCLUDED.model_number, ebay_us_products.model_number),
          mpn=COALESCE(EXCLUDED.mpn, ebay_us_products.mpn),
          upc=COALESCE(EXCLUDED.upc, ebay_us_products.upc),
          search_term=EXCLUDED.search_term, specifications=EXCLUDED.specifications,
          scraped_at=NOW()
        RETURNING id
      `, [product.url, product.itemId, product.name, product.itemPrice,
        product.shippingFee, product.totalPrice, product.currency, product.condition,
        product.shippingText, product.imageUrl, product.modelNumber, product.mpn, product.upc, effectiveSearchTerm,
        JSON.stringify(product.specifications)]);
      await client.query(`
        INSERT INTO ebay_us_search_results (search_id, product_id, position, last_seen_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (search_id, product_id) DO UPDATE SET
          position=EXCLUDED.position, last_seen_at=NOW()
      `, [searchId, productResult.rows[0].id, index + 1]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
  if (log) {
    console.table(products.map(({ itemId, name, itemPrice, shippingFee, totalPrice }) =>
      ({ itemId, name: name.slice(0, 55), itemPrice, shippingFee, totalPrice })));
    console.log(`Imported ${products.length} products for “${effectiveSearchTerm}”.`);
  }
  return products;
}

async function main() {
  const file = process.argv[2];
  const searchTerm = process.argv[3];
  if (!file) throw new Error("Usage: npm run import-html -- /path/to/ebay-search.html [search term]");
  const page = parsePage(await readFile(file, "utf8"), { searchTerm });
  await saveProducts(page.products, page.searchTerm);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`Import failed: ${error.message}`);
    process.exitCode = 1;
  });
}
