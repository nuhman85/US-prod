import "dotenv/config";
import express from "express";
import pg from "pg";
import path from "node:path";
import { readFile, readdir } from "node:fs/promises";
import { parsePage as parseEbayPage, saveProducts as saveEbayProducts } from "../ebay-us-scraper/src/import-html.js";
import { detectSearchQuery as detectBestBuyQuery, parseProducts as parseBestBuyProducts, saveProducts as saveBestBuyProducts } from "../bestbuy-us-scraper/src/import-html.js";
import { parseProducts as parseWalmartProducts, saveProducts as saveWalmartProducts } from "../walmart-us-scraper/src/import-html.js";

const { Pool } = pg;
const app = express();
const port = Number.parseInt(process.env.PORT || "4005", 10);
const root = process.cwd();
const compareAllStoresExportUrl =
  process.env.COMPAREALLSTORES_EXPORT_URL ||
  "https://compareallstores.com/api/admin/import/us-product-list";
const compareAllStoresTargetUrl =
  process.env.COMPAREALLSTORES_TARGET_URL || "https://compareallstores.com/us";
const compareAllStoresExportSecret =
  process.env.US_PRODUCT_EXPORT_SECRET ||
  process.env.COMPAREALLSTORES_EXPORT_SECRET ||
  "";
const semanticMatcherUrl =
  process.env.SEMANTIC_MATCHER_URL || "http://127.0.0.1:4010";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10_000,
  ssl:
    process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});
let databaseInitializationError = null;

app.use(express.json({ limit: "100kb" }));
app.get("/", (_request, response) =>
  response.sendFile(path.join(root, "index.html")),
);
app.get("/app.js", (_request, response) =>
  response.sendFile(path.join(root, "app.js")),
);
app.get("/styles.css", (_request, response) =>
  response.sendFile(path.join(root, "styles.css")),
);
app.get("/bulk-import", (_request, response) =>
  response.sendFile(path.join(root, "bulk-import.html")),
);
app.get("/bulk-import.js", (_request, response) =>
  response.sendFile(path.join(root, "bulk-import.js")),
);

const productsRoot = path.resolve(process.env.PRODUCTS_ROOT || path.join(root, "..", "products"));
const htmlExtension = /\.html?$/i;

function detectRetailer(filename, html) {
  const sample = `${filename}\n${html.slice(0, 250_000)}`;
  if (/ebay\.(?:com|ca)|for sale\s*[|_]\s*eBay/i.test(sample)) return "ebay";
  if (/bestbuy\.com|Best Buy/i.test(sample)) return "bestbuy";
  if (/walmart\.com|Walmart/i.test(sample)) return "walmart";
  return null;
}

function filenameSearchTerm(filename, retailer) {
  let value = path.basename(filename).replace(htmlExtension, "");
  const endings = {
    ebay: /\s+(?:for sale\s*)?(?:[-_|]\s*)?eBay\d*$/i,
    bestbuy: /\s*[-_|]\s*Best Buy\d*$/i,
    walmart: /\s*[-_|]\s*Walmart\.com\d*$/i,
  };
  value = value.replace(endings[retailer], "").replace(/\s+\d+$/, "").trim();
  return value || "HTML upload";
}

async function importRetailerHtml(filename, html) {
  if (!htmlExtension.test(filename)) throw new Error("Only HTML or HTM files are supported");
  if (Buffer.byteLength(html) > 20 * 1024 * 1024) throw new Error("File exceeds the 20 MB limit");
  const retailer = detectRetailer(filename, html);
  if (!retailer) throw new Error("Could not detect eBay, Best Buy, or Walmart");
  const fallbackTerm = filenameSearchTerm(filename, retailer);
  let products;
  let searchTerm;
  if (retailer === "ebay") {
    const page = parseEbayPage(html, { searchTerm: fallbackTerm });
    products = page.products;
    searchTerm = page.searchTerm;
    await saveEbayProducts(products, searchTerm, { log: false });
  } else if (retailer === "bestbuy") {
    products = parseBestBuyProducts(html);
    searchTerm = detectBestBuyQuery(html, filename) || fallbackTerm;
    await saveBestBuyProducts(products, searchTerm);
  } else {
    const normalizedName = `${fallbackTerm} - Walmart.com.html`;
    products = parseWalmartProducts(html, { sourceName: normalizedName });
    searchTerm = products[0]?.searchTerm || fallbackTerm;
    await saveWalmartProducts(products, { minimumProducts: 1 });
  }
  return { filename, retailer, searchTerm, productCount: products.length };
}

app.post("/api/bulk-import/file", express.text({ type: ["text/html", "application/xhtml+xml", "text/plain"], limit: "20mb" }), async (request, response) => {
  try {
    const filename = decodeURIComponent(String(request.headers["x-filename"] || "upload.html"));
    response.json(await importRetailerHtml(filename, request.body));
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.post("/api/bulk-import/folder", async (request, response) => {
  try {
    const requested = path.resolve(String(request.body?.folder || ""));
    const relative = path.relative(productsRoot, requested);
    if (!requested || relative.startsWith("..") || path.isAbsolute(relative)) {
      return response.status(400).json({ error: `Folder must be inside ${productsRoot}` });
    }
    const entries = (await readdir(requested, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && htmlExtension.test(entry.name))
      .sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }));
    const results = [];
    for (const entry of entries) {
      try {
        const html = await readFile(path.join(requested, entry.name), "utf8");
        results.push({ status: "imported", ...await importRetailerHtml(entry.name, html) });
      } catch (error) {
        results.push({ status: "failed", filename: entry.name, error: error.message });
      }
    }
    response.json({ folder: requested, fileCount: entries.length, results });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

const normalize = (value = "") =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const ignoredTokens = new Set([
  "the",
  "and",
  "with",
  "for",
  "new",
  "canada",
  "ca",
]);

function tokens(value) {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((token) => token.length > 1 && !ignoredTokens.has(token)),
  );
}

function similarity(masterTitle, candidateTitle) {
  const master = tokens(masterTitle);
  const candidate = tokens(candidateTitle);
  if (!master.size || !candidate.size) return 0;
  let intersection = 0;
  for (const token of master) if (candidate.has(token)) intersection += 1;
  const union = new Set([...master, ...candidate]).size;
  const containment = intersection / master.size;
  const jaccard = intersection / union;
  const exactBoost = normalize(candidateTitle).includes(normalize(masterTitle))
    ? 0.12
    : 0;
  return Math.min(0.99, containment * 0.65 + jaccard * 0.35 + exactBoost);
}

function productKind(title) {
  const value = normalize(title);
  const has = (pattern) => pattern.test(value);

  if (has(/(?:keyboard\s+(?:cover|protector|skin)|(?:cover|protector|skin)\s+(?:for\s+)?(?:an?\s+)?keyboard)/)) return "keyboard-cover";
  if (has(/(?:screen\s+protector|protective\s+film|tempered\s+glass)/)) return "screen-protector";
  if (has(/(?:(?:phone|iphone|pixel|galaxy)\s+.*(?:case|cover)|(?:case|cover)\s+.*(?:phone|iphone|pixel|galaxy))/)) return "phone-case";
  if (has(/(?:charger|power\s+adapter|charging\s+cable|ac\s+adapter)/)) return "charger";
  if (has(/(?:laptop\s+(?:case|sleeve|bag)|(?:case|sleeve|bag)\s+(?:for\s+)?(?:macbook|laptop|notebook))/)) return "laptop-case";
  if (has(/(?:usb\s*c\s+hub|docking\s+station|port\s+adapter|multiport\s+adapter)/)) return "hub-dock";
  if (has(/(?:replacement|for\s+parts|parts\s+only)/) && has(/(?:screen|display|battery|keyboard|trackpad|touchpad|motherboard|logic\s+board)/)) return "replacement-part";
  if (has(/(?:iphone|smartphone|cell\s*phone|mobile\s+phone|galaxy\s+s\d|pixel\s+\d)/)) return "phone";
  if (has(/(?:macbook|laptop|notebook|chromebook)/)) return "laptop";
  if (has(/(?:headphones?|earbuds?|headset)/)) return "headphones";
  if (has(/(?:monitor|display)/)) return "monitor";
  if (has(/(?:mouse|mice)/)) return "mouse";
  if (has(/keyboard/)) return "keyboard";
  return "unknown";
}

function isCompatibleProduct(masterTitle, candidateTitle) {
  const masterKind = productKind(masterTitle);
  if (masterKind === "unknown") return true;
  return masterKind === productKind(candidateTitle);
}

function phoneModel(title) {
  const value = normalize(title);
  const iphone = value.match(/\biphone\s+(se|\d{1,2}[a-z]?)\s*(pro\s+max|pro|plus|max|mini)?\b/);
  if (iphone) return `iphone:${iphone[1]}:${(iphone[2] || "standard").replace(/\s+/g, "-")}`;

  const pixel = value.match(/\bpixel\s+(\d{1,2}a?)\s*(pro\s+fold|pro\s+xl|pro|fold|xl)?\b/);
  if (pixel) return `pixel:${pixel[1]}:${(pixel[2] || "standard").replace(/\s+/g, "-")}`;

  const galaxy = value.match(/\bgalaxy\s+(s\d{1,2}|a\d{1,2}|z\s+fold\s*\d*|z\s+flip\s*\d*)\s*(ultra|plus|fe)?\b/);
  if (galaxy) return `galaxy:${galaxy[1].replace(/\s+/g, "-")}:${galaxy[2] || "standard"}`;
  return null;
}

const knownBrands = [
  "apple", "google", "samsung", "sony", "bose", "lenovo", "dell", "hp",
  "asus", "acer", "microsoft", "motorola", "oneplus", "jbl", "beats",
  "black decker", "kitchentrend", "melitta", "airmsen", "mr coffee", "ninja",
  "cuisinart", "delonghi", "bella pro", "fellow", "cafe craft",
];

function productBrand(title) {
  const value = ` ${normalize(title)} `;
  return knownBrands.find((brand) => value.includes(` ${brand} `)) || null;
}

function canonicalSearchTerm(title) {
  const model = phoneModel(title);
  if (!model) return null;
  const [family, generation] = model.split(":");
  if (family === "iphone") return `Apple iPhone ${generation}`;
  if (family === "pixel") return `Google Pixel ${generation}`;
  if (family === "galaxy") return `Samsung Galaxy ${generation.replace(/-/g, " ").toUpperCase()}`;
  return null;
}

function storageCapacities(title, minimum = 64) {
  const capacities = [...normalize(title).matchAll(/\b(\d+)\s*(tb|gb)\b/g)]
    .map((match) => Number(match[1]) * (match[2] === "tb" ? 1024 : 1))
    .filter((capacity) => capacity >= minimum);
  return new Set(capacities);
}

function productColor(title) {
  const value = normalize(title);
  const colors = [
    "blue titanium", "natural titanium", "black titanium", "white titanium", "desert titanium",
    "ultramarine", "space black", "space gray", "space grey", "midnight", "starlight",
    "rose gold", "sky blue", "silver", "black", "white", "blue", "gold", "pink", "green", "teal",
  ];
  return colors.find((color) => value.includes(color)) || null;
}

function productCondition(title, explicitCondition) {
  const value = normalize(title);
  if (/\b(refurbished|renewed|restored|certified refurbished)\b/.test(value)) return "refurbished";
  if (/\bopen box\b/.test(value)) return "open-box";
  if (/\b(pre owned|used)\b/.test(value)) return "used";
  if (/\b(brand new|bnib|sealed|new)\b/.test(value)) return "new";
  if (explicitCondition === "new") return "new";
  if (explicitCondition === "used") return "used";
  return "unknown";
}

function metadataMatch(masterTitle, candidate) {
  const masterBrand = productBrand(masterTitle);
  const candidateBrand = productBrand(`${candidate.title || ""} ${candidate.brand || ""} ${candidate.url || ""}`);
  if (masterBrand && candidateBrand && masterBrand !== candidateBrand) return null;

  const masterModel = phoneModel(masterTitle);
  const candidateModel = phoneModel(candidate.title);
  if (masterModel && candidateModel && masterModel !== candidateModel) return null;

  const phoneMatch = productKind(masterTitle) === "phone";
  const masterStorage = storageCapacities(masterTitle, phoneMatch ? 16 : 64);
  const candidateStorage = storageCapacities(candidate.title, phoneMatch ? 16 : 64);
  if (masterStorage.size && candidateStorage.size) {
    const storageMatches = [...masterStorage].some((capacity) => candidateStorage.has(capacity));
    if (!storageMatches) return null;
  }

  let adjustment = 0;
  if (masterBrand && candidateBrand === masterBrand) adjustment += 6;
  if (masterModel && candidateModel === masterModel) adjustment += 22;
  if (masterStorage.size && [...masterStorage].some((capacity) => candidateStorage.has(capacity))) adjustment += 16;

  const masterCondition = productCondition(masterTitle);
  const candidateCondition = productCondition(candidate.title, candidate.condition_group);
  if (masterCondition !== "unknown" && candidateCondition !== "unknown") {
    adjustment += masterCondition === candidateCondition ? 12 : -12;
  }

  const masterColor = productColor(masterTitle);
  const candidateColor = productColor(candidate.title);
  if (masterColor && candidateColor) adjustment += masterColor === candidateColor ? 10 : -8;

  return adjustment;
}

function rank(masterTitle, rows, limit = 5, semanticScores = new Map()) {
  return rows
    .filter((row) => isCompatibleProduct(masterTitle, row.title))
    .map((row) => ({ row, adjustment: metadataMatch(masterTitle, row) }))
    .filter(({ adjustment }) => adjustment !== null)
    .map(({ row, adjustment }) => {
      const lexical = similarity(masterTitle, row.title);
      const semantic = semanticScores.get(String(row.id));
      const hasSemantic = Number.isFinite(semantic);
      const baseScore = hasSemantic
        ? lexical * 45 + semantic * 25
        : lexical * 70;
      return {
        ...row,
        confidence: Math.max(0, Math.min(99, Math.round(baseScore + adjustment))),
        match_method: hasSemantic ? "hybrid" : "lexical",
        score_breakdown: {
          lexical: Math.round(lexical * 100),
          semantic: hasSemantic ? Math.round(semantic * 100) : null,
          metadata: adjustment,
        },
      };
    })
    .filter((row) => row.confidence >= 20)
    .sort(
      (a, b) =>
        b.confidence - a.confidence ||
        Number(a.price || Infinity) - Number(b.price || Infinity),
    )
    .slice(0, limit);
}

export { canonicalSearchTerm, isCompatibleProduct, metadataMatch, phoneModel, productKind, rank };

async function getSemanticScores(masterTitle, rows) {
  if (!rows.length || process.env.SEMANTIC_MATCHER_ENABLED === "false") return new Map();
  try {
    const response = await fetch(`${semanticMatcherUrl}/score`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        master: masterTitle,
        candidates: rows.map((row) => ({ id: String(row.id), title: row.title })),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return new Map();
    const payload = await response.json();
    return new Map(
      (payload.scores || [])
        .filter((item) => Number.isFinite(item.score))
        .map((item) => [String(item.id), Math.max(0, Math.min(1, item.score))]),
    );
  } catch {
    return new Map();
  }
}

function toNumber(value) {
  const parsed =
    typeof value === "number"
      ? value
      : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toPositiveNumber(value) {
  const parsed = toNumber(value);
  return parsed && parsed > 0
    ? Math.round((parsed + Number.EPSILON) * 100) / 100
    : null;
}

function trimError(value, maxLength = 900) {
  return String(value || "Export failed").slice(0, maxLength);
}

function buildOffer(store, price, url) {
  const normalizedPrice = toPositiveNumber(price);
  const normalizedUrl = String(url || "").trim();

  if (!normalizedPrice || !normalizedUrl) return null;

  return {
    store,
    price: normalizedPrice,
    url: normalizedUrl,
  };
}

function buildExportItem(row) {
  const offers = [
    buildOffer("Best Buy US", row.bestbuy_price, row.bestbuy_url),
    buildOffer("Walmart US", row.walmart_price, row.walmart_url),
    buildOffer(
      "eBay US",
      toNumber(row.ebay_item_price) + toNumber(row.ebay_shipping_fee || 0),
      row.ebay_url,
    ),
    buildOffer("Newegg US", row.newegg_price, row.newegg_url),
  ].filter(Boolean);

  return {
    sourceId: Number(row.id),
    amazonProductId: Number(row.amazon_product_id),
    targetProductId: row.pricematch_product_id ? Number(row.pricematch_product_id) : null,
    searchTerm: row.search_term || row.amazon_search_term || "",
    amazon: {
      asin: row.asin || "",
      title: row.amazon_title || "",
      price: toPositiveNumber(row.amazon_price),
      currency: row.amazon_currency || "USD",
      rating: toNumber(row.amazon_rating) || 0,
      reviews:
        Number.parseInt(
          String(row.amazon_review_count || "0").replace(/[^0-9]/g, ""),
          10,
        ) || 0,
      imageUrl: row.amazon_image_url || "",
      affiliateUrl: row.amazon_affiliate_url || "",
      url:
        row.amazon_affiliate_url ||
        (row.asin ? `https://www.amazon.com/dp/${row.asin}` : ""),
    },
    offers,
  };
}

async function ensureSchema() {
  for (const column of ["model_number", "mpn", "upc"]) {
    await pool.query(`ALTER TABLE amazon_us_products ADD COLUMN IF NOT EXISTS ${column} TEXT`);
  }
  await pool.query("ALTER TABLE bestbuy_products ADD COLUMN IF NOT EXISTS image_url TEXT");
  await pool.query("ALTER TABLE walmart_us_products ADD COLUMN IF NOT EXISTS image_url TEXT");
  await pool.query("ALTER TABLE ebay_us_products ADD COLUMN IF NOT EXISTS image_url TEXT");
  for (const table of ["bestbuy_products", "walmart_us_products", "ebay_us_products"]) {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS model_number TEXT`);
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS mpn TEXT`);
    await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS upc TEXT`);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS newegg_us_products (
      id BIGSERIAL PRIMARY KEY, url TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
      price NUMERIC(12,2) NOT NULL, currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      sku TEXT, brand TEXT, availability TEXT, seller TEXT,
      image_url TEXT,
      model_number TEXT, mpn TEXT, upc TEXT,
      specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
      search_term TEXT NOT NULL, search_url TEXT NOT NULL,
      scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query("ALTER TABLE newegg_us_products ADD COLUMN IF NOT EXISTS image_url TEXT");
  for (const column of ["model_number", "mpn", "upc"]) {
    await pool.query(`ALTER TABLE newegg_us_products ADD COLUMN IF NOT EXISTS ${column} TEXT`);
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS newegg_us_product_search_terms (
      product_id BIGINT NOT NULL REFERENCES newegg_us_products(id) ON DELETE CASCADE,
      search_term TEXT NOT NULL, search_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (product_id, search_term)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS us_product_list (
      id BIGSERIAL PRIMARY KEY,
      amazon_product_id BIGINT NOT NULL UNIQUE REFERENCES amazon_us_products(id),
      bestbuy_product_id BIGINT REFERENCES bestbuy_products(id),
      walmart_product_id BIGINT REFERENCES walmart_us_products(id),
      ebay_product_id BIGINT REFERENCES ebay_us_products(id),
      newegg_product_id BIGINT REFERENCES newegg_us_products(id),
      search_term TEXT NOT NULL,
      export_status TEXT NOT NULL DEFAULT 'pending',
      pricematch_product_id BIGINT,
      exported_at TIMESTAMPTZ,
      last_export_attempt_at TIMESTAMPTZ,
      export_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(
    "ALTER TABLE us_product_list ADD COLUMN IF NOT EXISTS newegg_product_id BIGINT REFERENCES newegg_us_products(id)",
  );
  await pool.query(
    "ALTER TABLE us_product_list ADD COLUMN IF NOT EXISTS export_status TEXT NOT NULL DEFAULT 'pending'",
  );
  await pool.query(
    "ALTER TABLE us_product_list ADD COLUMN IF NOT EXISTS pricematch_product_id BIGINT",
  );
  await pool.query(
    "ALTER TABLE us_product_list ADD COLUMN IF NOT EXISTS exported_at TIMESTAMPTZ",
  );
  await pool.query(
    "ALTER TABLE us_product_list ADD COLUMN IF NOT EXISTS last_export_attempt_at TIMESTAMPTZ",
  );
  await pool.query(
    "ALTER TABLE us_product_list ADD COLUMN IF NOT EXISTS export_error TEXT",
  );
  await pool.query(`
    CREATE TABLE IF NOT EXISTS walmart_us_product_search_terms (
      product_id BIGINT NOT NULL REFERENCES walmart_us_products(id) ON DELETE CASCADE,
      search_term TEXT NOT NULL,
      search_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (product_id, search_term)
    )
  `);
  await pool.query(`
    INSERT INTO walmart_us_product_search_terms (product_id, search_term, search_url)
    SELECT id, search_term, search_url
    FROM walmart_us_products
    WHERE search_term IS NOT NULL AND BTRIM(search_term) <> ''
    ON CONFLICT (product_id, search_term) DO NOTHING
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS amazon_us_search_term_status (
      search_term TEXT PRIMARY KEY,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

app.get("/api/health", async (_request, response, next) => {
  try {
    if (databaseInitializationError) {
      return response.status(503).json({
        ok: false,
        error: "Database unavailable during startup",
        details: databaseInitializationError,
      });
    }
    const result = await pool.query("SELECT NOW() AS database_time");
    response.json({ ok: true, databaseTime: result.rows[0].database_time });
  } catch (error) {
    next(error);
  }
});

app.use("/api", (_request, response, next) => {
  if (databaseInitializationError) {
    return response.status(503).json({
      error:
        "Database is unavailable. Verify DATABASE_URL, DATABASE_SSL, and database connectivity, then restart the server.",
      details: databaseInitializationError,
    });
  }

  return next();
});

app.get("/api/search-terms", async (request, response, next) => {
  try {
    const titleContainsTerm = request.query.titleContainsTerm === "true";
    const status = request.query.status === "completed" ? "completed" : "active";
    const excludedWords = String(request.query.exclude || "").split(",").map((word) => word.trim().toLowerCase()).filter((word) => /^[a-z0-9]+$/.test(word)).slice(0, 50);
    const result = await pool.query(`
      SELECT a.search_term, COUNT(*)::int AS product_count,
             COUNT(c.id)::int AS reviewed_count,
             MAX(a.scraped_at) AS last_scraped_at,
             MAX(term_status.completed_at) AS completed_at
      FROM amazon_us_products a
      LEFT JOIN us_product_list c ON c.amazon_product_id = a.id
      LEFT JOIN amazon_us_search_term_status term_status
        ON LOWER(BTRIM(term_status.search_term)) = LOWER(BTRIM(a.search_term))
      WHERE a.search_term IS NOT NULL AND BTRIM(a.search_term) <> ''
        AND ($3 = 'completed' OR LOWER(BTRIM(COALESCE(c.export_status, 'pending'))) <> 'exported')
        AND (($3 = 'completed' AND term_status.completed_at IS NOT NULL)
          OR ($3 = 'active' AND term_status.completed_at IS NULL))
        AND (NOT $1::boolean OR a.title ILIKE '%' || a.search_term || '%')
        AND NOT EXISTS (
          SELECT 1 FROM UNNEST($2::text[]) excluded(word)
          WHERE (' ' || LOWER(REGEXP_REPLACE(a.title, '[^a-zA-Z0-9]+', ' ', 'g')) || ' ') LIKE '% ' || excluded.word || ' %'
        )
      GROUP BY a.search_term
      ORDER BY MAX(a.scraped_at) DESC NULLS LAST, a.search_term
    `, [titleContainsTerm, excludedWords, status]);
    const counts = await pool.query(`
      SELECT
        COUNT(DISTINCT a.search_term) FILTER (WHERE term_status.completed_at IS NULL)::int AS active,
        COUNT(DISTINCT a.search_term) FILTER (WHERE term_status.completed_at IS NOT NULL)::int AS completed
      FROM amazon_us_products a
      LEFT JOIN amazon_us_search_term_status term_status
        ON LOWER(BTRIM(term_status.search_term)) = LOWER(BTRIM(a.search_term))
      WHERE a.search_term IS NOT NULL AND BTRIM(a.search_term) <> ''
    `);
    response.json({ terms: result.rows, counts: counts.rows[0] || { active: 0, completed: 0 }, status });
  } catch (error) {
    next(error);
  }
});

app.put("/api/search-terms/:searchTerm/completion", async (request, response, next) => {
  try {
    const searchTerm = String(request.params.searchTerm || "").trim();
    const completed = request.body?.completed === true;
    if (!searchTerm) return response.status(400).json({ error: "searchTerm is required" });

    const exists = await pool.query(
      "SELECT 1 FROM amazon_us_products WHERE LOWER(BTRIM(search_term)) = LOWER(BTRIM($1)) LIMIT 1",
      [searchTerm],
    );
    if (!exists.rowCount) return response.status(404).json({ error: "Search term not found" });

    if (completed) {
      await pool.query(`
        INSERT INTO amazon_us_search_term_status (search_term, completed_at, updated_at)
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (search_term) DO UPDATE SET completed_at = NOW(), updated_at = NOW()
      `, [searchTerm]);
    } else {
      await pool.query(
        "DELETE FROM amazon_us_search_term_status WHERE LOWER(BTRIM(search_term)) = LOWER(BTRIM($1))",
        [searchTerm],
      );
    }
    response.json({ searchTerm, completed });
  } catch (error) {
    next(error);
  }
});

app.get("/api/amazon-products", async (request, response, next) => {
  try {
    const searchTerm = String(request.query.searchTerm || "").trim();
    const titleContainsTerm = request.query.titleContainsTerm === "true";
    const includeExported = request.query.includeExported === "true";
    const excludedWords = String(request.query.exclude || "").split(",").map((word) => word.trim().toLowerCase()).filter((word) => /^[a-z0-9]+$/.test(word)).slice(0, 50);
    const offset = Math.max(
      0,
      Number.parseInt(request.query.offset || "0", 10) || 0,
    );
    if (!searchTerm)
      return response.status(400).json({ error: "searchTerm is required" });
    const result = await pool.query(
      `
      SELECT a.id, a.asin, a.title, a.price, a.currency, a.rating, a.review_count,
             a.image_url, a.model_number, a.mpn, a.upc, a.affiliate_url, a.is_prime, a.search_term,
             (c.id IS NOT NULL) AS reviewed,
             c.export_status, c.pricematch_product_id, c.exported_at, c.export_error
      FROM amazon_us_products a
      LEFT JOIN us_product_list c ON c.amazon_product_id = a.id
      WHERE a.search_term = $1
        AND ($5::boolean OR LOWER(BTRIM(COALESCE(c.export_status, 'pending'))) <> 'exported')
        AND (NOT $3::boolean OR a.title ILIKE '%' || a.search_term || '%')
        AND NOT EXISTS (
          SELECT 1 FROM UNNEST($4::text[]) excluded(word)
          WHERE (' ' || LOWER(REGEXP_REPLACE(a.title, '[^a-zA-Z0-9]+', ' ', 'g')) || ' ') LIKE '% ' || excluded.word || ' %'
        )
      ORDER BY a.scraped_at DESC NULLS LAST, a.id
      LIMIT 1 OFFSET $2
    `,
      [searchTerm, offset, titleContainsTerm, excludedWords, includeExported],
    );
    const count = await pool.query(
      `SELECT COUNT(*)::int AS count
       FROM amazon_us_products a
       LEFT JOIN us_product_list c ON c.amazon_product_id = a.id
       WHERE a.search_term = $1
         AND ($4::boolean OR LOWER(BTRIM(COALESCE(c.export_status, 'pending'))) <> 'exported')
         AND (NOT $2::boolean OR a.title ILIKE '%' || a.search_term || '%')
         AND NOT EXISTS (
           SELECT 1 FROM UNNEST($3::text[]) excluded(word)
           WHERE (' ' || LOWER(REGEXP_REPLACE(a.title, '[^a-zA-Z0-9]+', ' ', 'g')) || ' ') LIKE '% ' || excluded.word || ' %'
         )`,
      [searchTerm, titleContainsTerm, excludedWords, includeExported],
    );
    response.json({
      product: result.rows[0] || null,
      total: count.rows[0].count,
      offset,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/matches/:amazonId", async (request, response, next) => {
  try {
    const amazonId = Number.parseInt(request.params.amazonId, 10);
    if (!Number.isInteger(amazonId))
      return response.status(400).json({ error: "Invalid Amazon product ID" });
    const amazonResult = await pool.query(
      "SELECT id, title, search_term FROM amazon_us_products WHERE id = $1",
      [amazonId],
    );
    const master = amazonResult.rows[0];
    if (!master)
      return response.status(404).json({ error: "Amazon product not found" });
    const candidateTerms = [...new Set([master.search_term, canonicalSearchTerm(master.title)])]
      .filter(Boolean)
      .map((term) => normalize(term));

    const [bestbuy, walmart, ebay, newegg, saved] = await Promise.all([
      pool.query(
        `SELECT id, name AS title, price, currency, sku, url, image_url, model_number, mpn, upc, 'New' AS detail
         FROM bestbuy_products product
         WHERE EXISTS (
           SELECT 1 FROM bestbuy_product_searches search
           WHERE search.product_id = product.id
             AND BTRIM(REGEXP_REPLACE(LOWER(search.search_query), '[^a-z0-9]+', ' ', 'g')) = ANY($1::text[])
         )`,
        [candidateTerms],
      ),
      pool.query(
        `
          SELECT id, name AS title, price, currency, sku, url, image_url, model_number, mpn, upc,
                 COALESCE(availability, brand, 'Walmart.com') AS detail
          FROM walmart_us_products product
          WHERE EXISTS (
                  SELECT 1
                  FROM walmart_us_product_search_terms mapping
                  WHERE mapping.product_id = product.id
                    AND LOWER(BTRIM(mapping.search_term)) = ANY($1::text[])
                )
             OR NOT EXISTS (
                  SELECT 1
                  FROM walmart_us_product_search_terms exact
                  WHERE LOWER(BTRIM(exact.search_term)) = ANY($1::text[])
                )
        `,
        [candidateTerms],
      ),
      pool.query(
        `
        SELECT id, name AS title,
               item_price + COALESCE(shipping_fee, 0) AS price,
               item_price, COALESCE(shipping_fee, 0) AS shipping_fee,
               currency, item_id AS sku, url, image_url, model_number, mpn, upc,
               CASE
                 WHEN condition ILIKE '%new%' AND condition NOT ILIKE '%renew%' THEN 'new'
                 WHEN condition ILIKE '%pre-owned%' OR condition ILIKE '%used%' THEN 'used'
                 WHEN condition ILIKE '%open box%' THEN 'used'
                 WHEN condition ILIKE '%refurb%' OR condition ILIKE '%renew%' THEN 'used'
                 ELSE 'other'
               END AS condition_group,
               'Condition: ' ||
               CASE
                 WHEN condition ILIKE '%new%' AND condition NOT ILIKE '%renew%' THEN 'New'
                 WHEN condition ILIKE '%pre-owned%' OR condition ILIKE '%used%' THEN 'Used'
                 WHEN condition ILIKE '%open box%' THEN 'Open Box'
                 WHEN condition ILIKE '%refurb%' OR condition ILIKE '%renew%' THEN 'Refurbished'
                 ELSE COALESCE(condition, 'Not specified')
               END || ' · ' ||
               TO_CHAR(item_price, 'FM$999,999,990.00') || ' item + ' ||
               CASE
                 WHEN COALESCE(shipping_fee, 0) = 0 THEN 'free shipping'
                 ELSE TO_CHAR(shipping_fee, 'FM$999,999,990.00') || ' shipping'
               END AS detail
        FROM ebay_us_products product
        WHERE EXISTS (
          SELECT 1
          FROM ebay_us_search_results result
          JOIN ebay_us_searches search ON search.id = result.search_id
          WHERE result.product_id = product.id
            AND search.normalized_term = ANY($1::text[])
        )
      `,
        [candidateTerms],
      ),
      pool.query(
        `SELECT id, name AS title, price, currency, sku, url, image_url, model_number, mpn, upc,
                COALESCE(seller, brand, availability, 'Newegg.com') AS detail
         FROM newegg_us_products product
         WHERE EXISTS (
           SELECT 1 FROM newegg_us_product_search_terms mapping
           WHERE mapping.product_id = product.id
             AND BTRIM(REGEXP_REPLACE(LOWER(mapping.search_term), '[^a-z0-9]+', ' ', 'g')) = ANY($1::text[])
         )`,
        [candidateTerms],
      ),
      pool.query(
        "SELECT bestbuy_product_id, walmart_product_id, ebay_product_id, newegg_product_id, export_status, pricematch_product_id, exported_at, export_error FROM us_product_list WHERE amazon_product_id = $1",
        [amazonId],
      ),
    ]);

    const [bestbuySemantic, walmartSemantic, ebaySemantic, neweggSemantic] = await Promise.all([
      getSemanticScores(master.title, bestbuy.rows),
      getSemanticScores(master.title, walmart.rows),
      getSemanticScores(master.title, ebay.rows),
      getSemanticScores(master.title, newegg.rows),
    ]);

    response.json({
      matches: {
        bestbuy: rank(master.title, bestbuy.rows, 5, bestbuySemantic),
        walmart: rank(master.title, walmart.rows, 5, walmartSemantic),
        ebay: rank(master.title, ebay.rows, 25, ebaySemantic),
        newegg: rank(master.title, newegg.rows, 5, neweggSemantic),
      },
      candidateCounts: {
        bestbuy: bestbuy.rows.length,
        walmart: walmart.rows.length,
        ebay: ebay.rows.length,
        newegg: newegg.rows.length,
      },
      saved: saved.rows[0] || null,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/manual-matches/:amazonId", async (request, response, next) => {
  try {
    const amazonId = Number.parseInt(request.params.amazonId, 10);
    const query = String(request.query.q || "").trim();
    const allowedRetailers = new Set(["bestbuy", "walmart", "ebay", "newegg"]);
    const retailers = String(request.query.retailers || "bestbuy,walmart,ebay,newegg")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => allowedRetailers.has(value));
    const queryTokens = [...tokens(query)].slice(0, 8);
    if (!Number.isInteger(amazonId)) return response.status(400).json({ error: "Invalid Amazon product ID" });
    if (query.length < 2 || !queryTokens.length) return response.status(400).json({ error: "Enter at least two searchable characters" });
    if (!retailers.length) return response.json({ matches: {}, candidateCounts: {} });

    const amazonResult = await pool.query(
      "SELECT title FROM amazon_us_products WHERE id = $1",
      [amazonId],
    );
    const master = amazonResult.rows[0];
    if (!master) return response.status(404).json({ error: "Amazon product not found" });

    const searches = {
      bestbuy: () => pool.query(`
        SELECT id, name AS title, price, currency, sku, url, image_url, model_number, mpn, upc, 'New' AS detail
        FROM bestbuy_products
        WHERE NOT EXISTS (
          SELECT 1 FROM UNNEST($1::text[]) token
          WHERE LOWER(name) NOT LIKE '%' || token || '%'
        )
        ORDER BY scraped_at DESC NULLS LAST
        LIMIT 150
      `, [queryTokens]),
      walmart: () => pool.query(`
        SELECT id, name AS title, price, currency, sku, url, image_url, model_number, mpn, upc,
               COALESCE(availability, brand, 'Walmart.com') AS detail
        FROM walmart_us_products
        WHERE NOT EXISTS (
          SELECT 1 FROM UNNEST($1::text[]) token
          WHERE LOWER(name) NOT LIKE '%' || token || '%'
        )
        ORDER BY scraped_at DESC NULLS LAST
        LIMIT 150
      `, [queryTokens]),
      ebay: () => pool.query(`
        SELECT id, name AS title,
               item_price + COALESCE(shipping_fee, 0) AS price,
               item_price, COALESCE(shipping_fee, 0) AS shipping_fee,
               currency, item_id AS sku, url, image_url, model_number, mpn, upc,
               CASE
                 WHEN condition ILIKE '%new%' AND condition NOT ILIKE '%renew%' THEN 'new'
                 WHEN condition ILIKE '%pre-owned%' OR condition ILIKE '%used%' THEN 'used'
                 WHEN condition ILIKE '%open box%' THEN 'used'
                 WHEN condition ILIKE '%refurb%' OR condition ILIKE '%renew%' THEN 'used'
                 ELSE 'other'
               END AS condition_group,
               'Condition: ' || COALESCE(condition, 'Not specified') AS detail
        FROM ebay_us_products
        WHERE NOT EXISTS (
          SELECT 1 FROM UNNEST($1::text[]) token
          WHERE LOWER(name) NOT LIKE '%' || token || '%'
        )
        ORDER BY scraped_at DESC NULLS LAST
        LIMIT 150
      `, [queryTokens]),
      newegg: () => pool.query(`
        SELECT id, name AS title, price, currency, sku, url, image_url, model_number, mpn, upc,
               COALESCE(seller, brand, availability, 'Newegg.com') AS detail
        FROM newegg_us_products
        WHERE NOT EXISTS (
          SELECT 1 FROM UNNEST($1::text[]) token
          WHERE LOWER(name) NOT LIKE '%' || token || '%'
        )
        ORDER BY scraped_at DESC NULLS LAST
        LIMIT 150
      `, [queryTokens]),
    };

    const rowEntries = await Promise.all(
      retailers.map(async (retailer) => [retailer, (await searches[retailer]()).rows]),
    );
    const rowsByRetailer = Object.fromEntries(rowEntries);
    const semanticEntries = await Promise.all(
      rowEntries.map(async ([retailer, rows]) => [retailer, await getSemanticScores(master.title, rows)]),
    );
    const semanticByRetailer = Object.fromEntries(semanticEntries);
    const matches = {};
    const candidateCounts = {};
    for (const [retailer, rows] of rowEntries) {
      matches[retailer] = rank(master.title, rows, retailer === "ebay" ? 25 : 10, semanticByRetailer[retailer]);
      candidateCounts[retailer] = rows.length;
    }
    response.json({ matches, candidateCounts, query, retailers });
  } catch (error) {
    next(error);
  }
});

app.get("/api/export-status", async (_request, response, next) => {
  try {
    const [counts, recent] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int AS total_count,
          COUNT(*) FILTER (WHERE get_export_status.export_status = 'exported')::int AS exported_count,
          COUNT(*) FILTER (WHERE get_export_status.export_status = 'failed')::int AS failed_count,
          COUNT(*) FILTER (WHERE get_export_status.export_status = 'exporting')::int AS exporting_count,
          COUNT(*) FILTER (WHERE get_export_status.export_status NOT IN ('exported', 'failed', 'exporting'))::int AS pending_count,
          COUNT(*) FILTER (WHERE get_export_status.export_status <> 'exported')::int AS non_exported_count
        FROM us_product_list c
        CROSS JOIN LATERAL (
          SELECT COALESCE(LOWER(NULLIF(BTRIM(c.export_status), '')), 'pending') AS export_status
        ) get_export_status
      `),
      pool.query(`
        SELECT c.id, c.amazon_product_id, c.export_status, c.pricematch_product_id,
               c.exported_at, c.last_export_attempt_at, c.export_error,
               a.title AS amazon_title, a.price AS amazon_price, a.currency AS amazon_currency
        FROM us_product_list c
        JOIN amazon_us_products a ON a.id = c.amazon_product_id
        ORDER BY COALESCE(c.last_export_attempt_at, c.updated_at, c.created_at) DESC, c.id DESC
        LIMIT 8
      `),
    ]);

    response.json({
      configured: Boolean(compareAllStoresExportSecret),
      targetUrl: compareAllStoresTargetUrl,
      exportUrl: compareAllStoresExportUrl,
      counts: counts.rows[0] || {
        total_count: 0,
        exported_count: 0,
        failed_count: 0,
        exporting_count: 0,
        pending_count: 0,
        non_exported_count: 0,
      },
      recent: recent.rows,
    });
  } catch (error) {
    next(error);
  }
});

async function getPendingExportRows(limit) {
  const result = await pool.query(
    `
    SELECT
      c.id, c.amazon_product_id, c.search_term, c.export_status, c.pricematch_product_id,
      a.asin, a.title AS amazon_title, a.price AS amazon_price,
      a.currency AS amazon_currency, a.rating AS amazon_rating,
      a.review_count AS amazon_review_count, a.image_url AS amazon_image_url,
      a.affiliate_url AS amazon_affiliate_url, a.search_term AS amazon_search_term,
      b.name AS bestbuy_title, b.price AS bestbuy_price, b.currency AS bestbuy_currency, b.url AS bestbuy_url,
      w.name AS walmart_title, w.price AS walmart_price, w.currency AS walmart_currency, w.url AS walmart_url,
      e.name AS ebay_title, e.item_price AS ebay_item_price,
      COALESCE(e.shipping_fee, 0) AS ebay_shipping_fee,
      e.currency AS ebay_currency, e.url AS ebay_url
      , n.name AS newegg_title, n.price AS newegg_price,
      n.currency AS newegg_currency, n.url AS newegg_url
    FROM us_product_list c
    JOIN amazon_us_products a ON a.id = c.amazon_product_id
    LEFT JOIN bestbuy_products b ON b.id = c.bestbuy_product_id
    LEFT JOIN walmart_us_products w ON w.id = c.walmart_product_id
    LEFT JOIN ebay_us_products e ON e.id = c.ebay_product_id
    LEFT JOIN newegg_us_products n ON n.id = c.newegg_product_id
    WHERE LOWER(NULLIF(BTRIM(COALESCE(c.export_status, 'pending')), '')) IS DISTINCT FROM 'exported'
    ORDER BY c.updated_at ASC, c.id ASC
    LIMIT $1
  `,
    [limit],
  );

  return result.rows;
}

async function markExporting(rows) {
  if (!rows.length) return;

  await pool.query(
    `
    UPDATE us_product_list
    SET export_status = 'exporting',
        last_export_attempt_at = NOW(),
        export_error = NULL,
        updated_at = NOW()
    WHERE id = ANY($1::bigint[])
  `,
    [rows.map((row) => Number(row.id))],
  );
}

async function markExported(sourceId, productId) {
  await pool.query(
    `
    UPDATE us_product_list
    SET export_status = 'exported',
        pricematch_product_id = $2,
        exported_at = NOW(),
        last_export_attempt_at = NOW(),
        export_error = NULL,
        updated_at = NOW()
    WHERE id = $1
  `,
    [sourceId, productId ?? null],
  );
}

async function markExportFailed(sourceId, error) {
  await pool.query(
    `
    UPDATE us_product_list
    SET export_status = 'failed',
        last_export_attempt_at = NOW(),
        export_error = $2,
        updated_at = NOW()
    WHERE id = $1
  `,
    [sourceId, trimError(error)],
  );
}

app.post("/api/export-pending", async (request, response, next) => {
  let rows = [];

  try {
    if (!compareAllStoresExportSecret) {
      return response.status(503).json({
        error:
          "US_PRODUCT_EXPORT_SECRET or COMPAREALLSTORES_EXPORT_SECRET is required before export can run.",
      });
    }

    const limit = Math.max(
      1,
      Math.min(1000, Number.parseInt(request.body?.limit || "250", 10) || 250),
    );
    rows = await getPendingExportRows(limit);

    if (rows.length === 0) {
      return response.json({
        exportedCount: 0,
        failedCount: 0,
        message: "No non-exported products found in us_product_list.",
      });
    }

    await markExporting(rows);

    const exportResponse = await fetch(compareAllStoresExportUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-US-Product-Export-Secret": compareAllStoresExportSecret,
      },
      body: JSON.stringify({
        items: rows.map(buildExportItem),
      }),
    });
    const payload = await exportResponse.json().catch(() => ({}));

    if (!exportResponse.ok) {
      const message =
        payload.error ||
        `CompareAllStores export failed (${exportResponse.status})`;
      await Promise.all(rows.map((row) => markExportFailed(row.id, message)));
      return response.status(exportResponse.status).json({ error: message });
    }

    const resultBySourceId = new Map(
      (Array.isArray(payload.results) ? payload.results : []).map((result) => [
        String(result.sourceId),
        result,
      ]),
    );
    let exportedCount = 0;
    let failedCount = 0;

    for (const row of rows) {
      const result = resultBySourceId.get(String(row.id));

      if (result?.status === "exported") {
        exportedCount += 1;
        await markExported(row.id, result.productId);
      } else {
        failedCount += 1;
        await markExportFailed(
          row.id,
          result?.message || "CompareAllStores did not confirm this product.",
        );
      }
    }

    response.json({
      exportedCount,
      failedCount,
      results: payload.results || [],
      message: `Exported ${exportedCount} product${exportedCount === 1 ? "" : "s"} to CompareAllStores.`,
    });
  } catch (error) {
    if (rows.length > 0) {
      await Promise.all(
        rows.map((row) =>
          markExportFailed(
            row.id,
            error instanceof Error ? error.message : "Export failed",
          ),
        ),
      );
    }
    next(error);
  }
});

app.post("/api/consolidated-products", async (request, response, next) => {
  try {
    const {
      amazonProductId,
      bestbuyProductId,
      walmartProductId,
      ebayProductId,
      neweggProductId,
    } = request.body;
    if (!Number.isInteger(amazonProductId))
      return response
        .status(400)
        .json({ error: "amazonProductId is required" });
    if (
      ![bestbuyProductId, walmartProductId, ebayProductId, neweggProductId].some(
        Number.isInteger,
      )
    ) {
      return response
        .status(400)
        .json({ error: "Select at least one retailer match" });
    }
    const result = await pool.query(
      `
      INSERT INTO us_product_list
        (amazon_product_id, bestbuy_product_id, walmart_product_id, ebay_product_id, newegg_product_id, search_term)
      SELECT id, $2, $3, $4, $5, search_term FROM amazon_us_products WHERE id = $1
      ON CONFLICT (amazon_product_id) DO UPDATE SET
        bestbuy_product_id = EXCLUDED.bestbuy_product_id,
        walmart_product_id = EXCLUDED.walmart_product_id,
        ebay_product_id = EXCLUDED.ebay_product_id,
        newegg_product_id = EXCLUDED.newegg_product_id,
        search_term = EXCLUDED.search_term,
        export_status = CASE
          WHEN us_product_list.bestbuy_product_id IS DISTINCT FROM EXCLUDED.bestbuy_product_id
            OR us_product_list.walmart_product_id IS DISTINCT FROM EXCLUDED.walmart_product_id
            OR us_product_list.ebay_product_id IS DISTINCT FROM EXCLUDED.ebay_product_id
            OR us_product_list.newegg_product_id IS DISTINCT FROM EXCLUDED.newegg_product_id
            OR us_product_list.search_term IS DISTINCT FROM EXCLUDED.search_term
          THEN 'pending'
          ELSE us_product_list.export_status
        END,
        exported_at = CASE
          WHEN us_product_list.bestbuy_product_id IS DISTINCT FROM EXCLUDED.bestbuy_product_id
            OR us_product_list.walmart_product_id IS DISTINCT FROM EXCLUDED.walmart_product_id
            OR us_product_list.ebay_product_id IS DISTINCT FROM EXCLUDED.ebay_product_id
            OR us_product_list.newegg_product_id IS DISTINCT FROM EXCLUDED.newegg_product_id
            OR us_product_list.search_term IS DISTINCT FROM EXCLUDED.search_term
          THEN NULL
          ELSE us_product_list.exported_at
        END,
        export_error = NULL,
        updated_at = NOW()
      RETURNING id, amazon_product_id, bestbuy_product_id, walmart_product_id, ebay_product_id, newegg_product_id, search_term, export_status, pricematch_product_id, exported_at, export_error, updated_at
    `,
      [
        amazonProductId,
        bestbuyProductId ?? null,
        walmartProductId ?? null,
        ebayProductId ?? null,
        neweggProductId ?? null,
      ],
    );
    if (!result.rows[0])
      return response.status(404).json({ error: "Amazon product not found" });
    response.status(201).json({ product: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Database request failed" });
});

if (process.env.MATCHER_UNIT_TEST !== "true") {
  try {
    await ensureSchema();
  } catch (error) {
    databaseInitializationError =
      error instanceof Error ? error.message : String(error);
    console.error(
      "Database initialization failed. Server will start in degraded mode.",
    );
    console.error(error);
  }

  app.listen(port, "127.0.0.1", () => {
    console.log(`US Product Mapper: http://127.0.0.1:${port}`);
  });
}
