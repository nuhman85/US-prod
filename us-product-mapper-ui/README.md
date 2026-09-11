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
