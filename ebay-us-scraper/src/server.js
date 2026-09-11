import "dotenv/config";
import express from "express";
import multer from "multer";
import { parsePage, saveProducts } from "./import-html.js";

const app = express();
const port = Number.parseInt(process.env.PORT || "4001", 10);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const accepted = /\.html?$/i.test(file.originalname) || file.mimetype === "text/html";
    callback(accepted ? null : new Error("Please select an HTML file"), accepted);
  },
});

app.use(express.static("public"));

function parseUpload(request) {
  if (!request.file) throw new Error("Select an eBay HTML file");
  return parsePage(request.file.buffer.toString("utf8"), { searchTerm: request.body.searchTerm });
}

app.post("/api/preview", upload.single("htmlFile"), (request, response) => {
  try {
    const page = parseUpload(request);
    response.json({ ...page, count: page.products.length });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.post("/api/import", upload.single("htmlFile"), async (request, response) => {
  try {
    const page = parseUpload(request);
    await saveProducts(page.products, page.searchTerm);
    response.json({ message: `Imported ${page.products.length} products`, ...page });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.use((error, _request, response, _next) => response.status(400).json({ error: error.message }));
app.listen(port, "127.0.0.1", () => console.log(`eBay US HTML Importer: http://127.0.0.1:${port}`));
