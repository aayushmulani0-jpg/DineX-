import React, { useEffect, useState, useMemo } from "react";
import { Column, Line } from "@ant-design/plots";
import axios from "axios";
import dayjs from "dayjs";
import Topbar from "../components/layout/TopBar";
import "../styles/Analytics.css";

const API_BASE = "http://localhost:5000/api";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const safeNumber = (value) => (Number.isFinite(value) ? value : 0);

const dayWeights = [0.92, 0.98, 1, 1.03, 1.08, 1.18, 1.12];

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

  const predictionModel = useMemo(() => {
    const validBills = bills.filter(
      (bill) => bill && Number.isFinite(bill.amount),
    );
    const now = dayjs();
    const recentDays = 14;
    const recentStart = now.subtract(recentDays - 1, "day").startOf("day");
    const previousStart = now
      .subtract(recentDays * 2 - 1, "day")
      .startOf("day");
    const recentBills = validBills.filter((bill) => {
      const createdAt = dayjs(bill.createdAt || bill.date);
      return (
        createdAt.isValid() &&
        createdAt.isAfter(recentStart.subtract(1, "millisecond"))
      );
    });
    const previousBills = validBills.filter((bill) => {
      const createdAt = dayjs(bill.createdAt || bill.date);
      return (
        createdAt.isValid() &&
        createdAt.isAfter(previousStart.subtract(1, "millisecond")) &&
        createdAt.isBefore(recentStart)
      );
    });

    const totalBills = validBills.length;
    const recentRevenue = recentBills.reduce(
      (sum, bill) => sum + bill.amount,
      0,
    );
    const previousRevenue = previousBills.reduce(
      (sum, bill) => sum + bill.amount,
      0,
    );
    const recentAvgDailyRevenue = recentRevenue / recentDays;
    const previousAvgDailyRevenue = previousRevenue / recentDays;
    const allTimeAvgDailyRevenue =
      totalBills > 0 ? totalRevenue / Math.max(totalBills, 1) : 0;
    const baseRevenue =
      recentAvgDailyRevenue || allTimeAvgDailyRevenue || todayRevenue || 0;
    const momentum =
      previousAvgDailyRevenue > 0
        ? recentAvgDailyRevenue / previousAvgDailyRevenue
        : 1;

    const tableCount = tables.length || 1;
    const occupancyRate = orders.length / tableCount;
    const visitVolume = recentBills.length / recentDays;
    const avgBillValue = totalBills > 0 ? totalRevenue / totalBills : 0;

    const stockTotal = stockItems.length;
    const stockHealthyCount = stockItems.filter((item) => {
      const status = item.status || "in_stock";
      return status === "in_stock";
    }).length;
    const stockRiskCount = stockItems.filter((item) => {
      const status = item.status || "in_stock";
      return (
        status === "low_stock" ||
        status === "out_of_stock" ||
        status === "expiring_soon"
      );
    }).length;
    const stockHealth = stockTotal > 0 ? stockHealthyCount / stockTotal : 1;

    const demandFactor = 1 + clamp((occupancyRate - 0.4) * 0.35, -0.18, 0.32);
    const visitFactor =
      1 + clamp((visitVolume / Math.max(tableCount, 1)) * 0.2, 0, 0.22);
    const stockFactor = 0.85 + stockHealth * 0.25;
    const trendFactor = clamp(momentum, 0.82, 1.28);
    const baselineFactor = clamp(
      1 +
        (avgBillValue > 0
          ? (avgBillValue / Math.max(baseRevenue, 1)) * 0.02
          : 0),
      1,
      1.05,
    );

    const modelFactor = clamp(
      demandFactor * visitFactor * stockFactor * trendFactor * baselineFactor,
      0.7,
      1.75,
    );

    const forecast = Array.from({ length: 7 }, (_, index) => {
      const date = now.add(index + 1, "day");
      const seasonalWeight = dayWeights[date.day()] || 1;
      const projectedRevenue = safeNumber(
        baseRevenue * modelFactor * seasonalWeight,
      );

      return {
        date: date.format("ddd, DD MMM"),
        revenue: projectedRevenue,
        factor: seasonalWeight,
      };
    });

    const forecastRevenue = forecast.reduce(
      (sum, entry) => sum + entry.revenue,
      0,
    );
    const confidence = clamp(
      48 +
        Math.min(totalBills * 1.4, 22) +
        Math.min(recentBills.length * 0.8, 10) +
        Math.min(stockHealthyCount * 0.8, 8),
      45,
      92,
    );

    return {
      forecast,
      forecastRevenue,
      confidence,
      factors: [
        {
          label: "Recent demand",
          value: `${recentBills.length} bills / ${recentDays} days`,
          tone: occupancyRate >= 0.5 ? "up" : "neutral",
        },
        {
          label: "Table occupancy",
          value: `${(occupancyRate * 100).toFixed(1)}%`,
          tone:
            occupancyRate >= 0.75
              ? "up"
              : occupancyRate >= 0.4
                ? "neutral"
                : "down",
        },
        {
          label: "Revenue momentum",
          value: `${previousAvgDailyRevenue > 0 ? `${((momentum - 1) * 100).toFixed(1)}%` : "Stable"}`,
          tone: momentum >= 1 ? "up" : "down",
        },
        {
          label: "Inventory health",
          value:
            stockTotal > 0
              ? `${(stockHealth * 100).toFixed(0)}% ready`
              : "No stock data",
          tone:
            stockHealth >= 0.8 ? "up" : stockHealth >= 0.6 ? "neutral" : "down",
        },
      ],
      summary: {
        baseRevenue,
        modelFactor,
        occupancyRate,
        stockHealth,
        avgBillValue,
        stockRiskCount,
      },
    };
  }, [
    bills,
    orders.length,
    stockItems,
    tables.length,
    todayRevenue,
    totalRevenue,
  ]);

  const forecastChartConfig = {
    data: predictionModel.forecast,
    xField: "date",
    yField: "revenue",
    smooth: true,
    height: 300,
    color: "#ff8a00",
    point: { size: 4, shape: "circle" },
    areaStyle: { fill: "l(90) 0:#fff1df 1:#ffffff" },
  };

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

      <div className="analytics-forecast">
        <div className="analytics-forecast-header">
          <div>
            <p className="analytics-forecast-eyebrow">Sales Prediction</p>
            <h3>7-day sales forecast</h3>
            <p>
              Model uses bill history, current table demand, and stock readiness
              to estimate near-term revenue.
            </p>
          </div>
          <div className="analytics-forecast-score">
            <span>Confidence</span>
            <strong>{predictionModel.confidence.toFixed(0)}%</strong>
          </div>
        </div>

        <div className="analytics-forecast-summary">
          <div className="forecast-summary-card forecast-primary">
            <p>Predicted 7-day sales</p>
            <h2>₹{predictionModel.forecastRevenue.toFixed(2)}</h2>
            <span className="analytics-stat-sub">
              Avg. ₹{(predictionModel.forecastRevenue / 7).toFixed(2)} per day
            </span>
          </div>
          <div className="forecast-summary-card">
            <p>Baseline daily revenue</p>
            <h2>₹{predictionModel.summary.baseRevenue.toFixed(2)}</h2>
            <span className="analytics-stat-sub">
              Multiplier x{predictionModel.summary.modelFactor.toFixed(2)}
            </span>
          </div>
          <div className="forecast-summary-card">
            <p>Occupancy rate</p>
            <h2>{(predictionModel.summary.occupancyRate * 100).toFixed(1)}%</h2>
            <span className="analytics-stat-sub">
              {predictionModel.summary.stockRiskCount} stock items need
              attention
            </span>
          </div>
        </div>

        <div className="analytics-forecast-grid">
          <div className="analytics-forecast-chart">
            <h4>Projected revenue curve</h4>
            {predictionModel.forecast.length > 0 ? (
              <Line {...forecastChartConfig} />
            ) : (
              <div className="analytics-empty analytics-empty-compact">
                Not enough history to forecast
              </div>
            )}
          </div>
          <div className="analytics-forecast-factors">
            <h4>Model factors</h4>
            <div className="forecast-factor-list">
              {predictionModel.factors.map((factor) => (
                <div
                  key={factor.label}
                  className={`forecast-factor ${factor.tone}`}
                >
                  <span>{factor.label}</span>
                  <strong>{factor.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="analytics-forecast-strip">
          {predictionModel.forecast.map((entry) => (
            <div key={entry.date} className="forecast-day-card">
              <span>{entry.date}</span>
              <strong>₹{entry.revenue.toFixed(2)}</strong>
            </div>
          ))}
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
