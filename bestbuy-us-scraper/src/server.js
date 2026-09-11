import "dotenv/config";
import express from "express";
import multer from "multer";
import { detectSearchQuery, parseProducts, saveProducts } from "./import-html.js";

const app = express();
const port = Number.parseInt(process.env.PORT || "4002", 10);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const accepted = /\.html?$/i.test(file.originalname) || file.mimetype === "text/html";
    callback(accepted ? null : new Error("Please select an HTML file"), accepted);
  },
});

app.use(express.static("public"));

app.post("/api/preview", upload.single("htmlFile"), (request, response) => {
  try {
    if (!request.file) throw new Error("Select a Best Buy HTML file");
    const html = request.file.buffer.toString("utf8");
    const products = parseProducts(html);
    response.json({ products, count: products.length, searchQuery: detectSearchQuery(html, request.file.originalname) });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.post("/api/import", upload.single("htmlFile"), async (request, response) => {
  try {
    if (!request.file) throw new Error("Select a Best Buy HTML file");
    const html = request.file.buffer.toString("utf8");
    const query = String(request.body.searchQuery || "").trim() || detectSearchQuery(html, request.file.originalname);
    if (!query) throw new Error("Search query could not be detected; enter it manually");
    const products = parseProducts(html);
    await saveProducts(products, query);
    response.json({ message: `Imported ${products.length} products`, products });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.use((error, _request, response, _next) => response.status(400).json({ error: error.message }));

export const server = app.listen(port, "127.0.0.1", () => {
  console.log(`Best Buy US HTML Importer: http://127.0.0.1:${port}`);
});
server.on("error", (error) => {
  if (error.code === "EADDRINUSE") console.error(`Port ${port} is already in use. Set another PORT in .env.`);
  else console.error(`UI server failed: ${error.message}`);
  process.exitCode = 1;
});

export { app };
