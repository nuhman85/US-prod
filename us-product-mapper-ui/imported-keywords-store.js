// Table and column names below are fixed application schema identifiers.
const sources = [
  ['Amazon', 'amazon_us_products', 'id', 'search_term', 'scraped_at'],
  ['Amazon', 'amazon_us_product_searches', 'product_id', 'search_term', 'last_seen_at'],
  ['Best Buy', 'bestbuy_products', 'id', 'search_query', 'scraped_at'],
  ['Best Buy', 'bestbuy_product_searches', 'product_id', 'search_query', 'scraped_at'],
  ['Walmart', 'walmart_us_products', 'id', 'search_term', 'scraped_at'],
  ['Walmart', 'walmart_us_product_search_terms', 'product_id', 'search_term', 'updated_at'],
  ['eBay', 'ebay_us_products', 'id', 'search_term', 'scraped_at'],
  ['Newegg', 'newegg_us_products', 'id', 'search_term', 'scraped_at'],
  ['Newegg', 'newegg_us_product_search_terms', 'product_id', 'search_term', 'updated_at'],
];

export async function readImportedKeywords(db, retailer = null) {
  const schema = await db.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()`);
  const columns = new Map();
  for (const row of schema.rows) {
    if (!columns.has(row.table_name)) columns.set(row.table_name, new Set());
    columns.get(row.table_name).add(row.column_name);
  }
  const has = (table, ...names) => names.every(name => columns.get(table)?.has(name));
  const selects = sources.filter(([name, table, id, term, date]) => (!retailer || name === retailer) && has(table, id, term, date))
    .map(([name, table, id, term, date]) => `SELECT '${name}' AS retailer, ${id} AS product_id, ${term} AS keyword, ${date} AS saved_at FROM ${table}`);
  for (const [name, searches, results, term] of [
    ['eBay', 'ebay_us_searches', 'ebay_us_search_results', 'search_term'],
    ['Best Buy', 'bestbuy_searches', 'bestbuy_search_results', 'term'],
  ]) {
    if ((!retailer || name === retailer) && has(searches, 'id', term) && has(results, 'search_id', 'product_id', 'last_seen_at')) {
      selects.push(`SELECT '${name}' AS retailer, r.product_id, s.${term} AS keyword, r.last_seen_at AS saved_at FROM ${searches} s JOIN ${results} r ON r.search_id = s.id`);
    }
  }
  if (!selects.length) return [];
  const result = await db.query(`
    WITH imported AS (${selects.join('\nUNION ALL\n')})
    SELECT retailer, LOWER(REGEXP_REPLACE(BTRIM(keyword), '\\s+', ' ', 'g')) AS keyword,
           COUNT(DISTINCT product_id)::integer AS product_count, MAX(saved_at) AS last_imported_at
    FROM imported WHERE keyword IS NOT NULL AND BTRIM(keyword) <> ''
    GROUP BY retailer, LOWER(REGEXP_REPLACE(BTRIM(keyword), '\\s+', ' ', 'g'))
    ORDER BY MAX(saved_at) DESC NULLS LAST, keyword, retailer
  `);
  return result.rows;
}
