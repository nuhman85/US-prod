import "dotenv/config";
import express from "express";
import { searchAmazon } from "./amazon.js";
import { saveSearchResults } from "./database.js";

const app = express();
const port = Number.parseInt(process.env.PORT || "4003", 10);
let activeSearch = false;

app.use(express.json());
app.use(express.static("public"));

app.post("/api/search", async (request, response) => {
  if (activeSearch)
    return response
      .status(409)
      .json({ error: "Another search is currently running" });
  activeSearch = true;
  try {
    const { searchTerm, maxPages, maxItems, condition } = request.body || {};
    const result = await searchAmazon(searchTerm, { maxPages, maxItems, condition });
    const savedCount = await saveSearchResults(result);
    response.json({ ...result, savedCount });
  } catch (error) {
    response.status(400).json({ error: error.message });
  } finally {
    activeSearch = false;
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Amazon US Affiliate Search: http://127.0.0.1:${port}`);
});
