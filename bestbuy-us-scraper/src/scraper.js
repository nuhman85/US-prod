import { chromium } from "playwright";

const BASE_URL = "https://www.bestbuy.com";
const API_HEADERS = {
  Accept: "application/json",
  "User-Agent": "BestBuy/20 CFNetwork/1490.0.4 Darwin/23.2.0",
};

export function skuFromUrl(url) {
  const match = String(url).match(/[?&]skuId=(\d{5,10})(?:&|$)/i)
    || String(url).match(/\/sku\/(\d{5,10})(?:[/?#]|$)/i)
    || String(url).match(/\/(\d{5,10})\.p(?:[/?#]|$)/i)
    || String(url).match(/\/(\d{5,10})(?:[/?#]|$)/);
  return match?.[1] ?? null;
}

export function priceToNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value ?? "").replace(/[^\d.,-]/g, "").replace(/,/g, "");
  const price = Number.parseFloat(normalized);
  return Number.isFinite(price) ? price : null;
}

function envBoolean(name, fallback) {
  const value = process.env[name];
  return value == null ? fallback : /^(1|true|yes)$/i.test(value);
}

function identifiers(name, detail = {}, specs = []) {
  const specValue = (pattern) => specs.find((spec) => pattern.test(spec?.name || ""))?.value || null;
  const titleModel = String(name || "").match(/\b((?:UN|QN|LH|HG)\d{2}[A-Z][A-Z0-9._/-]{3,})\b/i)?.[1] || null;
  return {
    modelNumber: detail.modelNumber || detail.model || specValue(/^model(?: number)?$/i) || titleModel,
    mpn: detail.mpn || detail.manufacturerPartNumber || specValue(/^(?:mpn|manufacturer part number)$/i),
    upc: detail.upc || detail.gtin12 || specValue(/^upc$/i),
  };
}

async function dismissOverlays(page) {
  for (const label of [/accept/i, /agree/i, /close/i, /no thanks/i]) {
    const button = page.getByRole("button", { name: label }).first();
    if (await button.isVisible().catch(() => false)) await button.click({ timeout: 1_000 }).catch(() => {});
  }
}

async function collectSearchResults(page, query, needed) {
  const url = `${BASE_URL}/site/searchpage.jsp?st=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await dismissOverlays(page);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.mouse.wheel(0, 2_500);
    await page.waitForTimeout(700);
    const count = await page.locator('a[href*="/product/"][href*="/sku/"], a[href*="/site/"][href*=".p"]').count();
    if (count >= needed) break;
  }

  const results = await page.locator('a[href*="/product/"][href*="/sku/"], a[href*="/site/"][href*=".p"]').evaluateAll((links) => {
    const unique = new Map();
    for (const anchor of links) {
      const href = anchor.href;
      const sku = href.match(/[?&]skuId=(\d{5,10})(?:&|$)/i)?.[1]
        || href.match(/\/sku\/(\d{5,10})(?:[/?#]|$)/i)?.[1]
        || href.match(/\/(\d{5,10})\.p(?:[/?#]|$)/i)?.[1];
      if (!sku || unique.has(sku)) continue;
      const card = anchor.closest('li, article, [data-automation*="product"], [class*="productItem"]');
      const text = (anchor.getAttribute("aria-label") || anchor.textContent || card?.textContent || "")
        .replace(/\s+/g, " ").trim();
      unique.set(sku, { sku, url: href.split("?")[0], searchName: text });
    }
    return [...unique.values()];
  });

  if (!results.length) {
    const title = await page.title();
    throw new Error(`No product links found (page title: ${title}). Best Buy may have shown a bot check.`);
  }
  return results;
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { headers: API_HEADERS, signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`Best Buy API request failed for ${url}: ${lastError.message}`);
}

async function scrapeViaApi({ query, from, to, onProduct }) {
  const searchUrl = `${BASE_URL}/site/searchpage.jsp?st=${encodeURIComponent(query)}`;
  const params = new URLSearchParams({ query, page: "1", pageSize: String(to), lang: "en" });
  const search = await fetchJson(`${BASE_URL}/api/v2/json/search?${params}`);
  const selected = (search.products || []).slice(from - 1, to);
  if (selected.length < to - from + 1) {
    throw new Error(`Best Buy returned only ${search.products?.length || 0} results; cannot select ${from}-${to}`);
  }

  const products = [];
  for (let index = 0; index < selected.length; index += 1) {
    const listing = selected[index];
    const detail = await fetchJson(`${BASE_URL}/api/v2/json/product/${encodeURIComponent(listing.sku)}?lang=en`);
    const specifications = Array.isArray(detail.specs)
      ? detail.specs.map(({ group, name, value }) => ({ group: group || "", name, value }))
      : [];
    const product = {
      searchQuery: query,
      searchUrl,
      position: from + index,
      sku: String(detail.sku || listing.sku),
      name: detail.name || listing.name,
      url: new URL(detail.productUrl || listing.productUrl, BASE_URL).href,
      imageUrl: detail.image || detail.imageUrl || listing.image || listing.imageUrl || null,
      price: priceToNumber(detail.salePrice ?? listing.salePrice ?? detail.regularPrice),
      currency: "USD",
      specifications,
      ...identifiers(detail.name || listing.name, detail, specifications),
    };
    await onProduct(product);
    products.push(product);
  }
  return products;
}

async function readProduct(page, item) {
  await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await dismissOverlays(page);
  await page.waitForTimeout(700);

  return page.evaluate(({ item }) => {
    const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .flatMap((script) => {
        try {
          const parsed = JSON.parse(script.textContent || "null");
          return Array.isArray(parsed) ? parsed : [parsed];
        } catch { return []; }
      })
      .flatMap((entry) => entry?.["@graph"] || entry || [])
      .find((entry) => entry?.["@type"] === "Product") || {};

    const specs = {};
    const put = (key, value) => {
      const cleanKey = String(key || "").replace(/\s+/g, " ").trim();
      const cleanValue = String(value || "").replace(/\s+/g, " ").trim();
      if (cleanKey && cleanValue && cleanKey.length < 150 && cleanValue.length < 2_000) specs[cleanKey] = cleanValue;
    };
    document.querySelectorAll("table tr").forEach((row) => {
      const cells = row.querySelectorAll("th, td");
      if (cells.length >= 2) put(cells[0].textContent, cells[1].textContent);
    });
    document.querySelectorAll("dt").forEach((dt) => put(dt.textContent, dt.nextElementSibling?.textContent));

    const offer = Array.isArray(jsonLd.offers) ? jsonLd.offers[0] : jsonLd.offers || {};
    const visiblePrice = document.querySelector('[data-automation="product-price"], [class*="price"]')?.textContent;
    const heading = document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim();
    return {
      ...item,
      name: jsonLd.name || heading || item.searchName || `Best Buy product ${item.sku}`,
      imageUrl: (Array.isArray(jsonLd.image) ? jsonLd.image[0] : jsonLd.image)
        || document.querySelector('meta[property="og:image"]')?.content
        || document.querySelector('img[alt*="product" i]')?.src
        || null,
      priceRaw: offer.price ?? visiblePrice ?? null,
      currency: offer.priceCurrency || "USD",
      specifications: specs,
    };
  }, { item });
}

export async function scrapeProducts({ query, from, to, onProduct }) {
  try {
    return await scrapeViaApi({ query, from, to, onProduct });
  } catch (apiError) {
    if (!/Best Buy API request failed|Best Buy returned only/.test(apiError.message)) throw apiError;
    console.warn(`JSON API unavailable (${apiError.message}); falling back to browser rendering.`);
  }

  const browser = await chromium.launch({ headless: envBoolean("HEADLESS", true) });
  const context = await browser.newContext({
    locale: "en-US",
    timezoneId: "America/Toronto",
    viewport: { width: 1440, height: 1000 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36",
  });
  try {
    const searchPage = await context.newPage();
    const allResults = await collectSearchResults(searchPage, query, to);
    await searchPage.close();
    const selected = allResults.slice(from - 1, to);
    if (selected.length < to - from + 1) {
      throw new Error(`Best Buy returned only ${allResults.length} accessible results; cannot select ${from}-${to}`);
    }

    const products = [];
    for (let index = 0; index < selected.length; index += 1) {
      const page = await context.newPage();
      try {
        const raw = await readProduct(page, selected[index]);
        const product = {
          searchQuery: query,
          searchUrl: `${BASE_URL}/site/searchpage.jsp?st=${encodeURIComponent(query)}`,
          position: from + index,
          sku: raw.sku,
          name: raw.name,
          url: raw.url,
          imageUrl: raw.imageUrl,
          price: priceToNumber(raw.priceRaw),
          currency: raw.currency,
          specifications: raw.specifications,
          ...identifiers(raw.name, {}, Object.entries(raw.specifications || {}).map(([name, value]) => ({ name, value }))),
        };
        await onProduct(product);
        products.push(product);
      } finally {
        await page.close();
      }
    }
    return products;
  } finally {
    await context.close();
    await browser.close();
  }
}
