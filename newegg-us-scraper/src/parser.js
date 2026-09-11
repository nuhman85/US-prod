import { load } from "cheerio";

const clean = (value) => value?.replace(/\s+/g, " ").trim() || null;
const imageUrl = (value) => {
  const candidate = clean(value);
  return /^https?:\/\//i.test(candidate || "") ? candidate : null;
};

export function buildSearchUrl(term, { page = 1, pageSize = null } = {}) {
  const url = new URL("https://www.newegg.com/p/pl");
  url.searchParams.set("d", clean(term) || "");
  if (page > 1) url.searchParams.set("page", String(page));
  if (pageSize) url.searchParams.set("PageSize", String(pageSize));
  return url.toString();
}

export function canonicalUrl(href) {
  try {
    const url = new URL(href, "https://www.newegg.com");
    if (!/(^|\.)newegg\.com$/i.test(url.hostname)) return null;
    if (!/\/p\//i.test(url.pathname)) return null;
    url.protocol = "https:";
    url.hostname = "www.newegg.com";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function parsePrice(value) {
  const text = clean(value);
  if (!text) return null;
  const match = text.replace(/,/g, "").match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  const amount = match ? Number(match[1]) : null;
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function productId(url, fallback) {
  const match = url?.match(/\/p\/([^/?#]+)/i);
  return clean(fallback) || match?.[1] || null;
}

function specifications(name) {
  const specs = { source_title: name };
  const add = (key, regex) => {
    const match = name.match(regex);
    if (match) specs[key] = clean(match[1]);
  };
  add("processor", /\b((?:Intel\s+)?(?:Core\s+Ultra\s+)?(?:i[3579]|Ryzen\s+[3579])[- ]?[A-Z0-9-]*)\b/i);
  add("memory", /\b(\d+\s*GB\s*(?:DDR\d\s*)?(?:RAM|Memory)?)\b/i);
  add("storage", /\b(\d+(?:\.\d+)?\s*(?:TB|GB)\s*(?:NVMe\s+|PCIe\s+)?(?:SSD|HDD|eMMC))\b/i);
  add("screen_size", /\b(\d{2}(?:\.\d+)?)\s*(?:inch|inches|["”'])/i);
  add("graphics", /\b((?:GeForce\s+RTX|Radeon\s+RX|Intel\s+Arc)\s*[A-Z0-9-]+)\b/i);
  return specs;
}

function productIdentifiers(name, value = {}) {
  const source = clean(name) || "";
  const labeled = (label) => source.match(new RegExp(`\\b${label}\\s*[:#-]?\\s*([A-Z0-9][A-Z0-9._/-]{3,})`, "i"))?.[1] || null;
  const upcCandidate = clean(value.upc || value.gtin12) || labeled("UPC");
  const upc = upcCandidate?.replace(/\D/g, "");
  return {
    modelNumber: clean(value.modelNumber || value.model) || labeled("(?:model number|model)"),
    mpn: clean(value.mpn || value.manufacturerPartNumber) || labeled("MPN"),
    upc: upc?.length === 12 ? upc : null,
  };
}

export function detectSearchTerm(html, fallback = null) {
  const $ = load(html);
  const candidates = [
    $('input[name="d"]').attr("value"),
    $("title").text().match(/Search Results:\s*(.+?)(?:\s*-\s*Newegg|$)/i)?.[1],
    $("title").text().match(/^(.+?)\s*-\s*Newegg\.com/i)?.[1],
    fallback,
  ];
  return clean(candidates.find((value) => clean(value))) || null;
}

export function parseProducts(html, { searchTerm: fallbackTerm = null, limit = 15 } = {}) {
  const $ = load(html);
  const searchTerm = detectSearchTerm(html, fallbackTerm);
  if (!searchTerm) throw new Error("Could not detect the Newegg search term; provide SEARCH_TERM as a fallback");
  const searchUrl = buildSearchUrl(searchTerm);
  const products = [];
  const seen = new Set();

  $(".item-cell, .item-container, [data-testid='product-card']").each((_index, element) => {
    if (products.length >= limit) return false;
    const card = $(element);
    let titleLink = card.find("a.item-title").filter((_i, link) => clean($(link).text())?.length > 8).first();
    if (!titleLink.length) {
      titleLink = card.find("a[href*='/p/']").filter((_i, link) => {
        const text = clean($(link).text());
        return text?.length > 12 && !/^(quick view|view details|compare)$/i.test(text);
      }).first();
    }
    const url = canonicalUrl(titleLink.attr("href"));
    const name = clean(titleLink.text()) || clean(card.find(".item-title").first().text());
    const priceElement = card.find(".price-current, [data-testid='product-price'], [itemprop='price']").first();
    const price = parsePrice(priceElement.attr("content")) || parsePrice(priceElement.attr("aria-label")) || parsePrice(priceElement.text());
    if (!url || !name || !price || seen.has(url)) return;
    seen.add(url);
    const seller = clean(card.find(".item-seller, .item-sold, [class*='seller']").first().text());
    const image = card.find("img").filter((_i, node) => clean($(node).attr("src") || $(node).attr("data-src"))).first();
    products.push({
      url,
      name,
      imageUrl: imageUrl(image.attr("src") || image.attr("data-src")),
      price,
      currency: "USD",
      sku: productId(url, card.attr("data-item-number") || card.attr("data-item-id")),
      brand: clean(card.find(".item-brand img").attr("title") || card.find(".item-brand img").attr("alt")),
      availability: /out of stock|sold out/i.test(card.text()) ? "OUT_OF_STOCK" : "IN_STOCK",
      seller,
      ...productIdentifiers(name, {
        modelNumber: card.attr("data-model-number") || card.attr("data-model"),
        mpn: card.attr("data-mpn"),
        upc: card.attr("data-upc"),
      }),
      specifications: specifications(name),
      searchTerm,
      searchUrl,
    });
  });

  if (products.length < limit) {
    $("script[type='application/ld+json']").each((_index, element) => {
      if (products.length >= limit) return false;
      try {
        const parsed = JSON.parse($(element).text());
        const nodes = Array.isArray(parsed) ? parsed : parsed?.itemListElement || [parsed];
        for (const node of nodes) {
          const value = node?.item || node;
          if (value?.["@type"] !== "Product") continue;
          const url = canonicalUrl(value.url);
          const offer = Array.isArray(value.offers) ? value.offers[0] : value.offers;
          const price = Number(offer?.price || offer?.lowPrice);
          const name = clean(value.name);
          if (!url || !name || !Number.isFinite(price) || price <= 0 || seen.has(url)) continue;
          seen.add(url);
          products.push({
            url, name, imageUrl: imageUrl(Array.isArray(value.image) ? value.image[0] : value.image), price, currency: offer?.priceCurrency || "USD",
            sku: productId(url, value.sku), brand: clean(value.brand?.name || value.brand),
            availability: clean(offer?.availability?.split("/").pop()), seller: clean(offer?.seller?.name),
            ...productIdentifiers(name, value),
            specifications: specifications(name), searchTerm, searchUrl,
          });
          if (products.length >= limit) break;
        }
      } catch { /* Ignore malformed structured data. */ }
    });
  }
  return products.slice(0, limit);
}
