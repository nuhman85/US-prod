import { chromium } from "playwright";
import { buildSearchUrl, parseProducts } from "./parser.js";

export async function searchNewegg(
  searchTerm,
  limit = 15,
  startPage = 1,
  pages = 1,
) {
  const term = String(searchTerm || "")
    .replace(/\s+/g, " ")
    .trim();
  if (term.length < 2)
    throw new Error("Enter at least two characters for the Newegg search");
  const firstPage = Number(startPage);
  const pageCount = Number(pages);
  if (!Number.isInteger(firstPage) || firstPage < 1 || firstPage > 100) {
    throw new Error("Start page must be between 1 and 100");
  }
  if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > 20) {
    throw new Error("Pages must be between 1 and 20");
  }
  if (firstPage + pageCount - 1 > 100) {
    throw new Error("Page range cannot exceed page 100");
  }
  const browser = await chromium.launch({
    headless: process.env.HEADLESS !== "false",
  });
  try {
    const page = await browser.newPage({ locale: "en-US" });
    const products = [];
    const seen = new Set();

    for (
      let pageNumber = firstPage;
      pageNumber < firstPage + pageCount;
      pageNumber += 1
    ) {
      // Keep Newegg's conventional page boundary so page 2 means the next
      // result page, rather than item 97 when an oversized page is requested.
      await page.goto(
        buildSearchUrl(term, { page: pageNumber, pageSize: 36 }),
        {
          waitUntil: "domcontentloaded",
          timeout: 60_000,
        },
      );
      await page.waitForSelector(
        ".item-cell, .item-container, [data-testid='product-card']",
        {
          timeout: 30_000,
        },
      );
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
      }
      // Newegg sometimes ignores page= on a final/short result page. Avoid
      // repeatedly parsing the same cards when no new URLs are returned.
      if (added === 0) break;
    }

    if (products.length === 0)
      throw new Error("Newegg returned no valid products for this page range");
    return products;
  } finally {
    await browser.close();
  }
}
