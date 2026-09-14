import "./env.js";
import express from "express";
import multer from "multer";
import { parseProducts } from "./parser.js";
import { saveProducts } from "./database.js";
import { searchNewegg } from "./live-search.js";

const app = express();
const port = Number.parseInt(process.env.PORT || "4006", 10);
const limit = Math.min(
  100,
  Math.max(1, Number.parseInt(process.env.MAX_ITEMS || "15", 10)),
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});
app.use(express.static("public"));
app.use(express.json({ limit: "20kb" }));

function parseUpload(request) {
  if (!request.file) throw new Error("Select a Newegg HTML file");
  return parseProducts(request.file.buffer.toString("utf8"), {
    searchTerm: process.env.SEARCH_TERM,
    limit,
  });
}

app.post("/api/preview", upload.single("htmlFile"), (request, response) => {
  try {
    const products = parseUpload(request);
    response.json({
      products,
      count: products.length,
      expected: limit,
      searchTerm: products[0]?.searchTerm || null,
    });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});
app.post(
  "/api/import",
  upload.single("htmlFile"),
  async (request, response) => {
    try {
      const products = parseUpload(request);
      await saveProducts(products, limit);
      response.json({
        products,
        count: products.length,
        searchTerm: products[0]?.searchTerm,
        message: `Imported ${products.length} Newegg products`,
      });
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  },
);
app.post("/api/live-search", async (request, response) => {
  try {
    const searchTerm = String(request.body?.searchTerm || "").trim();
    const startPage = Number.parseInt(request.body?.startPage ?? "1", 10);
    const pages = Number.parseInt(request.body?.pages ?? "1", 10);
    const shouldImport = request.body?.import === true;
    const products = await searchNewegg(searchTerm, limit, startPage, pages);
    if (shouldImport) await saveProducts(products, 1);
    const endPage = startPage + pages - 1;
    const pageRange =
      pages === 1 ? `page ${startPage}` : `pages ${startPage}-${endPage}`;
    response.json({
      products,
      count: products.length,
      expected: null,
      searchTerm,
      startPage,
      pages,
      imported: shouldImport,
      message: shouldImport
        ? `Imported ${products.length} live Newegg products from ${pageRange}`
        : `Found ${products.length} live Newegg products from ${pageRange}`,
    });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});
app.use((error, _request, response, _next) =>
  response.status(400).json({ error: error.message }),
);
app.listen(port, "127.0.0.1", () =>
  console.log(`Newegg US Search UI: http://127.0.0.1:${port}`),
);
