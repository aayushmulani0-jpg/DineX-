const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  id: String,
  name: String,
  price: Number,
  qty: Number,
  img: String,
  category: String,
});

const orderSchema = new mongoose.Schema(
  {
    tableId: {
      type: String,
      required: true,
    },
    items: [orderItemSchema],
    paymentMethod: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      default: "active", // active | paid
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
