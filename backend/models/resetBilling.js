const mongoose = require("mongoose");
require("dotenv").config();

const BillingConfig = require("./models/BillingConfig");

const resetBilling = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/dinex");
    console.log("MongoDB Connected for Reset");

    // Find or create billing config
    let config = await BillingConfig.findOne();
    
    if (!config) {
      config = await BillingConfig.create({
        taxRate: 0.18,
        serviceEnabled: true,
        serviceRate: 0.1,
        discount: 0, // Set to 0
      });
    } else {
      config.discount = 0; // Reset to 0
      await config.save();
    }

    console.log("Billing config reset successfully:");
    console.log("Discount is now:", config.discount);
    process.exit();
  } catch (error) {
    console.error("Reset Error:", error);
    process.exit(1);
  }
};

resetBilling();