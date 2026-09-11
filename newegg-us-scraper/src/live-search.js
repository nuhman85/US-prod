import { chromium } from "playwright";
import { buildSearchUrl, parseProducts } from "./parser.js";

export async function searchNewegg(searchTerm, limit = 15, startPage = 1) {
  const term = String(searchTerm || "").replace(/\s+/g, " ").trim();
  if (term.length < 2) throw new Error("Enter at least two characters for the Newegg search");
  const firstPage = Number.parseInt(startPage, 10);
  if (!Number.isInteger(firstPage) || firstPage < 1 || firstPage > 100) {
    throw new Error("Page index must be between 1 and 100");
  }
  const browser = await chromium.launch({ headless: process.env.HEADLESS !== "false" });
  try {
    const page = await browser.newPage({ locale: "en-US" });
    const products = [];
    const seen = new Set();
    const maxPages = 5;

    for (let pageNumber = firstPage; pageNumber < firstPage + maxPages && products.length < limit; pageNumber += 1) {
      // Keep Newegg's conventional page boundary so page 2 means the next
      // result page, rather than item 97 when an oversized page is requested.
      await page.goto(buildSearchUrl(term, { page: pageNumber, pageSize: 36 }), {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      });
      await page.waitForSelector(".item-cell, .item-container, [data-testid='product-card']", {
        timeout: 30_000,
      });
      await page.locator("body").press("End");
      await page.waitForTimeout(750);

      const pageProducts = parseProducts(await page.content(), {
        searchTerm: term,
        limit: Math.max(limit * 4, 60),
      });
      let added = 0;
      for (const product of pageProducts) {
        if (seen.has(product.url)) continue;
        seen.add(product.url);
        products.push(product);
        added += 1;
        if (products.length >= limit) break;
      }
      // Newegg sometimes ignores page= on a final/short result page. Avoid
      // repeatedly parsing the same cards when no new URLs are returned.
      if (added === 0) break;
    }

    if (products.length < limit) throw new Error(`Newegg returned ${products.length} valid products; ${limit} are required before import`);
    return products.slice(0, limit);
  } finally {
    await browser.close();
  }
}
