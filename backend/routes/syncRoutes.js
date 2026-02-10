const express = require("express");
const router = express.Router();
const Menu = require("../models/Menu");

// Real-time menu sync for customers
router.get("/menu", async (req, res) => {
  try {
    const items = await Menu.find({ available: true });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Quick availability toggle
router.put("/menu/:id/available", async (req, res) => {
  try {
    const item = await Menu.findByIdAndUpdate(
      req.params.id,
      { available: req.body.available },
      { new: true }
    );
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;