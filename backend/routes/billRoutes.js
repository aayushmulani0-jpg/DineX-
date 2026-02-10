const express = require("express");
const router = express.Router();
const Bill = require("../models/Bill");

router.get("/", async (req, res) => {
  const bills = await Bill.find().sort({ createdAt: -1 });
  res.json(bills);
});

module.exports = router;
