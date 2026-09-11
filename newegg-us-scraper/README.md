# Newegg US scraper

Runs on port `4006` and stores products in `newegg_us_products` with search associations in `newegg_us_product_search_terms`.

```bash
npm install
cp .env.example .env
npm run scrape -- --term "gaming laptop"
npm run ui
```

Open `http://127.0.0.1:4006` to search Newegg live, preview 15 results, and import them. The same page also supports downloaded HTML files.

The app prefers its local `.env`. If `DATABASE_URL` is not set there, it automatically reuses the database configuration from `../walmart-us-scraper/.env`.

The HTML importer requires the first `MAX_ITEMS` products (15 by default) to have a Newegg product URL and positive price before database import is enabled.
