import "dotenv/config";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { load } from "cheerio";
import pg from "pg";

const { Pool } = pg;
const file = process.argv[2];
const limit = Number.parseInt(process.env.MAX_ITEMS || "15", 10);
const configuredSearchUrl = process.env.SEARCH_URL || "https://www.walmart.com/search";
const configuredSearchTerm = process.env.SEARCH_TERM || (() => {
  try {
    return new URL(configuredSearchUrl).searchParams.get("q")?.replace(/\s+/g, " ").trim();
  } catch {
    return null;
  }
})();

function clean(value) {
  return value?.replace(/\s+/g, " ").trim() || null;
}

function parsePrice(value) {
  const text = clean(value);
  if (!text) return null;
  const match = text.match(/(?:current price(?:\s+now)?|price)?\s*\$\s*([\d,]+)(?:\.(\d{2}))?/i);
  if (!match) return null;
  const amount = Number(`${match[1].replace(/,/g, "")}.${match[2] || "00"}`);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function parseSplitPrice($, priceElement) {
  const parts = priceElement.find("span").map((_index, element) => clean($(element).text())).get();
  const symbolIndex = parts.findIndex((part) => part === "$");
  if (symbolIndex < 0) return null;
  const dollarsIndex = parts.findIndex((part, index) => index > symbolIndex && /^\d[\d,]*$/.test(part));
  if (dollarsIndex < 0) return null;
  const cents = parts.find((part, index) => index > dollarsIndex && /^\d{2}$/.test(part));
  if (!cents) return null;
  const amount = Number(`${parts[dollarsIndex].replace(/,/g, "")}.${cents}`);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function canonicalUrl(href) {
  try {
    const url = new URL(href, "https://www.walmart.com");
    if (!/^(www\.)?walmart\.com$/.test(url.hostname) || !url.pathname.includes("/ip/")) return null;
    url.protocol = "https:";
    url.hostname = "www.walmart.com";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function extractSpecifications(name) {
  const specs = { source_title: name };
  const capture = (key, regex) => {
    const match = name.match(regex);
    if (match) specs[key] = clean(match[1] || match[0]);
  };
  capture("condition", /\b(Open Box|Refurbished(?: \([^)]+\))?|Renewed)\b/i);
  capture("screen_size", /\b(\d{2}(?:\.\d+)?)\s*(?:-|\s)?(?:inch|inches|["”'])/i);
  specs.touchscreen = /touch\s*screen|touch laptop|fhd touch\b/i.test(name);
  capture("processor", /\b((?:Intel(?: Core)?|AMD Ryzen)\s+(?:Core\s+Ultra\s+)?(?:i[3579][ -]?)?[A-Z0-9-]{3,}(?:\s+up to\s+[\d.]+GHz)?)/i);
  capture("memory", /\b(\d+\s*GB(?:\s+DDR\d)?(?:\s+RAM)?)\b/i);
  const storage = [...name.matchAll(/\b(\d+(?:\.\d+)?\s*(?:TB|GB)\s*(?:PCIe\s+|NVMe\s+)?(?:SSD|eMMC|UFS|Storage))\b/gi)]
    .map((match) => clean(match[1]));
  if (storage.length) specs.storage = [...new Set(storage)];
  capture("resolution", /\b(\d{3,4}\s*x\s*\d{3,4})\b/i);
  capture("display", /\b(FHD\+?|HD|WVA|IPS|LED-Backlit)\b/i);
  capture("graphics", /\b((?:Intel\s+)?(?:UHD|Iris Xe)\s+Graphics)\b/i);
  capture("operating_system", /\b(Windows\s+(?:10|11)(?:\s+(?:Home|Pro|S Mode|Home in S Mode))?|ChromeOS)\b/i);
  return specs;
}

function productIdentifiers(name, value = {}) {
  const labeledModel = name?.match(/\bmodel(?:\s+(?:number|no\.?))?\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{2,})\b/i)?.[1];
  const samsungModel = name?.match(/\b((?:UN|QN|LH|HG)\d{2}[A-Z][A-Z0-9._/-]{3,})\b/i)?.[1];
  const labeledMpn = name?.match(/\bMPN\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{2,})\b/i)?.[1];
  const labeledUpc = name?.match(/\bUPC\s*[:#-]?\s*(\d{12})\b/i)?.[1];
  return {
    modelNumber: clean(value.modelNumber || value.model || labeledModel || samsungModel),
    mpn: clean(value.mpn || value.manufacturerPartNumber || labeledMpn),
    upc: clean(value.upc || value.gtin12 || labeledUpc),
  };
}

function detectSearchContext($, sourceName) {
  // Prefer what the user actually saved over hydration state. Walmart can keep
  // stale __NEXT_DATA__ from the previous client-side search in the document.
  const title = clean($("title").text());
  let term = title?.match(/Results\s+for[:\s]+["“]?(.+?)["”]?\s*(?:\||-|$)/i)?.[1]
    || title?.match(/^(.+?)\s*(?:-|\|)\s*Walmart\.com\b/i)?.[1]
    || clean(sourceName?.replace(/\.html?$/i, "").replace(/\s*(?:-|\|)\s*Walmart\.com$/i, ""))
    || null;
  try {
    const nextData = JSON.parse($("#__NEXT_DATA__").text() || "{}");
    term ||= nextData?.query?.q || nextData?.props?.pageProps?.query?.q || null;
  } catch {
    // Fall through to the title and configured-value fallbacks.
  }
  term = clean(term) || configuredSearchTerm;
  if (!term) {
    throw new Error("Could not detect a search term from the HTML; set SEARCH_TERM in .env as a fallback");
  }
  return {
    searchTerm: term,
    searchUrl: `https://www.walmart.com/search?q=${encodeURIComponent(term)}`,
  };
}

export function parseProducts(html, { sourceName } = {}) {
  const $ = load(html);
  const { searchTerm, searchUrl } = detectSearchContext($, sourceName);
  const products = [];
  const seen = new Set();
  const embeddedProducts = [];
  const embeddedSeen = new Set();

  try {
    const nextData = JSON.parse($("#__NEXT_DATA__").text() || "{}");
    const visited = new Set();
    const walk = (value) => {
      if (!value || typeof value !== "object" || visited.has(value) || embeddedProducts.length >= limit) return;
      visited.add(value);
      if (value.__typename === "Product" && value.usItemId && value.name && value.canonicalUrl) {
        const url = canonicalUrl(value.canonicalUrl);
        const detailPrice = value.priceInfo?.priceDetails?.priceLines
          ?.flatMap((line) => line.values || [])
          .find((entry) => entry.key === "PRICE")?.value;
        const price = Number.parseFloat(String(value.priceInfo?.currentPrice || value.price || detailPrice || "").replace(/,/g, ""));
        if (url && Number.isFinite(price) && price > 0 && !embeddedSeen.has(url)) {
          const identifiers = productIdentifiers(value.name, value);
          embeddedSeen.add(url);
          embeddedProducts.push({
            url,
            name: clean(value.name),
            imageUrl: clean(value.imageInfo?.thumbnailUrl || value.imageInfo?.allImages?.[0]?.url || value.image || value.imageUrl),
            ...identifiers,
            price,
            currency: value.priceInfo?.priceDetails?.currency || "USD",
            sku: String(value.usItemId),
            brand: clean(value.brand || value.productBrand || value.manufacturerName),
            availability: clean(value.availabilityStatus || value.availabilityStatusV2?.display),
            specifications: extractSpecifications(value.name),
            searchTerm,
            searchUrl,
          });
        }
      }
      for (const child of Object.values(value)) walk(child);
    };
    walk(nextData);
  } catch {
    // Some saved pages omit or truncate Next.js state; visible cards remain the fallback.
  }

  $('a[href*="/ip/"]').each((_index, element) => {
    if (products.length >= limit) return false;
    const anchor = $(element);
    const name = clean(anchor.text());
    const url = canonicalUrl(anchor.attr("href"));
    if (!url || !name || name === "Options" || name.length < 20 || seen.has(url)) return;

    const card = anchor.closest("[data-dca-id], [data-item-id], article, li").first();
    if (!card.length) return;
    const displayedTitle = clean(
      card.find('[data-automation-id="product-title"], [data-test-id="gpt-global-product-title"]').first().text(),
    ) || name;
    const priceElement = card.find(
      '[data-testid="unified-global-product-price"], [data-automation-id="product-price"], [data-testid="product-price"]',
    ).first();
    // Older Walmart cards render dollars and cents in separate spans, making
    // textContent look like "$12999". Their title link still includes
    // "$129.99", so prefer that before parsing the flattened price text.
    const price = parsePrice(priceElement.attr("aria-label"))
      || parseSplitPrice($, priceElement)
      || parsePrice(name)
      || parsePrice(priceElement.text());
    if (!price) return;

    const itemId = new URL(url).pathname.split("/").filter(Boolean).pop();
    const identifiers = productIdentifiers(displayedTitle);
    const image = card.find('img[data-testid="productTileImage"], img').first();
    seen.add(url);
    products.push({
      url,
      name: displayedTitle,
      imageUrl: clean(image.attr("src") || image.attr("data-src")),
      ...identifiers,
      price,
      currency: "USD",
      sku: itemId,
      brand: /^dell\b/i.test(displayedTitle.replace(/^(best seller\s+|open box|refurbished[^)]*\)?|renewed)\s*[-–]?\s*/i, "")) ? "Dell" : null,
      availability: null,
      specifications: extractSpecifications(displayedTitle),
      searchTerm,
      searchUrl,
    });
  });
  // Visible cards represent the saved page. Embedded products are only a
  // fallback for page variants that do not render complete card markup.
  return products.length ? products : embeddedProducts;
}

export async function saveProducts(products, { minimumProducts = limit } = {}) {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (products.length < minimumProducts) {
    throw new Error(`Expected ${minimumProducts} products with URLs and prices, found ${products.length}`);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS walmart_us_products (
        id BIGSERIAL PRIMARY KEY, url TEXT NOT NULL UNIQUE, name TEXT,
        price NUMERIC(12, 2), currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        sku TEXT, brand TEXT, availability TEXT,
        image_url TEXT,
        model_number TEXT, mpn TEXT, upc TEXT,
        specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
        search_term TEXT NOT NULL, search_url TEXT NOT NULL,
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
    // Remove any challenge page accidentally written by an earlier interrupted run.
    await client.query("DELETE FROM walmart_us_products WHERE name ~* '(real shoppers|not robots|human verification)'");
    for (const product of products) {
      const saved = await client.query(`
        INSERT INTO walmart_us_products
          (url, name, price, currency, sku, brand, availability, image_url, model_number, mpn, upc, specifications, search_term, search_url, scraped_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,NOW())
        ON CONFLICT (url) DO UPDATE SET
          name=EXCLUDED.name, price=EXCLUDED.price, currency=EXCLUDED.currency,
          sku=EXCLUDED.sku, brand=EXCLUDED.brand, availability=EXCLUDED.availability,
          image_url=COALESCE(EXCLUDED.image_url, walmart_us_products.image_url),
          model_number=COALESCE(EXCLUDED.model_number, walmart_us_products.model_number),
          mpn=COALESCE(EXCLUDED.mpn, walmart_us_products.mpn),
          upc=COALESCE(EXCLUDED.upc, walmart_us_products.upc),
          specifications=EXCLUDED.specifications, search_term=EXCLUDED.search_term,
          search_url=EXCLUDED.search_url, scraped_at=NOW()
        RETURNING id
      `, [product.url, product.name, product.price, product.currency, product.sku,
        product.brand, product.availability, product.imageUrl, product.modelNumber, product.mpn, product.upc, JSON.stringify(product.specifications),
        product.searchTerm || configuredSearchTerm,
        product.searchUrl || configuredSearchUrl]);
      await client.query(`
        INSERT INTO walmart_us_product_search_terms
          (product_id, search_term, search_url, updated_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (product_id, search_term) DO UPDATE SET
          search_url = EXCLUDED.search_url,
          updated_at = NOW()
      `, [
        saved.rows[0].id,
        product.searchTerm || configuredSearchTerm,
        product.searchUrl || configuredSearchUrl,
      ]);
    }
    await client.query("COMMIT");
    console.table(products.map(({ sku, name, price, url }) => ({ sku, name: name.slice(0, 65), price, url })));
    console.log(`Imported ${products.length} products into walmart_us_products.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
  return products;
}

async function main() {
  if (!file) throw new Error("Usage: npm run import-html -- /path/to/walmart-search.html");
  const products = parseProducts(await readFile(file, "utf8"));
  await saveProducts(products);
}

if (file && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`Import failed: ${error.message}`);
    process.exitCode = 1;
  });
}
