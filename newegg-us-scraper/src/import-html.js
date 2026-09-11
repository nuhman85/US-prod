import "./env.js";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { parseProducts } from "./parser.js";
import { saveProducts } from "./database.js";

const file = process.argv[2];
const limit = Math.min(100, Math.max(1, Number.parseInt(process.env.MAX_ITEMS || "15", 10)));

export async function importHtml(path) {
  const products = parseProducts(await readFile(path, "utf8"), { searchTerm: process.env.SEARCH_TERM, limit });
  return saveProducts(products, limit);
}

if (file && process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  importHtml(file).then((products) => console.log(`Imported ${products.length} Newegg products.`))
    .catch((error) => { console.error(`Import failed: ${error.message}`); process.exitCode = 1; });
}
