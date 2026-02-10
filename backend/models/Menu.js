const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    img: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    dsc: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    rate: {
      type: Number,
      default: 0,
    },
    category: {
      type: String,
      required: true,
      enum: ["Pizza", "Sandwich", "Burger", "Drinks", "Ice Cream"],
    },
    country: {
      type: String,
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Menu", menuSchema);
