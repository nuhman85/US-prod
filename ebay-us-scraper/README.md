# eBay US HTML scraper

Imports products from a saved eBay US search-results HTML file into PostgreSQL. It stores the displayed item price, shipping fee to United States, and `total_price = item_price + shipping_fee`, along with the search term.

Every unique product listing in the saved HTML is imported by default. Set the
optional `MAX_ITEMS` environment variable only when you want to apply a cap.

## Setup

```bash
npm install
cp .env.example .env
```

Set `DATABASE_URL` in `.env`, then start the upload UI:

```bash
npm run ui
```

Open [http://127.0.0.1:4001](http://127.0.0.1:4001), select a saved eBay HTML page, preview it, and import. The search term is detected from eBay's canonical URL; the UI field or `SEARCH_TERM` can override it.

For command-line import:

```bash
npm run import-html -- "/path/to/Standing Desk for sale _ eBay.html"
# Optional explicit term:
npm run import-html -- "/path/to/page.html" "standing desk"
```

The app creates and upserts `ebay_us_products` by canonical item URL. Search terms are stored in `ebay_us_searches`, and `ebay_us_search_results` links products to searches. A single product can therefore belong to any number of search terms without duplicating its product record. The `search_term` column on `ebay_us_products` is retained as the most recently imported term for compatibility.

`shipping_fee` and `total_price` remain `NULL` if the saved listing does not show a shipping charge; free shipping is stored as `0.00`. Card-level condition, dimensions, features, price range, buying format, seller feedback, location, sold count, and watchers are stored in the `specifications` JSONB column when present in the saved page.

## Verify

```bash
npm test
npm run check
```
