const express = require("express");
const router = express.Router();
const StockItem = require("../models/StockItem");

const getStatus = ({ quantity, expiryDate }) => {
  if (quantity <= 0) {
    return "out_of_stock";
  }

  const thresholdDays = 3;
  if (expiryDate) {
    const now = new Date();
    const thresholdDate = new Date(
      now.getTime() + thresholdDays * 24 * 60 * 60 * 1000,
    );
    if (new Date(expiryDate) <= thresholdDate) {
      return "expiring_soon";
    }
  }

  return "in_stock";
};

const buildSku = (name, category) => {
  const namePart = (name || "ITEM")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 4)
    .toUpperCase();
  const categoryPart = (category || "OT")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase();
  const serial = Date.now().toString().slice(-5);
  return `${namePart}-${categoryPart}-${serial}`;
};

/* ================= GET ALL STOCK ITEMS ================= */
router.get("/", async (req, res) => {
  try {
    const { category, status, search } = req.query;
    const query = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
        { supplierName: { $regex: search, $options: "i" } },
      ];
    }

    const items = await StockItem.find(query).sort({ updatedAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ADD STOCK ITEM ================= */
router.post("/", async (req, res) => {
  try {
    const payload = { ...req.body };

    payload.sku = payload.sku ? payload.sku.trim().toUpperCase() : "";
    if (!payload.sku) {
      payload.sku = buildSku(payload.name, payload.category);
    }

    payload.status = getStatus({
      quantity: Number(payload.quantity || 0),
      expiryDate: payload.expiryDate,
    });

    if (!payload.lastRestockedAt) {
      payload.lastRestockedAt = new Date();
    }

    const newItem = new StockItem(payload);
    const saved = await newItem.save();
    res.status(201).json(saved);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: "SKU already exists" });
    }
    res.status(400).json({ error: error.message });
  }
});

/* ================= UPDATE STOCK ITEM STATUS ================= */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const item = await StockItem.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({ error: "Stock item not found" });
    }

    res.json(item);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
