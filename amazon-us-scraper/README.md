# Amazon US affiliate search

A local browser-based tool that searches Amazon US from a search term,
saves the listings to PostgreSQL, and returns product links with the Associates
tag `compareallsto-20` attached. It does not require saved HTML.

## What it collects

- ASIN and product title
- price in USD when displayed
- rating and review count
- product image, Prime, and sponsored status
- canonical `amazon.com/dp/ASIN?tag=compareallsto-20` affiliate URL
- New, Used, or Both condition filtering using Amazon.com's search filter

The app follows Amazon.com result pages until there is no next page or the
configured page/product limit is reached. Amazon search results can change and
Amazon may request human verification. “All listings” therefore means all
listings exposed within those limits, not a guarantee of Amazon's entire catalog.

## Install and run

Requirements: Node.js 20+, Google Chrome, and PostgreSQL.

```bash
npm install
cp .env.example .env
npm start
```

Edit `.env` before starting and provide your PostgreSQL connection:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_SSL=false
```

Open <http://127.0.0.1:4003>, enter a search term, and click **Search
Amazon.com**. Keep the terminal open. If Amazon displays verification in the
browser window, complete it there and the search will continue.

The default `.env.example` already contains:

```dotenv
AFFILIATE_TAG=compareallsto-20
HEADLESS=false
MAX_PAGES=10
MAX_ITEMS=0
BROWSER_CHANNEL=chrome
DELIVERY_ZIP=10001
```

`MAX_ITEMS=0` means no product-count limit. Increase `MAX_PAGES` carefully if
you need deeper pagination. The browser profile is retained locally so Amazon
cookies and completed verification can persist between searches.

## Command line

```bash
npm run scrape -- "wireless headphones"
```

The command saves the products and prints the complete result as JSON.

Import a CSV previously downloaded from the search UI:

```bash
npm run import-csv -- "/path/to/amazon-results.csv" "original search term"
```

The search term is optional. When omitted, it is derived from the CSV filename.
The importer validates the data, removes duplicate ASINs within the file, and
uses the same transactional database upsert as a live search.

## Database behavior

The app creates `amazon_us_products` and `amazon_us_product_searches`
automatically. Products are upserted by ASIN, so finding the same Amazon item
again updates its price, rating, affiliate URL, and `scraped_at` timestamp
instead of creating a duplicate product. Each search also upserts a separate
product/search-term relationship. One ASIN can therefore belong to any number
of search terms and conditions without losing its earlier associations. The UI
reports both the number found and saved.

## Important distinction

An Amazon Associates tracking ID is not a Product Advertising API credential.
This project uses Amazon.com's public search pages in a real browser and adds the
tracking ID to the search and product URLs. If you later obtain Product
Advertising API access, that API would be a more stable source for product data.

Use this tool in accordance with Amazon's terms, Associates policies, and
applicable laws. Prices and availability should be treated as time-sensitive.
