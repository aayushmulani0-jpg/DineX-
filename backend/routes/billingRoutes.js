const express = require("express");
const router = express.Router();
const Billing = require("../models/BillingConfig");

router.get("/", async (req, res) => {
  let config = await Billing.findOne();
  if (!config) {
    config = await Billing.create({});
  }
  res.json(config);
});

router.put("/", async (req, res) => {
  let config = await Billing.findOne();
  if (!config) {
    config = await Billing.create(req.body);
  } else {
    config = await Billing.findByIdAndUpdate(
      config._id,
      req.body,
      { new: true }
    );
  }
  res.json(config);
});

// Reset billing to defaults
router.post("/reset", async (req, res) => {
  let config = await Billing.findOne();
  if (!config) {
    config = await Billing.create({});
  }
  
  // Reset to defaults
  config.discount = 0;
  config.serviceEnabled = true;
  config.serviceRate = 0.1;
  config.taxRate = 0.18;
  
  await config.save();
  res.json(config);
});

module.exports = router;