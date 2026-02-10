import React, { useState, useEffect } from "react";
import { DatePicker, Button, Empty } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

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

const formatDateTime = (value) => {
  const dateObj = new Date(value);
  const date = dateObj.toLocaleDateString();
  const time = dateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} ${time}`;
};

const Billing = ({ bills = [] }) => {
  const [dateRange, setDateRange] = useState(null);

  // Step 1: Filter by date range
  const filteredBills = bills.filter((bill) => {
    if (!dateRange) return true;

    const billDate = dayjs(bill.createdAt || bill.date);
    const [start, end] = dateRange;

    return (
      billDate.isAfter(start.startOf("day")) &&
      billDate.isBefore(end.endOf("day"))
    );
  });

  // Step 2: Group bills by table (one entry per table)
  const groupedBills = Object.values(
    filteredBills.reduce((acc, bill) => {
      if (!acc[bill.table]) {
        acc[bill.table] = { ...bill };
      } else {
        // Sum amounts
        acc[bill.table].amount += bill.amount;

        // Keep latest bill date
        if (dayjs(bill.createdAt || bill.date).isAfter(acc[bill.table].date)) {
          acc[bill.table].date = bill.createdAt || bill.date;
          acc[bill.table].method = bill.method;
        }
      }
      return acc;
    }, {}),
  );

  const totalFilteredRevenue = groupedBills.reduce(
    (sum, bill) => sum + bill.amount,
    0,
  );
  const rangeLabel = dateRange
    ? `${dateRange[0]?.format("MMM D")} – ${dateRange[1]?.format("MMM D")}`
    : "all time";

  useEffect(() => {
    document.title = "DineX Billing | Invoice History";
    setMetaDescription(
      `Review ₹${totalFilteredRevenue.toFixed(
        2,
      )} collected from ${groupedBills.length} tables for ${rangeLabel}.`,
    );
  }, [totalFilteredRevenue, groupedBills.length, rangeLabel]);

  return (
    <div className="main">
      <h2>All Bill History</h2>

      {/* Filter Section */}
      <div
        className="table-card"
        style={{
          marginTop: "20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <RangePicker
          value={dateRange}
          onChange={(values) => setDateRange(values)}
          format="YYYY-MM-DD"
        />

        <div>
          <strong>Total Revenue:</strong> ₹{totalFilteredRevenue.toFixed(2)}
        </div>

        <Button onClick={() => setDateRange(null)}>Clear Filter</Button>
      </div>

      {/* Bills Table */}
      <div className="table-card" style={{ marginTop: "20px" }}>
        {groupedBills.length === 0 ? (
          <Empty description="No bills found for selected range" />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Table</th>
                <th>Amount</th>
                <th>Payment</th>
                <th>Date</th>
              </tr>
            </thead>

            <tbody>
              {groupedBills.map((bill) => (
                <tr key={bill.table}>
                  <td>Table {bill.table}</td>
                  <td>₹{bill.amount.toFixed(2)}</td>
                  <td>{bill.method}</td>
                  <td>{formatDateTime(bill.createdAt || bill.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Billing;
