const express = require("express");
const router = express.Router();
const Table = require("../models/Table");

/* ================= GET ALL TABLES ================= */
router.get("/", async (req, res) => {
  try {
    const tables = await Table.find().sort({ id: 1 });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= ADD NEW TABLE ================= */
router.post("/", async (req, res) => {
  try {
    const tables = await Table.find();

    let maxNumber = 0;

    tables.forEach((table) => {
      if (table.id) {
        const num = parseInt(table.id.replace("T", ""));
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    const nextTableNumber = maxNumber + 1;

    const newTable = new Table({
      id: `T${nextTableNumber}`,
      name: `Table ${nextTableNumber}`,
    });

    await newTable.save();

    res.status(201).json(newTable);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/* ================= DELETE TABLE ================= */
router.delete("/:id", async (req, res) => {
  try {
    const table = await Table.findOneAndDelete({ id: req.params.id });

    if (!table) {
      return res.status(404).json({ message: "Table not found" });
    }

    res.json({ success: true, message: "Table deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
