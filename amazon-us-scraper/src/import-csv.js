import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { buildSearchUrl, getConfig } from "./amazon.js";
import { saveSearchResults } from "./database.js";

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  if (quoted) throw new Error("CSV ends inside a quoted field");
  return rows;
}

function optionalNumber(value, label, rowNumber) {
  if (value == null || value.trim() === "") return null;
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`Invalid ${label} on CSV row ${rowNumber}`);
  return number;
}

function booleanValue(value) {
  return String(value).trim().toLowerCase() === "true";
}

export async function readAmazonCsv(filePath) {
  const rows = parseCsv(await fs.readFile(filePath, "utf8"));
  if (rows.length < 2) throw new Error("CSV does not contain any product rows");
  const headers = rows[0].map((header) => header.trim());
  const required = ["asin", "title", "affiliateUrl"];
  for (const header of required) {
    if (!headers.includes(header)) throw new Error(`CSV is missing required column: ${header}`);
  }

  const products = new Map();
  for (const [index, values] of rows.slice(1).entries()) {
    if (values.every((value) => !value.trim())) continue;
    const record = Object.fromEntries(headers.map((header, column) => [header, values[column] ?? ""]));
    const rowNumber = index + 2;
    if (!/^[A-Z0-9]{10}$/.test(record.asin)) throw new Error(`Invalid ASIN on CSV row ${rowNumber}`);
    if (!record.title.trim()) throw new Error(`Missing title on CSV row ${rowNumber}`);
    let affiliateUrl;
    try {
      affiliateUrl = new URL(record.affiliateUrl);
    } catch {
      throw new Error(`Invalid affiliate URL on CSV row ${rowNumber}`);
    }
    if (!/(^|\.)amazon\.com$/.test(affiliateUrl.hostname)) {
      throw new Error(`Non-Amazon.com affiliate URL on CSV row ${rowNumber}`);
    }

    products.set(record.asin, {
      asin: record.asin,
      title: record.title.trim(),
      price: optionalNumber(record.price, "price", rowNumber),
      currency: record.currency.trim() || "USD",
      rating: optionalNumber(record.rating, "rating", rowNumber),
      reviewCount: optionalNumber(record.reviewCount, "review count", rowNumber),
      prime: booleanValue(record.prime),
      sponsored: booleanValue(record.sponsored),
      imageUrl: record.imageUrl.trim() || null,
      modelNumber: (record.modelNumber || record.model_number || "").trim() || null,
      mpn: (record.mpn || "").trim() || null,
      upc: (record.upc || "").replace(/\D/g, "").length === 12
        ? (record.upc || "").replace(/\D/g, "")
        : null,
      affiliateUrl: affiliateUrl.toString(),
      condition: ["new", "used", "both"].includes(record.condition?.toLowerCase())
        ? record.condition.toLowerCase()
        : "both",
    });
  }
  return [...products.values()];
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: npm run import-csv -- "/path/to/amazon-results.csv" [search term]');
  process.exit(1);
}

try {
  const absolutePath = path.resolve(filePath);
  const products = await readAmazonCsv(absolutePath);
  const config = getConfig();
  const searchTerm = process.argv.slice(3).join(" ").trim()
    || path.basename(absolutePath, path.extname(absolutePath)).replace(/[-_]+/g, " ");
  const result = {
    products,
    searchTerm,
    searchUrl: buildSearchUrl(searchTerm, config.affiliateTag),
    affiliateTag: config.affiliateTag,
    condition: "both",
  };
  const savedCount = await saveSearchResults(result);
  console.log(`Imported ${savedCount} unique products into amazon_us_products.`);
} catch (error) {
  console.error(`Import failed: ${error.message}`);
  process.exitCode = 1;
}
