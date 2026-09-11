import pg from "pg";

const { Pool } = pg;

export function createPool(connectionString) {
  if (!connectionString) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and configure it.");
  return new Pool({
    connectionString,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
    max: 5,
  });
}

export async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bestbuy_products (
      id BIGSERIAL PRIMARY KEY,
      search_query TEXT NOT NULL,
      result_position INTEGER NOT NULL CHECK (result_position > 0),
      sku TEXT NOT NULL,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      price NUMERIC(12, 2),
      currency CHAR(3) NOT NULL DEFAULT 'USD',
      image_url TEXT,
      model_number TEXT,
      mpn TEXT,
      upc TEXT,
      specifications JSONB NOT NULL DEFAULT '[]'::jsonb,
      search_url TEXT NOT NULL,
      scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (search_query, sku)
    );
    ALTER TABLE bestbuy_products ADD COLUMN IF NOT EXISTS search_query TEXT;
    ALTER TABLE bestbuy_products ADD COLUMN IF NOT EXISTS result_position INTEGER;
    ALTER TABLE bestbuy_products ADD COLUMN IF NOT EXISTS search_url TEXT;
    ALTER TABLE bestbuy_products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE bestbuy_products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    ALTER TABLE bestbuy_products ADD COLUMN IF NOT EXISTS image_url TEXT;
    ALTER TABLE bestbuy_products ADD COLUMN IF NOT EXISTS model_number TEXT;
    ALTER TABLE bestbuy_products ADD COLUMN IF NOT EXISTS mpn TEXT;
    ALTER TABLE bestbuy_products ADD COLUMN IF NOT EXISTS upc TEXT;
    CREATE UNIQUE INDEX IF NOT EXISTS bestbuy_products_query_sku_key
      ON bestbuy_products (search_query, sku);
    CREATE INDEX IF NOT EXISTS bestbuy_products_sku_idx ON bestbuy_products (sku);
    CREATE INDEX IF NOT EXISTS bestbuy_products_scraped_at_idx ON bestbuy_products (scraped_at DESC);

    CREATE TABLE IF NOT EXISTS bestbuy_product_searches (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES bestbuy_products(id) ON DELETE CASCADE,
      search_query TEXT NOT NULL,
      search_url TEXT NOT NULL,
      result_position INTEGER NOT NULL CHECK (result_position > 0),
      scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (product_id, search_query)
    );
    CREATE INDEX IF NOT EXISTS bestbuy_product_searches_query_idx
      ON bestbuy_product_searches (search_query);

    INSERT INTO bestbuy_product_searches
      (product_id, search_query, search_url, result_position, scraped_at)
    SELECT id, search_query, search_url, result_position, scraped_at
    FROM bestbuy_products
    WHERE search_query IS NOT NULL AND search_url IS NOT NULL AND result_position IS NOT NULL
    ON CONFLICT (product_id, search_query) DO NOTHING;

    CREATE OR REPLACE VIEW bestbuy_products_by_search AS
    SELECT
      p.id AS product_id, p.sku, p.name, p.url, p.price, p.currency,
      p.specifications, s.search_query, s.search_url, s.result_position,
      s.scraped_at, p.created_at, p.updated_at, p.image_url, p.model_number, p.mpn, p.upc
    FROM bestbuy_products p
    JOIN bestbuy_product_searches s ON s.product_id = p.id;
  `);
}

export async function saveProduct(pool, product) {
  await pool.query(
    `WITH saved_product AS (
       INSERT INTO bestbuy_products
         (search_query, result_position, sku, name, url, price, currency, image_url, model_number, mpn, upc, specifications, search_url, scraped_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, NOW(), NOW())
       ON CONFLICT (url) DO UPDATE SET
         sku = EXCLUDED.sku,
         name = EXCLUDED.name,
         price = EXCLUDED.price,
         currency = EXCLUDED.currency,
         image_url = COALESCE(EXCLUDED.image_url, bestbuy_products.image_url),
         model_number = COALESCE(EXCLUDED.model_number, bestbuy_products.model_number),
         mpn = COALESCE(EXCLUDED.mpn, bestbuy_products.mpn),
         upc = COALESCE(EXCLUDED.upc, bestbuy_products.upc),
         specifications = EXCLUDED.specifications,
         scraped_at = NOW(),
         updated_at = NOW()
       RETURNING id
     )
     INSERT INTO bestbuy_product_searches
       (product_id, search_query, search_url, result_position, scraped_at)
     SELECT id, $1, $13, $2, NOW() FROM saved_product
     ON CONFLICT (product_id, search_query) DO UPDATE SET
       search_url = EXCLUDED.search_url,
       result_position = EXCLUDED.result_position,
       scraped_at = NOW()`,
    [product.searchQuery, product.position, product.sku, product.name, product.url,
      product.price, product.currency, product.imageUrl, product.modelNumber, product.mpn, product.upc, JSON.stringify(product.specifications), product.searchUrl],
  );
}
