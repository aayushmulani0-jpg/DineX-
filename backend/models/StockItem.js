const mongoose = require("mongoose");

const stockItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Fruits",
        "Veggies",
        "Grains",
        "Dairy",
        "Meat",
        "Seafood",
        "Beverages",
        "Spices",
        "Frozen",
        "Packaging",
        "Others",
      ],
    },
    unit: {
      type: String,
      required: true,
      enum: ["kg", "g", "l", "ml", "pcs", "pack", "box", "bottle"],
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    costPrice: {
      type: Number,
      min: 0,
      default: 0,
    },
    supplierName: {
      type: String,
      trim: true,
      default: "",
    },
    supplierContact: {
      type: String,
      trim: true,
      default: "",
    },
    batchNo: {
      type: String,
      trim: true,
      default: "",
    },
    storageLocation: {
      type: String,
      trim: true,
      default: "",
    },
    expiryDate: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["in_stock", "low_stock", "out_of_stock", "expiring_soon"],
      default: "in_stock",
    },
    lastRestockedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StockItem", stockItemSchema);
