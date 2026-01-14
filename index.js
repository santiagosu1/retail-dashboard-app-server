import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

// ✅ NO CACHE para la API (evita que el browser use respuestas viejas)
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ ruta hacia tu frontend (carpeta retail-dashboard-app)
// Ajuste: server está en retail-dashboard-app-server, por eso usamos ../
const CLIENT_DIR = path.join(__dirname, "..", "retail-dashboard-app");

// ✅ ruta data/products.json
const PRODUCTS_PATH = path.join(__dirname, "data", "products.json");

// Servir frontend
app.use(express.static(CLIENT_DIR));

// Helper para leer JSON
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// ===== API =====

// Lista de productos (para galería)
app.get("/api/products", (req, res) => {
  try {
    const products = readJson(PRODUCTS_PATH);
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Could not read products.json" });
  }
});

// Producto por id (para product.html?id=...)
app.get("/api/products/:id", (req, res) => {
  try {
    const products = readJson(PRODUCTS_PATH);
    const product = products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Could not read products.json" });
  }
});

// Ruta fallback: si entras /, manda index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log("Serving frontend from:", CLIENT_DIR);
  console.log("Reading products from:", PRODUCTS_PATH);
});
