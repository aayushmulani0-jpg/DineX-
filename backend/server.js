const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

// Routes
const menuRoutes = require("./routes/menuRoutes");
const orderRoutes = require("./routes/orderRoutes");
const billingRoutes = require("./routes/billingRoutes");
const billRoutes = require("./routes/billRoutes");
const syncRoutes = require("./routes/syncRoutes");
const tableRoutes = require("./routes/tableRoutes");

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/menu", menuRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/tables", tableRoutes);

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/dinex")
  .then(() => console.log("MongoDB Connected ✅"))
  .catch((err) => console.log("DB Error:", err));

// Test route
app.get("/", (req, res) => {
  res.json({ message: "Backend API is running 🚀" });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});