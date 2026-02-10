import React, { useEffect } from "react";
import { Line } from "@ant-design/plots";

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
  const hasData = bills.length > 0;
  const totalRevenue = bills.reduce((sum, bill) => sum + bill.amount, 0);

  useEffect(() => {
    document.title = "DineX Analytics | Revenue Trends";
    setMetaDescription(
      hasData
        ? `Visualize ₹${totalRevenue.toFixed(
            2,
          )} in revenue generated across ${bills.length} bills.`
        : "Track restaurant revenue trends once billing data becomes available.",
    );
  }, [hasData, totalRevenue, bills.length]);

  const data = hasData
    ? bills.map((bill) => ({
        date: new Date(bill.createdAt || bill.date).toLocaleDateString(),
        revenue: bill.amount,
      }))
    : [
        { date: "Mon", revenue: 0 },
        { date: "Tue", revenue: 0 },
        { date: "Wed", revenue: 0 },
        { date: "Thu", revenue: 0 },
        { date: "Fri", revenue: 0 },
        { date: "Sat", revenue: 0 },
        { date: "Sun", revenue: 0 },
      ];

  const config = {
    data,
    xField: "date",
    yField: "revenue",
    smooth: true,
    height: 400,
  };

  return (
    <div className="main">
      <h2>Revenue Analytics</h2>

      <div className="table-card" style={{ marginTop: "20px" }}>
        {!hasData && (
          <p style={{ color: "#888", marginBottom: "15px" }}>
            No revenue data yet.
          </p>
        )}
        <Line {...config} />
      </div>
    </div>
  );
};

export default Analytics;
