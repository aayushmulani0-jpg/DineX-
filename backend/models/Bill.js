const mongoose = require("mongoose");

const billSchema = new mongoose.Schema({
  table: {
    type: String,
    required: true,
  },
  items: {
    type: Array,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  method: {
    type: String,
    required: true,
  },
  customerName: {
    type: String,
    default: "",
  },
  customerMobile: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 30, // 30 days TTL
  },
});

module.exports = mongoose.model("Bill", billSchema);
