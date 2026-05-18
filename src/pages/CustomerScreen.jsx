import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Topbar from "../components/layout/TopBar";
import "../styles/CustomerScreen.css";

const API_BASE = "http://localhost:5000/api";

const CustomerScreen = () => {
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTables = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/tables`);
      setTables(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Failed to fetch tables:", error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/orders`);
      const validOrders = (Array.isArray(res.data) ? res.data : []).filter(
        (order) =>
          order &&
          order.tableId &&
          order.items &&
          order.items.length > 0 &&
          order.status !== "paid",
      );
      setOrders(validOrders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([fetchTables(), fetchOrders()]);
      setLoading(false);
    };

    loadInitialData();
    const interval = setInterval(() => {
      fetchTables();
      fetchOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchTables, fetchOrders]);

  const occupancyMap = useMemo(() => {
    const map = {};
    orders.forEach((order) => {
      map[order.tableId] = order;
    });
    return map;
  }, [orders]);

  const occupiedCount = useMemo(
    () => tables.filter((table) => occupancyMap[table.id]).length,
    [tables, occupancyMap],
  );

  return (
    <div className="main customer-main">
      {/* <Topbar /> */}

      <div className="customer-hero">
        <h2>Customer Table Occupancy</h2>
        <p>Live view of all tables with occupancy status.</p>
      </div>

      <div className="customer-stats">
        <div className="customer-stat-card">
          <p>Total Tables</p>
          <h3>{tables.length}</h3>
        </div>
        <div className="customer-stat-card">
          <p>Occupied Tables</p>
          <h3>{occupiedCount}</h3>
        </div>
        <div className="customer-stat-card">
          <p>Available Tables</p>
          <h3>{Math.max(tables.length - occupiedCount, 0)}</h3>
        </div>
      </div>

      <div className="customer-table-grid">
        {loading ? (
          <div className="customer-empty">Loading tables...</div>
        ) : tables.length === 0 ? (
          <div className="customer-empty">No tables found in backend.</div>
        ) : (
          tables.map((table) => {
            const order = occupancyMap[table.id];
            const isOccupied = Boolean(order);
            const itemCount = order?.items?.reduce(
              (sum, item) => sum + (item.qty || 0),
              0,
            );

            return (
              <div
                key={table.id}
                className={`customer-table-card ${
                  isOccupied ? "occupied" : "available"
                }`}
              >
                <div className="customer-table-head">
                  <h4>{table.name || table.id}</h4>
                  <span
                    className={`customer-status-badge ${
                      isOccupied ? "occupied" : "available"
                    }`}
                  >
                    {isOccupied ? "Occupied" : "Available"}
                  </span>
                </div>

                <p className="customer-table-id">ID: {table.id}</p>

                {isOccupied ? (
                  <div className="customer-occupied-meta">
                    <p>Items: {itemCount || 0}</p>
                    <p>Customer: {order.customerName || "Guest"}</p>
                  </div>
                ) : (
                  <p className="customer-available-text">
                    Ready for new customers
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CustomerScreen;
