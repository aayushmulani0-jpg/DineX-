const express = require("express");
const router = express.Router();
const Menu = require("../models/Menu");

// Add menu item
router.post("/add", async (req, res) => {
  try {
    const newItem = new Menu(req.body);
    const savedItem = await newItem.save();
    res.status(201).json(savedItem);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get all menu items
router.get("/", async (req, res) => {
  try {
    const items = await Menu.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
