import 'dotenv/config';
import { chromium } from 'playwright';
import {
  buildSearchUrl,
  parseResultRange,
  parseSearchTerm,
  termFromSearchUrl,
} from './cli.js';
import {
  createPool,
  ensureSchema,
  linkSearchResult,
  upsertProduct,
  upsertSearch,
} from './db.js';
import { scrapeBestBuy } from './scraper.js';

const DEFAULT_SEARCH_URL = 'https://www.bestbuy.com/site/searchpage.jsp?id=pcat17071&st=Samsung%20Galaxy%20Tab%20S10%2B%20Plus%2012.4%E2%80%9D%20512GB%20';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is required. Copy .env.example to .env and set it.');

  const cliArgs = process.argv.slice(2);
  const cliTerm = parseSearchTerm(cliArgs);
  const configuredUrl = process.env.SEARCH_URL || DEFAULT_SEARCH_URL;
  const searchTerm = cliTerm || process.env.SEARCH_TERM || termFromSearchUrl(configuredUrl);
  if (!searchTerm) throw new Error('A search term is required. Use: npm run scrape -- --term "your search"');
  const searchUrl = cliTerm || process.env.SEARCH_TERM ? buildSearchUrl(searchTerm) : configuredUrl;
  const defaultTo = Math.min(Math.max(Number.parseInt(process.env.MAX_ITEMS || '15', 10), 1), 100);
  const { from, to } = parseResultRange(cliArgs, defaultTo);
  const headless = process.env.HEADLESS !== 'false';
  const pool = createPool(databaseUrl, process.env.DB_SSL === 'true');
  let browser;

  try {
    await ensureSchema(pool);
    const searchId = await upsertSearch(pool, searchTerm, searchUrl);
    console.log(`Search id=${searchId}, term="${searchTerm}", results ${from}-${to}`);
    // Best Buy intermittently resets Chromium HTTP/2 streams; HTTP/1.1 is stable.
    const proxy = process.env.PROXY_SERVER ? {
      server: process.env.PROXY_SERVER,
      username: process.env.PROXY_USERNAME,
      password: process.env.PROXY_PASSWORD,
    } : undefined;
    browser = await chromium.launch({ headless, args: ['--disable-http2'], proxy });
    const products = await scrapeBestBuy(browser, searchUrl, to, async (product, index, total) => {
      const id = await upsertProduct(pool, product, searchUrl);
      await linkSearchResult(pool, searchId, id, index);
      console.log(`[${index}/${total}] saved DB id=${id}, sku=${product.sku || 'unknown'}: ${product.name}`);
    }, process.env.FETCH_DETAILS === 'true', from);
    console.log(`Done. Saved ${products.length} Best Buy product(s).`);
  } finally {
    await browser?.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
