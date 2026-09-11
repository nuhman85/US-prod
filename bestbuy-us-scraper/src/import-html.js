import "dotenv/config";
import { readFile } from "node:fs/promises";
import { load } from "cheerio";
import { createPool, ensureSchema, saveProduct } from "./database.js";
import { priceToNumber, skuFromUrl } from "./scraper.js";

const BASE_URL = "https://www.bestbuy.com";

function clean(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim() || null;
}

function imageUrl(value) {
  const candidate = clean(typeof value === "object" ? value?.url : value);
  return /^https?:\/\//i.test(candidate || "") ? candidate : null;
}

function productIdentifiers(name, value = {}, specs = []) {
  const specValue = (pattern) => clean(specs.find((spec) => pattern.test(spec?.name || spec?.key || ""))?.value);
  const labeledModel = name?.match(/\bmodel(?:\s+(?:number|no\.?))?\s*[:#-]?\s*([A-Z0-9][A-Z0-9._/-]{2,})\b/i)?.[1];
  const samsungModel = name?.match(/\b((?:UN|QN|LH|HG)\d{2}[A-Z][A-Z0-9._/-]{3,})\b/i)?.[1];
  return {
    modelNumber: clean(value.modelNumber || value.model || specValue(/^model(?: number)?$/i) || labeledModel || samsungModel),
    mpn: clean(value.mpn || value.manufacturerPartNumber || specValue(/^(?:mpn|manufacturer part number)$/i)),
    upc: clean(value.upc || value.gtin12 || specValue(/^upc$/i)),
  };
}

function canonicalUrl(href) {
  try {
    const url = new URL(href, BASE_URL);
    if (!/(^|\.)bestbuy\.com$/i.test(url.hostname) || !/\/(?:site|product)\//.test(url.pathname) || !skuFromUrl(url.href)) return null;
    url.protocol = "https:";
    url.search = "";
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

function titleSpecifications(name) {
  const specs = [];
  const add = (group, key, regex) => {
    const match = name.match(regex);
    if (match) specs.push({ group, name: key, value: clean(match[1] || match[0]) });
  };
  add("General", "Product Condition", /\b(Open Box|Refurbished(?:\s*\([^)]+\))?|Brand New|Renewed)\b/i);
  if (/\b(laptop|monitor|television|\btv\b|tablet|display|screen)\b/i.test(name)) {
    add("Display", "Screen Size", /\b(\d{1,2}(?:\.\d+)?)\s*(?:inch|inches|["”])/i);
  }
  if (/\b(desk|table)\b/i.test(name)) {
    add("Dimensions", "Top Width", /\b(\d{2,3}(?:\.\d+)?)\s*(?:inch|inches|["”])/i);
  }
  add("Display", "Touchscreen", /\b(Touchscreen|Touch Screen)\b/i);
  add("Processor", "Processor", /\b((?:Intel(?: Core)?|AMD Ryzen|Apple M\d|Snapdragon)[^,–-]{2,45})/i);
  add("Memory", "RAM", /\b(\d+\s*GB(?:\s+(?:(?:DDR\d|LPDDR\w*)(?:\s+(?:RAM|Memory))?|RAM|Memory)))\b/i);
  add("Storage", "Storage", /\b(\d+(?:\.\d+)?\s*(?:TB|GB)\s*(?:PCIe\s+|NVMe\s+)?(?:SSD|eMMC|Storage))\b/i);
  add("Software", "Operating System", /\b(Windows\s+(?:10|11)(?:\s+(?:Home|Pro|S Mode))?|ChromeOS|macOS)\b/i);
  return specs;
}

function walk(value, visit, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  visit(value);
  for (const child of Object.values(value)) walk(child, visit, seen);
}

function queryFromUrl(value) {
  try {
    const url = new URL(value, BASE_URL);
    if (!/(^|\.)bestbuy\.com$/i.test(url.hostname)) return null;
    return clean(url.searchParams.get("st") || url.searchParams.get("search") || url.searchParams.get("query") || url.searchParams.get("q"));
  } catch {
    return null;
  }
}

function queryFromFilename(filename) {
  const value = clean(String(filename || "")
    .replace(/\.html?$/i, "")
    .replace(/\s*[-_|]\s*Best Buy(?: US|USA|United States)?(?:\s*[-_|].*)?$/i, ""));
  return value && !/^(best buy|search|search results|best buy canada)$/i.test(value) ? value : null;
}

export function detectSearchQuery(html, filename = "") {
  const $ = load(html);
  const urlCandidates = [
    $('link[rel="canonical"]').attr("href"),
    $('meta[property="og:url"]').attr("content"),
    $('meta[name="twitter:url"]').attr("content"),
  ];
  for (const value of urlCandidates) {
    const query = queryFromUrl(value);
    if (query) return query;
  }

  const searchInput = clean($('input[type="search"][value], input[name="search"][value], input[name="query"][value], input[name="q"][value]').first().attr("value"));
  if (searchInput) return searchInput;

  let detected = null;
  $("script").each((_index, script) => {
    if (detected) return false;
    const source = $(script).text().trim();
    if (!source || (!source.startsWith("{") && !source.startsWith("["))) return;
    try {
      walk(JSON.parse(source), (item) => {
        if (detected) return;
        for (const key of ["searchQuery", "searchTerm", "query"]) {
          if (typeof item[key] === "string" && clean(item[key])) detected = clean(item[key]);
        }
        for (const key of ["url", "canonicalUrl", "searchUrl"]) {
          if (!detected && typeof item[key] === "string") detected = queryFromUrl(item[key]);
        }
      });
    } catch { /* Non-JSON scripts are expected. */ }
  });
  if (detected) return detected;

  const encodedUrlMatch = String(html).match(/(?:[?&]|\\u0026|&amp;)(?:search|query|q)=([^&\"'<>\\]+)/i);
  if (encodedUrlMatch) {
    try {
      const query = clean(decodeURIComponent(encodedUrlMatch[1].replace(/\+/g, " ")));
      if (query) return query;
    } catch { /* Ignore malformed encoded URLs. */ }
  }

  const title = clean($("title").text());
  const titleMatch = title?.match(/(?:search results (?:for|:)\s*[“\"']?)(.+?)[”\"']?(?:\s*[-|]\s*Best Buy US)?$/i);
  if (clean(titleMatch?.[1])) return clean(titleMatch[1]);

  const pageTitle = clean(title?.replace(/\s*[-|]\s*Best Buy US\s*$/i, ""));
  if (pageTitle && !/^(best buy|best buy canada|search|search results)$/i.test(pageTitle)) return pageTitle;
  return queryFromFilename(filename);
}

function embeddedProducts($) {
  const found = [];
  $("script").each((_index, script) => {
    const source = $(script).text().trim();
    if (!source || (!source.startsWith("{") && !source.startsWith("["))) return;
    try {
      walk(JSON.parse(source), (item) => {
        const href = item.productUrl || item.url;
        const url = canonicalUrl(href);
        const name = clean(item.name || item.title);
        const price = priceToNumber(item.salePrice ?? item.currentPrice ?? item.price);
        if (url && name && !/^colou?r\s*:/i.test(name) && price != null) {
          const specs = Array.isArray(item.specs) ? item.specs : titleSpecifications(name);
          found.push({
          sku: String(item.sku || skuFromUrl(url)), name, url, price, currency: "USD",
          imageUrl: imageUrl(item.imageUrl || item.image || item.thumbnailUrl),
          ...productIdentifiers(name, item, specs), specifications: specs,
        });
        }
      });
    } catch { /* Non-JSON scripts are expected. */ }
  });
  return found;
}

function rscProducts(html) {
  const found = [];
  const seen = new Set();

  const $ = load(html);
  $("script").each((_index, script) => {
    const source = $(script).text().trim();
    const pushIndex = source.indexOf(".push(");
    if (pushIndex < 0) return;

    const objectStart = source.indexOf("{", pushIndex);
    const argumentEnd = source.lastIndexOf(")");
    if (objectStart < 0 || argumentEnd <= objectStart) return;

    try {
      // Apollo's serialized cache occasionally contains JavaScript `undefined`,
      // which is safe to treat as null before decoding the otherwise-JSON data.
      const payload = JSON.parse(
        source.slice(objectStart, argumentEnd).replace(/\bundefined\b/g, "null"),
      );
      walk(payload, (item) => {
        if (item?.["@type"] !== "Product" && item?.__typename !== "Product") return;
        const url = canonicalUrl(item.url?.skuSpecificUrl || item.skuSpecificUrl);
        const sku = String(item.skuId || skuFromUrl(url || "") || "");
        const name = clean(item.name?.short || item.name?.title || item.name);
        const price = priceToNumber(
          item.price?.customerPrice ??
          item.price?.displayableCustomerPrice ??
          item.price?.currentPrice ??
          item.customerPrice,
        );
        if (!url || !sku || !name || price == null || seen.has(sku)) return;
        // When provided, this guards against using a nested accessory/offer price.
        if (item.price?.skuId && String(item.price.skuId) !== sku) return;
        seen.add(sku);
        found.push({
          sku,
          name,
          url,
          imageUrl: imageUrl(item.image?.url || item.imageUrl || item.thumbnailUrl),
          ...productIdentifiers(name, item),
          price,
          currency: "USD",
          specifications: titleSpecifications(name),
        });
      });
    } catch {
      // Other push() scripts contain executable JavaScript rather than JSON.
    }
  });

  if (found.length) return found;

  // Compatibility fallback for older saved pages that expose RSC fragments but
  // not a decodable Apollo product payload.
  const urlPattern = /"skuSpecificUrl":"([^"]+\/sku\/(\d{5,10}))"/g;
  for (const match of html.matchAll(urlPattern)) {
    const url = canonicalUrl(match[1].replace(/\\u0026/g, "&"));
    if (!url || seen.has(match[2])) continue;
    const before = html.slice(Math.max(0, match.index - 10_000), match.index);
    const after = html.slice(match.index, match.index + 4_000);
    const names = [...after.matchAll(/"(?:short|title)":"([^"\\]*(?:\\.[^"\\]*)*)"/g)];
    const prices = [...before.matchAll(/"(?:customerPrice|currentPrice|regularPrice)":([0-9]+(?:\.[0-9]+)?)/g)];
    const name = clean(names[0]?.[1]?.replace(/\\u0026/g, "&").replace(/\\"/g, '"'));
    const price = priceToNumber(prices.at(-1)?.[1]);
    if (!name || price == null) continue;
    seen.add(match[2]);
    found.push({ sku: match[2], name, url, price, currency: "USD", imageUrl: null, specifications: titleSpecifications(name) });
  }
  return found;
}

export function parseProducts(html, limit = Number.POSITIVE_INFINITY) {
  const $ = load(html);
  const products = [];
  const seen = new Set();
  const add = (product) => {
    if (products.length >= limit || !product.url || seen.has(product.url)) return;
    seen.add(product.url);
    products.push(product);
  };

  embeddedProducts($).forEach(add);
  rscProducts(html).forEach(add);
  $('a[href*="/product/"][href*="/sku/"], a[href*="/site/"][href*=".p"]').each((_index, element) => {
    if (products.length >= limit) return false;
    const anchor = $(element);
    const url = canonicalUrl(anchor.attr("href"));
    if (!url || seen.has(url)) return;
    const card = anchor.closest('li, article, [data-automation*="product"], [class*="productItem"], [class*="product"]');
    const name = clean(anchor.attr("aria-label") || anchor.text()) || clean(card.find("h2,h3").first().text());
    const cardText = clean(card.text());
    const priceText = clean(card.find('[data-automation*="price"], [class*="price"]').first().text()) || cardText;
    const priceMatch = priceText?.match(/(?:sale price|current price|now)?\s*\$\s*([\d,]+(?:\.\d{2})?)/i);
    const price = priceToNumber(priceMatch?.[1]);
    if (!name || name.length < 8 || /^colou?r\s*:|^(?:size|style|option)\s*:/i.test(name) || price == null) return;
    const image = card.find("img").first();
    add({ sku: skuFromUrl(url), name, url, price, currency: "USD", imageUrl: imageUrl(image.attr("src") || image.attr("data-src")), ...productIdentifiers(name), specifications: titleSpecifications(name) });
  });
  return products;
}

export async function saveProducts(products, searchQuery = process.env.SEARCH_QUERY || "HTML upload") {
  if (!products.length) throw new Error("No products with URLs and prices were found");
  const pool = createPool(process.env.DATABASE_URL);
  const searchUrl = `${BASE_URL}/site/searchpage.jsp?st=${encodeURIComponent(searchQuery)}`;
  try {
    await ensureSchema(pool);
    for (let index = 0; index < products.length; index += 1) {
      await saveProduct(pool, { ...products[index], position: index + 1, searchQuery, searchUrl });
    }
  } finally {
    await pool.end();
  }
  return products;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error('Usage: npm run import-html -- "/path/to/bestbuy-search.html" "search query"');
  const html = await readFile(file, "utf8");
  const searchQuery = process.argv.slice(3).join(" ") || detectSearchQuery(html, file) || process.env.SEARCH_QUERY || "HTML upload";
  const products = parseProducts(html);
  await saveProducts(products, searchQuery);
  console.log(`Imported ${products.length} products into bestbuy_products.`);
}

if (process.argv[1]?.endsWith("import-html.js")) {
  main().catch((error) => {
    console.error(`Import failed: ${error.message}`);
    process.exitCode = 1;
  });
}
