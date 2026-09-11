import pg from "pg";

const { Pool } = pg;

function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to save Amazon products");
  }
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
}

async function ensureSchema(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS amazon_us_products (
      id BIGSERIAL PRIMARY KEY,
      asin VARCHAR(10) NOT NULL UNIQUE,
      title TEXT NOT NULL,
      price NUMERIC(12, 2),
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      rating NUMERIC(3, 2),
      review_count INTEGER,
      image_url TEXT,
      model_number TEXT,
      mpn TEXT,
      upc TEXT,
      affiliate_url TEXT NOT NULL,
      affiliate_tag TEXT NOT NULL,
      is_prime BOOLEAN NOT NULL DEFAULT FALSE,
      is_sponsored BOOLEAN NOT NULL DEFAULT FALSE,
      condition_filter VARCHAR(4) NOT NULL DEFAULT 'both',
      search_term TEXT NOT NULL,
      search_url TEXT NOT NULL,
      scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(`
    ALTER TABLE amazon_us_products
    ADD COLUMN IF NOT EXISTS condition_filter VARCHAR(4) NOT NULL DEFAULT 'both'
  `);
  for (const column of ["model_number", "mpn", "upc"]) {
    await client.query(`ALTER TABLE amazon_us_products ADD COLUMN IF NOT EXISTS ${column} TEXT`);
  }
  await client.query(`
    CREATE INDEX IF NOT EXISTS amazon_us_products_search_term_idx
    ON amazon_us_products (search_term)
  `);
  await client.query(`
    CREATE TABLE IF NOT EXISTS amazon_us_product_searches (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES amazon_us_products(id) ON DELETE CASCADE,
      search_term TEXT NOT NULL,
      search_url TEXT NOT NULL,
      condition_filter VARCHAR(4) NOT NULL DEFAULT 'both',
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (product_id, search_term, condition_filter)
    )
  `);
  await client.query(`
    CREATE INDEX IF NOT EXISTS amazon_us_product_searches_term_idx
    ON amazon_us_product_searches (search_term)
  `);
  await client.query(`
    INSERT INTO amazon_us_product_searches
      (product_id, search_term, search_url, condition_filter, first_seen_at, last_seen_at)
    SELECT id, search_term, search_url, condition_filter, created_at, scraped_at
    FROM amazon_us_products
    ON CONFLICT (product_id, search_term, condition_filter) DO NOTHING
  `);
}

export async function saveSearchResults(result) {
  const pool = createPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await ensureSchema(client);
    for (const product of result.products) {
      const savedProduct = await client.query(`
        INSERT INTO amazon_us_products (
          asin, title, price, currency, rating, review_count, image_url, model_number, mpn, upc,
          affiliate_url, affiliate_tag, is_prime, is_sponsored, condition_filter, search_term,
          search_url, scraped_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, NOW()
        )
        ON CONFLICT (asin) DO UPDATE SET
          title = EXCLUDED.title,
          price = EXCLUDED.price,
          currency = EXCLUDED.currency,
          rating = EXCLUDED.rating,
          review_count = EXCLUDED.review_count,
          image_url = EXCLUDED.image_url,
          model_number = COALESCE(EXCLUDED.model_number, amazon_us_products.model_number),
          mpn = COALESCE(EXCLUDED.mpn, amazon_us_products.mpn),
          upc = COALESCE(EXCLUDED.upc, amazon_us_products.upc),
          affiliate_url = EXCLUDED.affiliate_url,
          affiliate_tag = EXCLUDED.affiliate_tag,
          is_prime = EXCLUDED.is_prime,
          is_sponsored = EXCLUDED.is_sponsored,
          condition_filter = EXCLUDED.condition_filter,
          search_term = EXCLUDED.search_term,
          search_url = EXCLUDED.search_url,
          scraped_at = NOW()
        RETURNING id
      `, [
        product.asin,
        product.title,
        product.price,
        product.currency,
        product.rating,
        product.reviewCount,
        product.imageUrl,
        product.modelNumber || null,
        product.mpn || null,
        product.upc || null,
        product.affiliateUrl,
        result.affiliateTag,
        product.prime,
        product.sponsored,
        result.condition || product.condition || "both",
        result.searchTerm,
        result.searchUrl,
      ]);
      await client.query(`
        INSERT INTO amazon_us_product_searches
          (product_id, search_term, search_url, condition_filter, last_seen_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (product_id, search_term, condition_filter) DO UPDATE SET
          search_url = EXCLUDED.search_url,
          last_seen_at = NOW()
      `, [
        savedProduct.rows[0].id,
        result.searchTerm,
        result.searchUrl,
        result.condition || product.condition || "both",
      ]);
    }
    await client.query("COMMIT");
    return result.products.length;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
