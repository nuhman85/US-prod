# Best Buy US scraper

Searches BestBuy.com, retrieves each selected product's URL, current price, and specifications, and upserts the data into PostgreSQL.

The project supports two workflows:

- **HTML upload UI (recommended):** save a working Best Buy search page in your normal browser, select it in the local UI, preview every unique main product found, and import.
- **Direct scraper:** use Best Buy US's storefront JSON endpoints, with Playwright browser rendering as a fallback.

## Setup

Requires Node.js 20+.

```bash
npm install
npx playwright install chromium
cp .env.example .env
```

Set `DATABASE_URL` in `.env`. The scraper creates the `bestbuy_products` table and indexes automatically. Do not commit `.env`.

## Usage

### HTML upload UI (recommended)

```bash
npm run ui
```

Open [http://127.0.0.1:4002](http://127.0.0.1:4002), enter the search query, then select or drag-and-drop a saved Best Buy `.html` page. The preview runs automatically and includes every unique main product with a URL and price; colour/size variant links are excluded. **Import to database** is enabled when at least one valid product is found. Port `4002` is used by default so it can run beside the Walmart importer on port `4004`.

To save the page, open the Best Buy US search results in your normal browser, scroll until all desired results are loaded, then press `Cmd+S` on macOS or `Ctrl+S` on Windows/Linux. Save as **Webpage, HTML Only** or **Webpage, Complete**. The maximum upload size is 20 MB.

You can also import a saved file from the command line:

```bash
npm run import-html -- "/path/to/Best Buy Search.html" "Samsung Galaxy Tab S10+ 512GB"
```

Use `PORT=4000` in `.env` to change the UI port.

### Direct scraper

Default results 1–15:

```bash
npm run scrape -- "Samsung Galaxy Tab S10+ 512GB"
```

Results 1–5:

```bash
npm run scrape -- "Samsung Galaxy Tab S10+ 512GB" --to 5
```

Results 10–15:

```bash
npm run scrape -- "Samsung Galaxy Tab S10+ 512GB" --from 10 --to 15
```

The result positions are inclusive. Re-running a search updates existing rows by canonical product URL. Set `HEADLESS=false` in `.env` to watch the browser for troubleshooting.

## Stored fields

Canonical product data is stored once in `bestbuy_products`. Search membership is stored in `bestbuy_product_searches`, so the same product can belong to multiple search terms without duplication or losing earlier associations.

Use the `bestbuy_products_by_search` view to read products together with their search term, search URL, and result position:

```sql
SELECT *
FROM bestbuy_products_by_search
WHERE search_query = 'apple macbook air 13 inch'
ORDER BY result_position;
```

Important fields include `search_query`, `search_url`, `result_position`, `sku`, `name`, `url`, `price`, `currency`, `specifications` (JSONB), and timestamps.

If a compatible `bestbuy_products` table already exists, missing search/range columns and indexes are added without deleting or rewriting existing rows.

Run unit tests with `npm test`.
