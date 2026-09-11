import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const AMAZON_ORIGIN = "https://www.amazon.com";
const CONDITION_IDS = {
  new: "7156127011",
  used: "7156128011",
};

function normalizeCondition(value) {
  const condition = String(value || "both").toLowerCase();
  if (!["new", "used", "both"].includes(condition)) {
    throw new Error("Condition must be new, used, or both");
  }
  return condition;
}

function positiveInteger(value, fallback, allowZero = false) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isInteger(parsed) && (allowZero ? parsed >= 0 : parsed > 0)
    ? parsed
    : fallback;
}

export function getConfig(overrides = {}) {
  return {
    affiliateTag: overrides.affiliateTag || process.env.AFFILIATE_TAG || "compareallsto-20",
    headless: overrides.headless ?? process.env.HEADLESS === "true",
    maxPages: positiveInteger(overrides.maxPages ?? process.env.MAX_PAGES, 10),
    maxItems: positiveInteger(overrides.maxItems ?? process.env.MAX_ITEMS, 0, true),
    condition: normalizeCondition(overrides.condition ?? process.env.CONDITION),
    browserChannel: overrides.browserChannel ?? (process.env.BROWSER_CHANNEL || undefined),
    profileDir: path.resolve(ROOT, process.env.PROFILE_DIR || ".amazon-browser-profile"),
    deliveryZip: overrides.deliveryZip || process.env.DELIVERY_ZIP || "10001",
  };
}

export function buildSearchUrl(searchTerm, affiliateTag, page = 1, condition = "both") {
  const url = new URL("/s", AMAZON_ORIGIN);
  url.searchParams.set("k", searchTerm.trim());
  url.searchParams.set("tag", affiliateTag);
  const conditionId = CONDITION_IDS[normalizeCondition(condition)];
  if (conditionId) url.searchParams.set("rh", `p_n_condition-type:${conditionId}`);
  if (page > 1) url.searchParams.set("page", String(page));
  return url.toString();
}

export function buildAffiliateUrl(asin, affiliateTag) {
  const url = new URL(`/dp/${asin}`, AMAZON_ORIGIN);
  url.searchParams.set("tag", affiliateTag);
  return url.toString();
}

async function isChallenge(page) {
  return page.evaluate(() => {
    const text = document.body?.innerText?.toLowerCase() || "";
    return /enter the characters you see below|type the characters you see|sorry, we just need to make sure you're not a robot/.test(text);
  });
}

async function waitForChallenge(page, headless) {
  if (!await isChallenge(page)) return;
  if (headless) {
    throw new Error("Amazon requested human verification. Run with HEADLESS=false and complete it in the browser.");
  }

  console.log("Amazon verification is open. Complete it in the browser to continue.");
  const deadline = Date.now() + 10 * 60_000;
  while (Date.now() < deadline) {
    await page.waitForTimeout(2_000);
    if (!await isChallenge(page)) return;
  }
  throw new Error("Amazon verification was not completed within 10 minutes");
}

async function setUsDeliveryLocation(page, deliveryZip, headless) {
  await page.goto(`${AMAZON_ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await waitForChallenge(page, headless);

  const result = await page.evaluate(async (zipCode) => {
    const body = new URLSearchParams({
      locationType: "LOCATION_INPUT",
      zipCode,
      storeContext: "generic",
      deviceType: "web",
      pageType: "Gateway",
      actionSource: "glow",
    });
    const response = await fetch("/gp/delivery/ajax/address-change.html", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json, text/javascript, */*; q=0.01",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: body.toString(),
    });
    return { ok: response.ok, status: response.status };
  }, deliveryZip);

  if (!result.ok) {
    throw new Error(`Amazon could not set US delivery ZIP ${deliveryZip} (HTTP ${result.status})`);
  }
  await page.reload({ waitUntil: "domcontentloaded", timeout: 90_000 });
}

async function extractPage(page, affiliateTag) {
  const rawProducts = await page.locator('[data-component-type="s-search-result"][data-asin]').evaluateAll((cards) =>
    cards.map((card) => {
      const clean = (value) => value?.replace(/\s+/g, " ").trim() || null;
      const text = (selector) => clean(card.querySelector(selector)?.textContent);
      const attribute = (selector, name) => card.querySelector(selector)?.getAttribute(name) || null;
      const productLinkCandidates = [...card.querySelectorAll('a[href*="/dp/"]')]
        .flatMap((link) => [clean(link.textContent), clean(link.getAttribute("aria-label"))])
        .filter((value) => value && value.length > 3 && !/^\$?[\d,.]+$/.test(value));
      const productDescription = productLinkCandidates.sort((left, right) => right.length - left.length)[0]
        || text('[data-cy="title-recipe"]');
      const brandHeading = text("h2");
      const fullTitle = productDescription && brandHeading
        && !productDescription.toLowerCase().includes(brandHeading.toLowerCase())
        ? `${brandHeading} ${productDescription}`
        : productDescription || brandHeading;
      const whole = text(".a-price .a-price-whole");
      const fraction = text(".a-price .a-price-fraction");
      const priceText = text(".a-price .a-offscreen");
      const priceMatch = priceText?.replace(/,/g, "").match(/\d+(?:\.\d{1,2})?/);
      const parsedPrice = priceMatch
        ? Number(priceMatch[0])
        : whole ? Number(`${whole.replace(/[^\d]/g, "")}.${(fraction || "00").replace(/\D/g, "")}`) : null;
      const ratingText = attribute("i.a-icon-star-small span.a-icon-alt, i.a-icon-star span.a-icon-alt", "textContent")
        || text("i.a-icon-star-small span.a-icon-alt, i.a-icon-star span.a-icon-alt");
      const ratingMatch = ratingText?.match(/\d+(?:\.\d+)?/);
      const reviewsText = text('a[href*="#customerReviews"] span, a[href*="customerReviews"] span');
      const identifier = (label, digitsOnly = false) => {
        const match = fullTitle?.match(new RegExp(`\\b${label}\\s*[:#-]?\\s*([A-Z0-9][A-Z0-9._/-]{3,})`, "i"));
        const value = match?.[1] || null;
        return digitsOnly ? (value?.replace(/\D/g, "").length === 12 ? value.replace(/\D/g, "") : null) : value;
      };

      return {
        asin: card.getAttribute("data-asin")?.trim() || null,
        title: fullTitle,
        price: Number.isFinite(parsedPrice) ? parsedPrice : null,
        currency: "USD",
        rating: ratingMatch ? Number(ratingMatch[0]) : null,
        reviewCount: reviewsText ? Number(reviewsText.replace(/\D/g, "")) || null : null,
        imageUrl: attribute("img.s-image", "src"),
        modelNumber: identifier("(?:model number|model)"),
        mpn: identifier("MPN"),
        upc: identifier("UPC", true),
        prime: Boolean(card.querySelector("i.a-icon-prime")),
        sponsored: /sponsored/i.test(text('[data-component-type="s-sponsored-label-marker"]') || ""),
      };
    }),
  );

  return rawProducts
    .filter((product) => /^[A-Z0-9]{10}$/.test(product.asin || "") && product.title)
    .map((product) => ({
      ...product,
      affiliateUrl: buildAffiliateUrl(product.asin, affiliateTag),
    }));
}

export async function searchAmazon(searchTerm, overrides = {}, onProgress = () => {}) {
  if (typeof searchTerm !== "string" || !searchTerm.trim()) throw new Error("A search term is required");
  const config = getConfig(overrides);
  const context = await chromium.launchPersistentContext(config.profileDir, {
    headless: config.headless,
    channel: config.browserChannel,
    viewport: { width: 1440, height: 1000 },
    locale: "en-US",
  });

  try {
    const page = context.pages()[0] || await context.newPage();
    onProgress(`Setting Amazon.com delivery location to ZIP ${config.deliveryZip}…`);
    await setUsDeliveryLocation(page, config.deliveryZip, config.headless);
    const productsByAsin = new Map();
    let pagesScraped = 0;

    for (let pageNumber = 1; pageNumber <= config.maxPages; pageNumber += 1) {
      const searchUrl = buildSearchUrl(searchTerm, config.affiliateTag, pageNumber, config.condition);
      onProgress(`Searching Amazon.com page ${pageNumber}…`);
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await waitForChallenge(page, config.headless);
      await page.waitForSelector('[data-component-type="s-search-result"], .s-no-outline', { timeout: 30_000 }).catch(() => {});
      await page.mouse.wheel(0, 1800);
      await page.waitForTimeout(800);

      const products = await extractPage(page, config.affiliateTag);
      if (products.length === 0) {
        if (pageNumber === 1) throw new Error("No Amazon.com product listings were found for this search");
        break;
      }
      for (const product of products) {
        if (!productsByAsin.has(product.asin)) productsByAsin.set(product.asin, product);
        if (config.maxItems && productsByAsin.size >= config.maxItems) break;
      }
      pagesScraped = pageNumber;
      onProgress(`Found ${productsByAsin.size} unique products…`);

      if (config.maxItems && productsByAsin.size >= config.maxItems) break;
      const hasNext = await page.locator("a.s-pagination-next:not(.s-pagination-disabled)").count();
      if (!hasNext) break;
      await page.waitForTimeout(750 + Math.floor(Math.random() * 750));
    }

    const products = [...productsByAsin.values()];
    for (const product of products) product.condition = config.condition;
    if (config.maxItems) products.splice(config.maxItems);
    return {
      searchTerm: searchTerm.trim(),
      searchUrl: buildSearchUrl(searchTerm, config.affiliateTag, 1, config.condition),
      affiliateTag: config.affiliateTag,
      condition: config.condition,
      pagesScraped,
      count: products.length,
      products,
    };
  } finally {
    await context.close();
  }
}
