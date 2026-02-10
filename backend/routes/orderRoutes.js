const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Bill = require("../models/Bill");

/* ================= GET ALL ORDERS ================= */
router.get("/", async (req, res) => {
  try {
    // Show ALL orders to admin including confirmed ones
    const orders = await Order.find({
      status: { $in: ["active", "confirmed"] }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= GET ORDER BY TABLE ================= */
router.get("/:tableId", async (req, res) => {
  try {
    const order = await Order.findOne({
      tableId: req.params.tableId,
      status: { $in: ["active", "confirmed"] },
    });

    // Return empty order if not found
    res.json(order || { items: [], status: "draft", tableId: req.params.tableId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= SYNC ORDER STATUS ================= */
router.get("/sync/:tableId", async (req, res) => {
  try {
    const order = await Order.findOne({
      tableId: req.params.tableId,
      status: { $in: ["active", "confirmed"] },
    });
    
    if (!order) {
      return res.json({ items: [], status: "draft", tableId: req.params.tableId });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= UPDATE ORDER (WORKS FOR BOTH ADMIN & CUSTOMER) ================= */
router.post("/:tableId", async (req, res) => {
  try {
    const { items, paymentMethod, status } = req.body;

    let order = await Order.findOne({
      tableId: req.params.tableId,
      status: { $in: ["active", "confirmed"] },
    });

    if (!order) {
      // Create new order
      order = await Order.create({
        tableId: req.params.tableId,
        items: items || [],
        paymentMethod: paymentMethod || null,
        status: status || "active",
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      // Update existing order - ADMIN CAN MODIFY EVEN IF CONFIRMED
      if (items !== undefined) {
        order.items = items;
      }
      if (paymentMethod !== undefined) {
        order.paymentMethod = paymentMethod;
      }
      if (status !== undefined) {
        order.status = status;
      }
      order.updatedAt = new Date();
      await order.save();
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= CONFIRM ORDER WITH PAYMENT METHOD ================= */
router.put("/confirm/:tableId", async (req, res) => {
  try {
    const { paymentMethod } = req.body;

    // Find or create order for this table
    let order = await Order.findOne({
      tableId: req.params.tableId,
      status: { $in: ["active", "confirmed"] },
    });

    if (!order) {
      // Create new confirmed order if doesn't exist
      order = await Order.create({
        tableId: req.params.tableId,
        items: [],
        paymentMethod: paymentMethod,
        status: "confirmed",
        confirmedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } else {
      // Update existing order
      order.paymentMethod = paymentMethod;
      order.status = "confirmed";
      order.confirmedAt = new Date();
      order.updatedAt = new Date();
      await order.save();
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= GENERATE BILL ================= */
router.put("/pay/:tableId", async (req, res) => {
  try {
    const { amount, method } = req.body;

    // Find order for this table
    const order = await Order.findOne({
      tableId: req.params.tableId,
      status: { $in: ["active", "confirmed"] },
    });

    if (!order) {
      return res.status(404).json({ 
        message: "No order found for this table",
        tableId: req.params.tableId
      });
    }

    // Create bill
    await Bill.create({
      table: order.tableId,
      items: order.items,
      amount,
      method: method || order.paymentMethod || "Cash",
      paymentMethod: order.paymentMethod || "Cash",
      orderId: order._id,
      createdAt: new Date()
    });

    // Delete the order after billing
    await Order.deleteOne({ _id: order._id });

    res.json({ 
      success: true,
      message: "Bill generated successfully",
      tableId: order.tableId,
      paymentMethod: order.paymentMethod,
      amount: amount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* ================= CLEAR ORDER ================= */
router.delete("/clear/:tableId", async (req, res) => {
  try {
    // Delete all orders for this table
    const result = await Order.deleteMany({
      tableId: req.params.tableId
    });

    res.json({ 
      success: true,
      message: `Cleared ${result.deletedCount} order(s) for table ${req.params.tableId}`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;