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

  const totalFilteredRevenue = filteredBills.reduce(
    (sum, bill) => sum + bill.amount,
    0,
  );
  const billsByDate = filteredBills.reduce((acc, bill) => {
    const billDay = dayjs(bill.createdAt || bill.date).format("YYYY-MM-DD");
    if (!acc[billDay]) acc[billDay] = [];
    acc[billDay].push(bill);
    return acc;
  }, {});
  const sortedDates = Object.keys(billsByDate).sort(
    (a, b) => dayjs(b).valueOf() - dayjs(a).valueOf(),
  );
  const rangeLabel = dateRange
    ? `${dateRange[0]?.format("MMM D")} – ${dateRange[1]?.format("MMM D")}`
    : "all time";

  useEffect(() => {
    document.title = "DineX Billing | Invoice History";
    setMetaDescription(
      `Review ₹${totalFilteredRevenue.toFixed(
        2,
      )} collected from ${filteredBills.length} bills for ${rangeLabel}.`,
    );
  }, [totalFilteredRevenue, filteredBills.length, rangeLabel]);

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
        {filteredBills.length === 0 ? (
          <Empty description="No bills found for selected range" />
        ) : (
          sortedDates.map((dateKey) => (
            <div key={dateKey} style={{ marginBottom: "16px" }}>
              <h3 style={{ marginBottom: "10px" }}>
                {dayjs(dateKey).format("MMM D, YYYY")}
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>Table</th>
                    <th>Customer</th>
                    <th>Mobile</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Time</th>
                  </tr>
                </thead>

                <tbody>
                  {billsByDate[dateKey].map((bill) => (
                    <tr
                      key={
                        bill.id ||
                        bill._id ||
                        `${bill.table}-${bill.createdAt || bill.date}`
                      }
                    >
                      <td>Table {bill.table}</td>
                      <td>{bill.customerName || "-"}</td>
                      <td>{bill.customerMobile || "-"}</td>
                      <td>₹{bill.amount.toFixed(2)}</td>
                      <td>{bill.method}</td>
                      <td>{formatDateTime(bill.createdAt || bill.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Billing;
