import "dotenv/config";
import { searchAmazon } from "./amazon.js";
import { saveSearchResults } from "./database.js";

const searchTerm = process.argv.slice(2).join(" ").trim();
if (!searchTerm) {
  console.error('Usage: npm run scrape -- "search term"');
  process.exit(1);
}

try {
  const result = await searchAmazon(searchTerm, {}, (message) => console.log(message));
  const savedCount = await saveSearchResults(result);
  console.log(JSON.stringify({ ...result, savedCount }, null, 2));
} catch (error) {
  console.error(`Search failed: ${error.message}`);
  process.exitCode = 1;
}
