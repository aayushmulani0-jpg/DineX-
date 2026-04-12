import React, { useMemo, useState, useEffect } from "react";
import { DatePicker, Button, Empty, Input, Select, Tag } from "antd";
import dayjs from "dayjs";
import "../styles/Billing.css";

const { RangePicker } = DatePicker;

const paymentOptions = ["All", "Cash", "UPI", "Card"];

const paymentTone = {
  Cash: "green",
  UPI: "blue",
  Card: "gold",
  All: "default",
};

const normalizePaymentMethod = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "upi") return "UPI";
  if (
    normalized === "card" ||
    normalized === "credit card" ||
    normalized === "debit card"
  ) {
    return "Card";
  }
  return "Cash";
};

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
  const [searchTerm, setSearchTerm] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("All");

  const normalizedBills = useMemo(
    () =>
      bills.map((bill) => ({
        ...bill,
        createdAtValue: bill.createdAt || bill.date,
        customerNameValue: bill.customerName || "Guest",
        customerMobileValue: bill.customerMobile || "-",
        methodValue: normalizePaymentMethod(bill.method || bill.paymentMethod),
      })),
    [bills],
  );

  // Step 1: Filter by date range
  const filteredBills = normalizedBills.filter((bill) => {
    if (!dateRange) return true;

    const billDate = dayjs(bill.createdAtValue);
    const [start, end] = dateRange;

    return (
      billDate.isAfter(start.startOf("day")) &&
      billDate.isBefore(end.endOf("day"))
    );
  });

  const searchedBills = filteredBills.filter((bill) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      bill.table?.toLowerCase().includes(term) ||
      bill.customerNameValue.toLowerCase().includes(term) ||
      bill.customerMobileValue.toLowerCase().includes(term) ||
      bill.methodValue.toLowerCase().includes(term);

    const matchesPayment =
      paymentFilter === "All" || bill.methodValue === paymentFilter;

    return matchesSearch && matchesPayment;
  });

  const totalFilteredRevenue = searchedBills.reduce(
    (sum, bill) => sum + bill.amount,
    0,
  );
  const billsByDate = searchedBills.reduce((acc, bill) => {
    const billDay = dayjs(bill.createdAtValue).format("YYYY-MM-DD");
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

  const totalBills = searchedBills.length;
  const averageBillValue =
    totalBills > 0 ? totalFilteredRevenue / totalBills : 0;
  const uniqueCustomers = new Set(
    searchedBills.map(
      (bill) => bill.customerMobileValue || bill.customerNameValue,
    ),
  ).size;

  const topCustomers = useMemo(() => {
    const customerMap = new Map();

    searchedBills.forEach((bill) => {
      const key =
        bill.customerMobileValue !== "-"
          ? bill.customerMobileValue
          : bill.customerNameValue;
      const current = customerMap.get(key) || {
        key,
        name: bill.customerNameValue,
        mobile: bill.customerMobileValue,
        total: 0,
        orders: 0,
      };

      current.total += bill.amount;
      current.orders += 1;
      customerMap.set(key, current);
    });

    return Array.from(customerMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [searchedBills]);

  const paymentBreakdown = useMemo(() => {
    const counts = { Cash: 0, UPI: 0, Card: 0 };
    searchedBills.forEach((bill) => {
      const key = bill.methodValue;
      if (counts[key] !== undefined) {
        counts[key] += bill.amount;
      }
    });
    return counts;
  }, [searchedBills]);

  const paymentChartData = useMemo(() => {
    const total = Object.values(paymentBreakdown).reduce(
      (sum, value) => sum + value,
      0,
    );

    return paymentOptions.slice(1).map((method) => {
      const value = paymentBreakdown[method] || 0;
      const share = total > 0 ? (value / total) * 100 : 0;

      return {
        method,
        value,
        share,
      };
    });
  }, [paymentBreakdown]);

  const recentBill = searchedBills[0] || null;

  const exportCsv = () => {
    if (searchedBills.length === 0) return;

    const header = ["Date", "Table", "Customer", "Mobile", "Amount", "Payment"];
    const rows = searchedBills.map((bill) => [
      dayjs(bill.createdAtValue).format("YYYY-MM-DD HH:mm"),
      bill.table,
      bill.customerNameValue,
      bill.customerMobileValue,
      bill.amount,
      bill.methodValue,
    ]);

    const csv = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `billing-export-${dayjs().format("YYYY-MM-DD")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    document.title = "DineX Billing | Invoice History";
    setMetaDescription(
      `Review ₹${totalFilteredRevenue.toFixed(2)} collected from ${totalBills} bills for ${rangeLabel}.`,
    );
  }, [totalFilteredRevenue, totalBills, rangeLabel]);

  return (
    <div className="main billing-main">
      <div className="billing-hero">
        <div>
          <p className="billing-eyebrow">CRM Billing</p>
          <h2>Billing and invoice history</h2>
          <p>
            Track revenue, customer spend, and payment mix with CRM-style
            billing controls.
          </p>
        </div>
        <div className="billing-hero-meta">
          <div>
            <span>Total Bills</span>
            <strong>{totalBills}</strong>
          </div>
          <div>
            <span>Unique Customers</span>
            <strong>{uniqueCustomers}</strong>
          </div>
        </div>
      </div>

      <div className="billing-kpi-grid">
        <div className="billing-kpi-card primary">
          <p>Filtered Revenue</p>
          <h3>₹{totalFilteredRevenue.toFixed(2)}</h3>
          <span>{rangeLabel}</span>
        </div>
        <div className="billing-kpi-card">
          <p>Average Invoice</p>
          <h3>₹{averageBillValue.toFixed(2)}</h3>
          <span>Across {totalBills} bills</span>
        </div>
        <div className="billing-kpi-card">
          <p>Most Recent</p>
          <h3>
            {recentBill ? formatDateTime(recentBill.createdAtValue) : "-"}
          </h3>
          <span>
            {recentBill ? `Table ${recentBill.table}` : "No bills found"}
          </span>
        </div>
        <div className="billing-kpi-card">
          <p>Top Payment Method</p>
          <h3>
            {Object.entries(paymentBreakdown).sort(
              (a, b) => b[1] - a[1],
            )[0]?.[0] || "-"}
          </h3>
          <span>By collected amount</span>
        </div>
      </div>

      {/* Filter Section */}
      <div className="billing-toolbar table-card">
        <Input.Search
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search customer, mobile, table, or payment"
          allowClear
          className="billing-search"
        />

        <RangePicker
          value={dateRange}
          onChange={(values) => setDateRange(values)}
          format="YYYY-MM-DD"
        />

        <Select
          value={paymentFilter}
          onChange={setPaymentFilter}
          className="billing-filter"
          options={paymentOptions.map((value) => ({
            label: value,
            value,
          }))}
        />

        <Button onClick={exportCsv} disabled={searchedBills.length === 0}>
          Export CSV
        </Button>

        <Button
          onClick={() => {
            setDateRange(null);
            setSearchTerm("");
            setPaymentFilter("All");
          }}
        >
          Reset Filters
        </Button>
      </div>

      <div className="billing-insights-grid">
        <div className="billing-panel">
          <h3>Payment Mix</h3>
          <div className="billing-pills">
            {paymentChartData.map((entry) => (
              <Tag key={entry.method} color={paymentTone[entry.method]}>
                {entry.method}: ₹{entry.value.toFixed(2)}
              </Tag>
            ))}
          </div>
          <div className="billing-method-chart">
            {paymentChartData.map((entry) => (
              <div key={entry.method} className="billing-method-row">
                <div className="billing-method-head">
                  <span>{entry.method}</span>
                  <strong>{entry.share.toFixed(1)}%</strong>
                </div>
                <div className="billing-method-track">
                  <div
                    className={`billing-method-fill billing-${entry.method.toLowerCase()}`}
                    style={{ width: `${entry.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="billing-panel">
          <h3>Top Customers</h3>
          <div className="billing-top-customers">
            {topCustomers.length > 0 ? (
              topCustomers.map((customer) => (
                <div key={customer.key} className="billing-customer-row">
                  <div>
                    <strong>{customer.name}</strong>
                    <span>{customer.mobile}</span>
                  </div>
                  <div>
                    <strong>₹{customer.total.toFixed(2)}</strong>
                    <span>{customer.orders} bills</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="billing-empty-inline">No customer data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div
        className="table-card billing-table-card"
        style={{ marginTop: "20px" }}
      >
        {searchedBills.length === 0 ? (
          <Empty description="No bills found for selected range" />
        ) : (
          sortedDates.map((dateKey) => (
            <div key={dateKey} style={{ marginBottom: "16px" }}>
              <h3 style={{ marginBottom: "10px" }}>
                {dayjs(dateKey).format("MMM D, YYYY")}
              </h3>
              <table className="billing-table">
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
                      <td>{bill.customerNameValue}</td>
                      <td>{bill.customerMobileValue}</td>
                      <td>₹{bill.amount.toFixed(2)}</td>
                      <td>{bill.methodValue}</td>
                      <td>{formatDateTime(bill.createdAtValue)}</td>
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
