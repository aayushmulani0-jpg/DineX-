import React, { useEffect, useState, useMemo } from "react";
import { Column, Line } from "@ant-design/plots";
import axios from "axios";
import dayjs from "dayjs";
import Topbar from "../components/layout/TopBar";
import "../styles/Analytics.css";

const API_BASE = "http://localhost:5000/api";

const setMetaDescription = (content) => {
  if (typeof document === "undefined") return;
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", "description");
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const Analytics = ({ bills = [] }) => {
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stockItems, setStockItems] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tablesRes, ordersRes, stockRes] = await Promise.all([
          axios.get(`${API_BASE}/tables`),
          axios.get(`${API_BASE}/orders`),
          axios.get(`${API_BASE}/stock`),
        ]);
        setTables(Array.isArray(tablesRes.data) ? tablesRes.data : []);
        const validOrders = (
          Array.isArray(ordersRes.data) ? ordersRes.data : []
        ).filter((o) => o && o.tableId && o.items && o.items.length > 0);
        setOrders(validOrders);
        setStockItems(Array.isArray(stockRes.data) ? stockRes.data : []);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  document.title = "DineX Analytics | Dashboard";
  setMetaDescription(
    "Restaurant analytics with revenue and table occupancy insights.",
  );

  /* ================= TODAY'S REVENUE ================= */
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayBills = bills.filter((bill) => {
    const billDate = new Date(bill.createdAt || bill.date);
    billDate.setHours(0, 0, 0, 0);
    return billDate.getTime() === today.getTime();
  });
  const todayRevenue = todayBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalRevenue = bills.reduce((sum, bill) => sum + bill.amount, 0);

  /* ================= DAILY REVENUE TREND ================= */
  const dailyData = useMemo(() => {
    const grouped = {};
    bills.forEach((bill) => {
      const date = dayjs(bill.createdAt || bill.date).format("DD MMM");
      if (!grouped[date]) grouped[date] = 0;
      grouped[date] += bill.amount;
    });
    return Object.entries(grouped)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => dayjs(a.date, "DD MMM").diff(dayjs(b.date, "DD MMM")));
  }, [bills]);

  const revenueLineConfig = {
    data: dailyData.length > 0 ? dailyData : [],
    xField: "date",
    yField: "revenue",
    smooth: true,
    height: 320,
    color: "#1e6ea4",
  };

  /* ================= TABLE OCCUPANCY ================= */
  const occupancyData = useMemo(() => {
    const occupied = orders.length;
    const available = Math.max(tables.length - occupied, 0);
    return [
      { status: "Occupied", count: occupied },
      { status: "Available", count: available },
    ];
  }, [tables, orders]);

  const occupancyChartConfig = {
    data: occupancyData,
    xField: "status",
    yField: "count",
    columnStyle: { radius: [8, 8, 0, 0] },
    height: 320,
    color: "#1e6ea4",
    label: {
      position: "top",
      style: { fill: "#333", opacity: 1 },
    },
  };

  return (
    <div className="main analytics-main">
      <Topbar />

      <div className="analytics-hero">
        <h2>Analytics Dashboard</h2>
        <p>Real-time insights into revenue and table occupancy.</p>
      </div>

      {/* TODAY'S STATS */}
      <div className="analytics-stats">
        <div className="analytics-stat-card primary">
          <p>Today's Revenue</p>
          <h2>₹{todayRevenue.toFixed(2)}</h2>
          <span className="analytics-stat-sub">{todayBills.length} bills</span>
        </div>
        <div className="analytics-stat-card">
          <p>Total Revenue</p>
          <h2>₹{totalRevenue.toFixed(2)}</h2>
          <span className="analytics-stat-sub">
            {bills.length} all-time bills
          </span>
        </div>
        <div className="analytics-stat-card">
          <p>Total Tables</p>
          <h2>{tables.length}</h2>
          <span className="analytics-stat-sub">in restaurant</span>
        </div>
        <div className="analytics-stat-card">
          <p>Occupied Now</p>
          <h2>{orders.length}</h2>
          <span className="analytics-stat-sub">active tables</span>
        </div>
      </div>

      {/* CHARTS GRID */}
      <div className="analytics-grid">
        {/* Daily Revenue Trend */}
        <div className="analytics-chart-card">
          <h3>Daily Revenue Trend</h3>
          {dailyData.length > 0 ? (
            <Line {...revenueLineConfig} />
          ) : (
            <div className="analytics-empty">No revenue data yet</div>
          )}
        </div>

        {/* Table Occupancy */}
        <div className="analytics-chart-card">
          <h3>Today's Table Occupancy</h3>
          {tables.length > 0 ? (
            <Column {...occupancyChartConfig} />
          ) : (
            <div className="analytics-empty">No tables configured yet</div>
          )}
        </div>
      </div>

      {/* INSIGHTS */}
      <div className="analytics-insights">
        <h3>Quick Insights</h3>
        <div className="insights-list">
          <div className="insight-item">
            <span className="insight-icon">📊</span>
            <p>
              <strong>Average Bill Value:</strong> ₹
              {bills.length > 0
                ? (totalRevenue / bills.length).toFixed(2)
                : "0.00"}
            </p>
          </div>
          <div className="insight-item">
            <span className="insight-icon">🪑</span>
            <p>
              <strong>Occupancy Rate:</strong>{" "}
              {tables.length > 0
                ? ((orders.length / tables.length) * 100).toFixed(1) + "%"
                : "0%"}
            </p>
          </div>
          <div className="insight-item">
            <span className="insight-icon">📈</span>
            <p>
              <strong>Today's Bills:</strong> {todayBills.length} transactions
            </p>
          </div>
          <div className="insight-item">
            <span className="insight-icon">⏱️</span>
            <p>
              <strong>Available Tables:</strong>{" "}
              {Math.max(tables.length - orders.length, 0)} out of{" "}
              {tables.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
