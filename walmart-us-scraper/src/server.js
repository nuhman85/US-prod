import "dotenv/config";
import express from "express";
import multer from "multer";
import { parseProducts, saveProducts } from "./import-html.js";

const app = express();
const port = Number.parseInt(process.env.PORT || "4004", 10);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const accepted =
      /\.html?$/i.test(file.originalname) || file.mimetype === "text/html";
    callback(
      accepted ? null : new Error("Please select an HTML file"),
      accepted,
    );
  },
});

app.use(express.static("public"));

app.post("/api/preview", upload.single("htmlFile"), (request, response) => {
  try {
    if (!request.file) throw new Error("Select a Walmart HTML file");
    const products = parseProducts(request.file.buffer.toString("utf8"), {
      sourceName: request.file.originalname,
    });
    response.json({
      products,
      count: products.length,
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
      if (!request.file) throw new Error("Select a Walmart HTML file");
      const products = parseProducts(request.file.buffer.toString("utf8"), {
        sourceName: request.file.originalname,
      });
      await saveProducts(products);
      response.json({
        message: `Imported ${products.length} products for “${products[0]?.searchTerm}”`,
        products,
        searchTerm: products[0]?.searchTerm || null,
      });
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  },
);

app.use((error, _request, response, _next) => {
  response.status(400).json({ error: error.message });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Walmart HTML Importer: http://127.0.0.1:${port}`);
});
