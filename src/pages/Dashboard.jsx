import React, { useState, useEffect } from "react";
import Stats from "../components/dashboard/Stats";
import OrderDrawer from "../components/drawer/OrderDrawer";
import MenuModal from "../components/menu/MenuModal";
import Topbar from "../components/layout/TopBar";
import dining from "../assets/dining.jpg";
import "../styles/dashboard.css";
import { Link } from "react-router-dom";
import { Tag, Tooltip, Button, Popconfirm } from "antd";
import axios from "axios";
import {
  ShoppingCartOutlined,
  CreditCardOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  DeleteOutlined,
} from "@ant-design/icons";

const Dashboard = ({
  tables = [],
  activeOrders = [],
  menuItems = [],
  billingConfig,
  setBillingConfig,
  generateBill,
  addNewTable,
  removeTable,
  loading = false,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [revenue, setRevenue] = useState(0);
  const [billCount, setBillCount] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [filteredActiveOrders, setFilteredActiveOrders] = useState([]);

  /* ================= FETCH REVENUE STATS ================= */
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const billsRes = await axios.get("http://localhost:5000/api/bills");
        const totalRevenue = billsRes.data.reduce(
          (sum, bill) => sum + bill.amount,
          0,
        );
        setRevenue(totalRevenue);
        setBillCount(billsRes.data.length);

        // Calculate today's revenue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayBills = billsRes.data.filter(
          (bill) => new Date(bill.createdAt) >= today,
        );
        const todayTotal = todayBills.reduce(
          (sum, bill) => sum + bill.amount,
          0,
        );
        setTodayRevenue(todayTotal);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ================= FILTER ACTIVE ORDERS ================= */
  useEffect(() => {
    // Filter out orders that are not truly active (draft status or no items)
    const validActiveOrders = activeOrders.filter(
      (order) =>
        order &&
        order.items &&
        order.items.length > 0 &&
        order.status !== "draft",
    );
    setFilteredActiveOrders(validActiveOrders);
  }, [activeOrders]);
  /* ================= GENERATE BILL LOGIC ================= */
  const handleGenerateBill = async (tableId, amount, method) => {
    try {
      if (!generateBill) {
        console.error("generateBill function is not available");
        return;
      }

      // Call the generateBill function passed from App.jsx
      await generateBill(tableId, amount, method);

      // The table should be cleared automatically by the generateBill function
      // No need to manually close drawer or reset state here
    } catch (error) {
      console.error("Failed to generate bill:", error);
    }
  };
  const openMenu = (table) => {
    setSelectedTableId(table?.id ?? null);
    setMenuOpen(true);
  };

  const openBilling = (table) => {
    setSelectedTableId(table?.id ?? null);
    setDrawerOpen(true);
  };

  const selectedTable = tables.find((t) => t.id === selectedTableId) || null;
  const selectedOrder = filteredActiveOrders.find(
    (o) => o.tableId === selectedTableId,
  );

  return (
    <div className="main">
      <Topbar />

      <div className="hero">
        <h2>Welcome Back 👋</h2>
        <p>Manage your restaurant operations efficiently.</p>
        <div className="hero-actions">
          <Link to="/analytics" className="menu-item active">
            View Analytics
          </Link>
          <Link to="/billing" className="menu-item active">
            Billing History
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats">
        <div className="card">
          <p>Today's Revenue</p>
          <h2>₹{todayRevenue.toFixed(2)}</h2>
        </div>
        <div className="card">
          <p>Active Orders</p>
          <h2>{filteredActiveOrders.length}</h2>
        </div>
        <div className="card">
          <p>Total Bills</p>
          <h2>{billCount}</h2>
        </div>
      </div>

      <div className="table-card table-card--spaced">
        <div className="table-card-header">
          <h3>Restaurant Tables</h3>
          <div className="table-card-actions">
            <div className="order-count">
              {filteredActiveOrders.length} order
              {filteredActiveOrders.length !== 1 ? "s" : ""}
            </div>
            {addNewTable && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={addNewTable}
                className="add-table-btn"
              >
                Add Table
              </Button>
            )}
          </div>
        </div>

        <div className="table-grid">
          {tables.map((table) => {
            const order = filteredActiveOrders.find(
              (o) => o.tableId === table.id,
            );
            const isOccupied = !!order;

            const tableTotal = order
              ? order.items.reduce(
                  (sum, item) => sum + item.price * item.qty,
                  0,
                )
              : 0;

            const itemCount = order ? order.items.length : 0;
            const isConfirmed = order?.status === "confirmed";

            return (
              <div key={table.id} className="table-box">
                <div className="table-placeholder">
                  <img
                    src={dining}
                    alt="Dining"
                    className="table-img dashboard-table-img"
                  />
                  {isOccupied && (
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        background: "rgba(255,255,255,0.9)",
                        padding: "4px 8px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                    >
                      {itemCount} item{itemCount !== 1 ? "s" : ""}
                    </div>
                  )}

                  {/* Remove table button (only for empty tables) */}
                  {removeTable && !isOccupied && (
                    <Popconfirm
                      title={`Remove ${table.name}?`}
                      description="Are you sure you want to remove this table?"
                      onConfirm={() => removeTable(table.id)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <button type="button" className="remove-table-btn">
                        <DeleteOutlined />
                      </button>
                    </Popconfirm>
                  )}
                </div>

                <div className="table-content">
                  <h4>{table.name}</h4>

                  <p style={{ marginBottom: "8px" }}>
                    Status:{" "}
                    <span
                      className={`status-badge ${
                        isOccupied ? "status-occupied" : "status-available"
                      }`}
                    >
                      {isOccupied ? (
                        <>
                          <ClockCircleOutlined style={{ marginRight: "4px" }} />
                          {isConfirmed ? "Confirmed" : "Active"}
                        </>
                      ) : (
                        "Available"
                      )}
                    </span>
                  </p>

                  {isOccupied && order?.customerName && (
                    <p style={{ marginBottom: "8px" }}>
                      Customer: {order.customerName}
                    </p>
                  )}

                  {isOccupied && order.paymentMethod && (
                    <Tooltip title={`Customer selected ${order.paymentMethod}`}>
                      <p className="payment-method-display">
                        <CreditCardOutlined className="payment-method-icon" />
                        <span className="payment-method-text">
                          {order.paymentMethod}
                        </span>
                      </p>
                    </Tooltip>
                  )}

                  <h4 className="table-total">
                    Total: ₹{tableTotal.toFixed(2)}
                  </h4>

                  <div className="table-actions">
                    <button
                      className="table-btn table-btn--dashboard primary"
                      onClick={() => openMenu(table)}
                    >
                      <ShoppingCartOutlined className="table-btn-icon" />
                      {isOccupied ? "Manage Order" : "Add Items"}
                    </button>

                    {isOccupied && (
                      <button
                        className="table-btn table-btn--dashboard bill"
                        onClick={() => openBilling(table)}
                      >
                        Generate Bill
                      </button>
                    )}
                  </div>

                  {isOccupied && (
                    <div className="table-footer">
                      <span>
                        {itemCount} item{itemCount !== 1 ? "s" : ""}
                      </span>
                      <Tag
                        color={isConfirmed ? "green" : "blue"}
                        className="table-status-tag"
                      >
                        {isConfirmed ? "Confirmed" : "Active"}
                      </Tag>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <MenuModal
        open={menuOpen}
        onClose={() => {
          setMenuOpen(false);
          setSelectedTableId(null);
        }}
        table={selectedTable}
        menuItems={menuItems}
      />

      <OrderDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedTableId(null);
        }}
        table={selectedTable}
        order={selectedOrder}
        generateBill={generateBill}
        billingConfig={billingConfig}
        setBillingConfig={setBillingConfig}
      />
    </div>
  );
};

export default Dashboard;
