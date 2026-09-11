# Walmart US scraper

Collects the first 15 products from a Walmart US search and upserts their
canonical item URL, price, SKU, and structured specifications into PostgreSQL.

The project supports two workflows:

- **HTML upload UI (recommended):** save a working Walmart search page in your
  normal browser, select it in the local UI, preview the products, and import.
- **Browser scraper:** open Walmart with Playwright and scrape product pages
  directly. This may require manual human verification.

## Requirements

- Node.js 20 or newer
- PostgreSQL
- Google Chrome or Playwright Chromium for direct browser scraping

## Install

```bash
git clone git@github.com:nuhman85/walmart-us-scraper.git
cd walmart-us-scraper
npm install
cp .env.example .env
```

Edit `.env` and set at least:

```dotenv
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE
SEARCH_URL=https://www.walmart.com/en/search?q=YOUR+SEARCH
SEARCH_TERM=YOUR SEARCH
MAX_ITEMS=15
HEADLESS=false
```

The real `.env` file is ignored by Git and must not be committed.

`SEARCH_TERM` is saved with every product. It may be omitted when `SEARCH_URL`
contains a `q` parameter, in which case the scraper derives the term from that
parameter.

## Run the HTML upload UI

Start the local server:

```bash
npm run ui
```

Then open [http://127.0.0.1:4001](http://127.0.0.1:4001).

In the UI:

1. Select or drag-and-drop a saved `.html` or `.htm` Walmart search page.
2. Click **Preview products**.
3. Confirm that the preview contains 15 products with URLs and prices.
4. Click **Import to database**.

The server listens on port `4004` by default. To use another port, add `PORT`
to `.env`:

```dotenv
PORT=4000
```

Keep the terminal running while using the UI. Stop the server with `Ctrl+C`.

### Save a Walmart page for upload

Open the Walmart US search-results page in a browser where it loads normally,
then press `Ctrl+S` on Windows/Linux or `Cmd+S` on macOS. Choose **Webpage, HTML
Only** or **Webpage, Complete**, save the file, and select that HTML file in the
UI. The importer does not make another request to Walmart.

The maximum upload size is 20 MB. The importer reads the first 15 unique product
cards that have both a canonical Walmart item URL and a current price.

The search term is detected from Walmart's embedded `__NEXT_DATA__` in each
uploaded HTML file. `SEARCH_TERM` or the `q` value in `SEARCH_URL` is used only
as a fallback when the saved page does not contain search metadata.

## Import HTML from the command line

The same importer can run without the UI:

```bash
npm run import-html -- "/path/to/Walmart US.html"
```

## Run the direct browser scraper

Install Playwright Chromium once:

```bash
npx playwright install chromium
```

Start scraping:

```bash
npm run scrape
```

The browser is visible by default. If Walmart displays human verification,
complete it in the open browser. The scraper resumes automatically and retries a
stuck verification page every 20 seconds. Browser data is stored in the profile
directory configured by `PROFILE_DIR`.

Useful browser settings:

```dotenv
BROWSER_CHANNEL=chrome
PROFILE_DIR=.walmart-browser-profile
HEADLESS=false
```

Set `HEADLESS=true` only after the saved browser profile has been verified. If
Walmart repeatedly redirects to `/blocked`, use the HTML upload workflow; the
challenge may be tied to the current network/IP and cannot be bypassed by the
scraper.

## Database behavior

The app creates `walmart_us_products` automatically. Products are upserted using
their canonical Walmart item URL, so importing the same page again updates the
price, specifications, availability, and `scraped_at` instead of creating a
duplicate.

Search membership is stored separately in `walmart_us_product_search_terms`.
The same product URL can therefore belong to multiple search terms without
duplicating the product or overwriting its earlier search associations.

Important columns include:

- `url`
- `name`
- `price` and `currency`
- `sku` and `brand`
- `availability`
- `specifications` (`JSONB`)
- `search_url`
- `search_term`
- `scraped_at` and `created_at`

## Commands

```bash
npm run ui           # Start the local HTML upload UI
npm run import-html  # Import a saved HTML file (pass its path after --)
npm run scrape       # Run the direct Playwright scraper
npm run check        # Validate JavaScript syntax
```

## Troubleshooting

- **The UI does not open:** confirm `npm run ui` is still running and use the
  exact URL printed in the terminal.
- **Fewer than 15 products found:** save the search page again after scrolling
  until at least 15 product cards are loaded.
- **Database connection fails:** verify `DATABASE_URL`, the PostgreSQL port,
  firewall access, and whether the server requires `DATABASE_SSL=true`.
- **Walmart verification never clears:** import a page saved from a normal
  browser instead of retrying automated access.
