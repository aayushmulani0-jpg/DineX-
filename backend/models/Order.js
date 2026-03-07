const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  id: String,
  name: String,
  price: Number,
  qty: Number,
  img: String,
  category: String,
  itemStatus: {
    type: String,
    default: "new", // new | preparing | served
  },
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
    customerName: {
      type: String,
      default: "",
    },
    customerMobile: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      default: "active", // active | paid
    },
    kitchenStatus: {
      type: String,
      default: "new", // new | preparing | served
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
