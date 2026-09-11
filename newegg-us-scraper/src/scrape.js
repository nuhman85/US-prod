import "./env.js";
import { saveProducts } from "./database.js";
import { searchNewegg } from "./live-search.js";

const termIndex = process.argv.findIndex((value) => value === "--term");
const searchTerm = (termIndex >= 0 ? process.argv[termIndex + 1] : process.argv.slice(2).join(" ")) || process.env.SEARCH_TERM;
const limit = Math.min(100, Math.max(1, Number.parseInt(process.env.MAX_ITEMS || "15", 10)));
if (!searchTerm) throw new Error('Provide a search term: npm run scrape -- --term "gaming laptop"');

const products = await searchNewegg(searchTerm, limit);
await saveProducts(products, limit);
console.table(products.map(({ sku, name, price }) => ({ sku, name: name.slice(0, 70), price })));
console.log(`Saved ${products.length} Newegg products.`);
