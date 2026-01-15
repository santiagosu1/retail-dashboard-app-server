import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const CLIENT_DIR = path.join(__dirname, "..", "retail-dashboard-app");

const PRODUCTS_PATH = path.join(__dirname, "data", "products.json");

app.use(express.static(CLIENT_DIR));

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

//  API 

app.get("/api/products", (req, res) => {
  try {
    const products = readJson(PRODUCTS_PATH);
    res.json(products);
  } catch {
    res.status(500).json({ error: "Could not read products.json" });
  }
});

app.get("/api/products/:id", (req, res) => {
  try {
    const products = readJson(PRODUCTS_PATH);
    const product = products.find((p) => p.id === req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch {
    res.status(500).json({ error: "Could not read products.json" });
  }
});

app.post("/api/checkout", (req, res) => {
  try {
    const items = Array.isArray(req.body?.items) ? req.body.items : [];

    if (!items.length) {
      return res.status(400).json({ error: "Cart is empty." });
    }

    const qtyById = new Map();
    for (const it of items) {
      const id = String(it.id || "").trim();
      const qty = Number(it.qty || 0);

      if (!id || !Number.isFinite(qty) || qty <= 0) continue;

      qtyById.set(id, (qtyById.get(id) || 0) + qty);
    }

    if (qtyById.size === 0) {
      return res.status(400).json({ error: "Invalid cart items." });
    }

    const products = readJson(PRODUCTS_PATH);

    const errors = [];
    for (const [id, qty] of qtyById.entries()) {
      const p = products.find((x) => x.id === id);
      if (!p) {
        errors.push({ id, reason: "Product not found" });
        continue;
      }
      const stock = Number(p.stock || 0);
      if (stock < qty) {
        errors.push({ id, reason: "Not enough stock", stock, requested: qty });
      }
    }

    if (errors.length) {
      return res.status(400).json({
        error: "Checkout failed.",
        details: errors,
      });
    }

    // Resta stock
    for (const [id, qty] of qtyById.entries()) {
      const p = products.find((x) => x.id === id);
      p.stock = Math.max(0, Number(p.stock || 0) - qty);
    }

    // Guarda
    writeJson(PRODUCTS_PATH, products);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Checkout server error." });
  }
});

// Ruta fallback
app.get("/", (req, res) => {
  res.sendFile(path.join(CLIENT_DIR, "index.html"));
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
