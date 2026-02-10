import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
} from "react-router-dom";
import axios from "axios";
import { message } from "antd";

const API_BASE = "http://localhost:5000/api";
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Analytics from "./pages/Analytics";
import MenuPage from "./pages/MenuPage";
import ErrorPage from "./pages/ErrorPage";

function Layout() {
  return (
    <div className="layout">
      <Sidebar />
      <Outlet />
    </div>
  );
}

const createDefaultTables = () =>
  Array.from({ length: 8 }, (_, index) => ({
    id: `T${index + 1}`,
    name: `Table ${index + 1}`,
  }));

function App() {
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [billingConfig, setBillingConfig] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH TABLES ================= */
  const fetchTables = useCallback(async () => {
    try {
      const res = await api.get("/tables");
      setTables(res.data);
    } catch (error) {
      console.error("Failed to fetch tables:", error);
      message.error("Failed to load tables");
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  /* ================= FETCH MENU (OPTIMIZED) ================= */
  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/menu", {
        params: {
          _cache: Date.now(),
        },
      });
      setMenuItems(res.data);
    } catch (error) {
      console.error("Failed to fetch menu:", error);
      message.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenu();

    // Refresh every 10 minutes
    const interval = setInterval(fetchMenu, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMenu]);

  /* ================= FETCH BILLING CONFIG ================= */
  const fetchBilling = useCallback(async () => {
    try {
      const res = await api.get("/billing");
      setBillingConfig(res.data);
    } catch (error) {
      console.error("Failed to fetch billing config:", error);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  /* ================= AUTO REFRESH ORDERS ================= */
  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get("/orders");
      const validOrders = res.data.filter(
        (order) => order && order.items && order.items.length > 0,
      );
      setActiveOrders(validOrders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  /* ================= FETCH BILLS ================= */
  const fetchBills = useCallback(async () => {
    try {
      const res = await api.get("/bills");
      setBills(res.data);
    } catch (error) {
      console.error("Failed to fetch bills:", error);
    }
  }, []);

  useEffect(() => {
    fetchBills();
    const interval = setInterval(fetchBills, 15000);
    return () => clearInterval(interval);
  }, [fetchBills]);

  /* ================= ADD NEW TABLE (DB) ================= */
  const addNewTable = async () => {
    try {
      const res = await api.post("/tables", {
        name: `Table ${tables.length + 1}`,
      });

      setTables((prev) => [...prev, res.data]);
      message.success(`${res.data.name} added successfully`);
    } catch (error) {
      console.error("Backend error:", error.response?.data);
      message.error("Failed to add table");
    }
  };

  /* ================= REMOVE TABLE (DB) ================= */
  const removeTable = async (tableId) => {
    const tableHasOrders = activeOrders.some(
      (order) => order.tableId === tableId,
    );

    if (tableHasOrders) {
      message.warning("Cannot remove table with active orders");
      return;
    }

    try {
      await api.delete(`/tables/${tableId}`);
      setTables((prev) => prev.filter((t) => t.id !== tableId));
      message.success("Table removed successfully");
    } catch (error) {
      console.error("Failed to remove table:", error);
      message.error("Failed to remove table");
    }
  };

  /* ================= ADD ORDER FROM QR ================= */
  const addOrderFromQR = async (tableId, item) => {
    try {
      const res = await api.get(`/orders/${tableId}`);
      let existingOrder = res.data;
      let updatedItems = existingOrder?.items ? [...existingOrder.items] : [];

      const found = updatedItems.find((o) => o.id === item.id);

      if (found) {
        found.qty += 1;
      } else {
        updatedItems.push({
          id: item.id,
          name: item.name,
          price: item.price,
          img: item.img,
          category: item.category,
          qty: 1,
        });
      }

      await api.post(`/orders/${tableId}`, {
        items: updatedItems,
      });

      fetchOrders();
      message.success(`${item.name} added to order`);
    } catch (error) {
      message.error("Failed to add item");
      console.error(error);
    }
  };

  /* ================= GENERATE BILL (WITH DISCOUNT RESET) ================= */
  const generateBill = async (tableId, amount, method) => {
    try {
      // Generate bill first
      const res = await axios.put(
        `http://localhost:5000/api/orders/pay/${tableId}`,
        {
          amount,
          method,
        },
      );

      // Reset discount to 0 after bill generation
      if (billingConfig?.discount > 0) {
        await axios.put("http://localhost:5000/api/billing", {
          ...billingConfig,
          discount: 0,
        });

        // Update local state
        setBillingConfig((prev) => ({ ...prev, discount: 0 }));
      }

      message.success("Bill generated successfully! Table cleared.");
      fetchOrders();
      fetchBills();
    } catch (error) {
      if (error.response?.status === 404) {
        message.error("Order not confirmed by customer yet");
      } else {
        message.error("Failed to generate bill");
      }
      console.error(error);
    }
  };

  return (
    <Router>
      <Routes>
        <Route
          path="/menu/:tableId"
          element={
            <MenuPage
              menuItems={menuItems}
              addOrderFromQR={addOrderFromQR}
              billingConfig={billingConfig}
              loading={loading}
            />
          }
        />

        <Route element={<Layout />}>
          <Route
            path="/"
            element={
              <Dashboard
                tables={tables}
                activeOrders={activeOrders}
                menuItems={menuItems}
                billingConfig={billingConfig}
                setBillingConfig={setBillingConfig}
                generateBill={generateBill}
                addNewTable={addNewTable}
                removeTable={removeTable}
                loading={loading}
              />
            }
          />
          <Route path="/billing" element={<Billing bills={bills} />} />
          <Route path="/analytics" element={<Analytics bills={bills} />} />
        </Route>
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
