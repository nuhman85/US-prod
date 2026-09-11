import pg from 'pg';

const { Pool } = pg;

export function createPool(connectionString, ssl = false) {
  return new Pool({
    connectionString,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10_000,
  });
}

export async function ensureSchema(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bestbuy_searches (
      id BIGSERIAL PRIMARY KEY,
      term TEXT NOT NULL UNIQUE,
      search_url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bestbuy_products (
      id BIGSERIAL PRIMARY KEY,
      sku TEXT,
      name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      price NUMERIC(12, 2),
      currency TEXT NOT NULL DEFAULT 'USD',
      specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
      search_url TEXT NOT NULL,
      scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS bestbuy_products_sku_idx ON bestbuy_products (sku)');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bestbuy_search_results (
      search_id BIGINT NOT NULL REFERENCES bestbuy_searches(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES bestbuy_products(id) ON DELETE CASCADE,
      position INTEGER NOT NULL CHECK (position > 0),
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (search_id, product_id)
    )
  `);
  await pool.query(`
    CREATE INDEX IF NOT EXISTS bestbuy_search_results_product_idx
    ON bestbuy_search_results (product_id)
  `);
}

export async function upsertSearch(pool, term, searchUrl) {
  const result = await pool.query(
    `INSERT INTO bestbuy_searches (term, search_url)
     VALUES ($1, $2)
     ON CONFLICT (term) DO UPDATE SET
       search_url = EXCLUDED.search_url,
       last_scraped_at = NOW()
     RETURNING id`,
    [term, searchUrl],
  );
  return result.rows[0].id;
}

export async function upsertProduct(pool, product, searchUrl) {
  const result = await pool.query(
    `INSERT INTO bestbuy_products
      (sku, name, url, price, currency, specifications, search_url, scraped_at)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW())
     ON CONFLICT (url) DO UPDATE SET
       sku = EXCLUDED.sku,
       name = EXCLUDED.name,
       price = EXCLUDED.price,
       currency = EXCLUDED.currency,
       specifications = EXCLUDED.specifications,
       search_url = EXCLUDED.search_url,
       scraped_at = NOW(),
       updated_at = NOW()
     RETURNING id`,
    [
      product.sku,
      product.name,
      product.url,
      product.price,
      product.currency || 'USD',
      JSON.stringify(product.specifications || {}),
      searchUrl,
    ],
  );
  return result.rows[0].id;
}

export async function linkSearchResult(pool, searchId, productId, position) {
  await pool.query(
    `INSERT INTO bestbuy_search_results (search_id, product_id, position)
     VALUES ($1, $2, $3)
     ON CONFLICT (search_id, product_id) DO UPDATE SET
       position = EXCLUDED.position,
       last_seen_at = NOW()`,
    [searchId, productId, position],
  );
}
