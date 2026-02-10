import React from "react";
import { Line } from "@ant-design/plots";

const Stats = ({ revenue = 0, tables = [], billCount = 0, bills = [] }) => {
  const activeTables = tables.filter((t) => t.status === "occupied").length;

  const data = bills.map((bill) => ({
    time: new Date(bill.date).toLocaleTimeString(),
    revenue: bill.amount,
  }));

  const config = {
    data,
    xField: "time",
    yField: "revenue",
    smooth: true,
    height: 250,

    point: {
      size: 4,
      shape: "circle",
    },
  };

  return (
    <>
      <div className="stats">
        <div className="card">
          <p>Total Revenue</p>
          <h2>₹{revenue.toFixed(2)}</h2>
        </div>

        <div className="card">
          <p>Active Tables</p>
          <h2>{activeTables}</h2>
        </div>

        <div className="card">
          <p>Total Bills</p>
          <h2>{billCount}</h2>
        </div>
      </div>

      {bills.length > 0 && (
        <div className="table-card" style={{ marginTop: "30px" }}>
          <h3>Revenue Analytics</h3>
          <Line {...config} />
        </div>
      )}
    </>
  );
};

export default Stats;
