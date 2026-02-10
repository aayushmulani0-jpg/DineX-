const mongoose = require("mongoose");

const billingSchema = new mongoose.Schema({
  taxRate: { type: Number, default: 0.18 },
  serviceEnabled: { type: Boolean, default: true },
  serviceRate: { type: Number, default: 0.1 },
  discount: { type: Number, default: 0 }, // Default is 0, not 50
});

module.exports = mongoose.model("BillingConfig", billingSchema);