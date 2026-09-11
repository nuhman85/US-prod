import pg from "pg";

const { Pool } = pg;

function pool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
  });
}

export async function saveProducts(products, expected = 15) {
  if (products.length < expected) throw new Error(`Expected ${expected} products with URLs and prices, found ${products.length}`);
  const db = pool();
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
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
    await client.query("ALTER TABLE newegg_us_products ADD COLUMN IF NOT EXISTS image_url TEXT");
    for (const column of ["model_number", "mpn", "upc"]) {
      await client.query(`ALTER TABLE newegg_us_products ADD COLUMN IF NOT EXISTS ${column} TEXT`);
    }
    await client.query(`
      CREATE TABLE IF NOT EXISTS newegg_us_product_search_terms (
        product_id BIGINT NOT NULL REFERENCES newegg_us_products(id) ON DELETE CASCADE,
        search_term TEXT NOT NULL, search_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (product_id, search_term)
      )
    `);
    for (const product of products) {
      const saved = await client.query(`
        INSERT INTO newegg_us_products
          (url,name,price,currency,sku,brand,availability,seller,image_url,model_number,mpn,upc,specifications,search_term,search_url,scraped_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,NOW())
        ON CONFLICT (url) DO UPDATE SET name=EXCLUDED.name,price=EXCLUDED.price,currency=EXCLUDED.currency,
          sku=EXCLUDED.sku,brand=EXCLUDED.brand,availability=EXCLUDED.availability,seller=EXCLUDED.seller,
          image_url=COALESCE(EXCLUDED.image_url, newegg_us_products.image_url),
          model_number=COALESCE(EXCLUDED.model_number, newegg_us_products.model_number),
          mpn=COALESCE(EXCLUDED.mpn, newegg_us_products.mpn),
          upc=COALESCE(EXCLUDED.upc, newegg_us_products.upc),
          specifications=EXCLUDED.specifications,search_term=EXCLUDED.search_term,search_url=EXCLUDED.search_url,scraped_at=NOW()
        RETURNING id
      `, [product.url, product.name, product.price, product.currency, product.sku, product.brand,
        product.availability, product.seller, product.imageUrl, product.modelNumber, product.mpn, product.upc,
        JSON.stringify(product.specifications), product.searchTerm, product.searchUrl]);
      await client.query(`
        INSERT INTO newegg_us_product_search_terms (product_id,search_term,search_url,updated_at)
        VALUES ($1,$2,$3,NOW())
        ON CONFLICT (product_id,search_term) DO UPDATE SET search_url=EXCLUDED.search_url,updated_at=NOW()
      `, [saved.rows[0].id, product.searchTerm, product.searchUrl]);
    }
    await client.query("COMMIT");
    return products;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await db.end();
  }
}
