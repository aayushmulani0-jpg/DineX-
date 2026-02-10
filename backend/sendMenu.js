const mongoose = require("mongoose");
require("dotenv").config();

const Menu = require("./models/Menu");
const menuData = require("./data/menuData.json");

const seedMenu = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected for Seeding");

    // 🔥 Recommended pattern
    await Menu.deleteMany({});
    await Menu.insertMany(menuData);

    console.log("Menu seeded successfully");
    process.exit();
  } catch (error) {
    console.error("Seeding Error:", error);
    process.exit(1);
  }
};

seedMenu();
