import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Prefer this app's own .env. Reuse the existing US database configuration
// when Newegg has not been given a separate environment file yet.
dotenv.config();
if (!process.env.DATABASE_URL) {
  try {
    const sharedPath = fileURLToPath(new URL("../../walmart-us-scraper/.env", import.meta.url));
    const shared = dotenv.parse(readFileSync(sharedPath));
    if (shared.DATABASE_URL) process.env.DATABASE_URL = shared.DATABASE_URL;
    if (shared.DATABASE_SSL && process.env.DATABASE_SSL == null) {
      process.env.DATABASE_SSL = shared.DATABASE_SSL;
    }
  } catch {
    // database.js reports a clear error if neither environment file is usable.
  }
}
