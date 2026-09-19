# MapleMatch

A responsive, PostgreSQL-backed product-matching interface for consolidating Amazon.com, Best Buy US, Walmart US, and eBay US listings.

Data-source model:

- Search terms and master products: `amazon_us_products`
- Match candidates: `bestbuy_products`, `walmart_us_products`, and `ebay_us_products`
- Saved consolidated records: `us-product-list`

The Express API ranks up to five retailer candidates using a hybrid of semantic similarity, title overlap, brand, exact model, storage, condition, and color. Conflicting brands, product types, models, and storage capacities are rejected before scoring. If the optional semantic service is offline, matching automatically falls back to title and metadata scoring. Database credentials stay server-side in a Git-ignored `.env`.

Install and run:

```bash
npm install
npm start
```

Then visit `http://localhost:4005`.

For semantic matching, install the Python model dependencies once and run the model service in a second terminal before starting the UI:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python semantic_matcher.py
```

The first run downloads `all-MiniLM-L6-v2`. The service listens on port `4010`; override it with `SEMANTIC_MATCHER_URL` in the mapper environment. Set `SEMANTIC_MATCHER_ENABLED=false` to explicitly use fallback matching only.

The **Imported keywords** menu opens `/imported-keywords`, a searchable list across Amazon, Best Buy, Walmart, eBay, and Newegg. It uses existing saved products and search associations, groups keyword capitalization/spacing variants, and shows distinct product counts and the latest saved date. Refresh after importing. Counts indicate stored associations, not whether every results page was imported.

The **US trends** menu opens `/us-trends`. It reads Google's public US Trending Now RSS feed and uses product-pattern rules to suggest related shopping keywords. These are ideas inferred from news-related search topics, not product sales rankings or measured demand for each suggested keyword. The public feed may contain no matching product topics. Suggestions include source topics, dates, Google Trends links, copy buttons, and retailer search links. Exact keyword import checks use the existing imported-keyword history; an unavailable database is shown as unknown, never as not imported.

The feed is fetched on demand, cached in memory for 10 minutes, and shared between simultaneous requests. If a refresh fails, previously fetched suggestions are explicitly marked stale; without cached data an error and retry action are shown. Feed requests time out after 15 seconds. This requires outbound HTTPS access to `trends.google.com`, but no API key. See [Google's Trending Now help](https://support.google.com/trends/answer/3076011?hl=en) for the source's RSS export and geographic filters.
