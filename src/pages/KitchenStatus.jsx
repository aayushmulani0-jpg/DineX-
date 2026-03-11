import React, { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Topbar from "../components/layout/TopBar";
import OrderDrawer from "../components/drawer/OrderDrawer";
import "../styles/KitchenStatus.css";

const API_BASE = "http://localhost:5000/api";

const statusMeta = {
  new: { label: "New", tone: "new" },
  preparing: { label: "Preparing", tone: "preparing" },
  served: { label: "Served", tone: "served" },
};

const formatTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const hashItems = (items = []) =>
  items
    .map((item) => `${item.id}:${item.qty}`)
    .sort()
    .join("|");

const KitchenStatus = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(null);
  const [newItemsMap, setNewItemsMap] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [billingConfig, setBillingConfig] = useState({
    taxRate: 0.18,
    serviceRate: 0.1,
    serviceEnabled: false,
    discount: 0,
  });
  const prevHashRef = useRef({});
  const newItemTimersRef = useRef({});

  const markNewItems = useCallback((tableId) => {
    setNewItemsMap((prev) => ({ ...prev, [tableId]: true }));
    if (newItemTimersRef.current[tableId]) {
      clearTimeout(newItemTimersRef.current[tableId]);
    }
    newItemTimersRef.current[tableId] = setTimeout(() => {
      setNewItemsMap((prev) => ({ ...prev, [tableId]: false }));
    }, 15000);
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/orders`);
      const validOrders = res.data.filter(
        (order) => order && order.items && order.items.length > 0,
      );

      validOrders.forEach((order) => {
        const nextHash = hashItems(order.items);
        const prevHash = prevHashRef.current[order.tableId];
        if (prevHash && prevHash !== nextHash) {
          markNewItems(order.tableId);
        }
        prevHashRef.current[order.tableId] = nextHash;
      });

      setOrders(validOrders);
      setLastSync(new Date());
    } catch (error) {
      console.error("Failed to fetch kitchen orders:", error);
    } finally {
      setLoading(false);
    }
  }, [markNewItems]);

  useEffect(() => {
    fetchOrders();
    fetchMenuItems();
    fetchBillingConfig();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const fetchMenuItems = async () => {
    try {
      const res = await axios.get(`${API_BASE}/menu`);
      setMenuItems(res.data);
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
    }
  };

  const fetchBillingConfig = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/billing");
      setBillingConfig(res.data);
    } catch (error) {
      console.error("Failed to fetch billing config:", error);
    }
  };

  const updateKitchenStatus = async (tableId, nextStatus) => {
    try {
      await axios.post(`${API_BASE}/orders/${tableId}`, {
        kitchenStatus: nextStatus,
      });
      fetchOrders();
    } catch (error) {
      console.error("Failed to update kitchen status:", error);
    }
  };

  const updateItemStatus = async (tableId, itemId, nextStatus) => {
    try {
      await axios.patch(`${API_BASE}/orders/${tableId}/item/${itemId}/status`, {
        itemStatus: nextStatus,
      });
      fetchOrders();
    } catch (error) {
      console.error("Failed to update item status:", error);
    }
  };

  const handleManageOrder = (order) => {
    setSelectedOrder(order);
    setSelectedTable({ id: order.tableId, name: order.tableId });
    setDrawerOpen(true);
  };

  const generateBill = async (tableId, amount, paymentMethod) => {
    try {
      await axios.put(`${API_BASE}/orders/pay/${tableId}`, {
        amount,
        method: paymentMethod,
      });
      fetchOrders();
      setDrawerOpen(false);
    } catch (error) {
      console.error("Failed to generate bill:", error);
      throw error;
    }
  };

  const totalOrders = orders.length;
  const preparingCount = orders.filter(
    (order) => (order.kitchenStatus || "new") === "preparing",
  ).length;
  const servedCount = orders.filter(
    (order) => (order.kitchenStatus || "new") === "served",
  ).length;
  const newCount = orders.filter(
    (order) => (order.kitchenStatus || "new") === "new",
  ).length;

  return (
    <div className="main kitchen-main">
      <Topbar />

      <div className="kitchen-hero">
        <div>
          <p className="kitchen-eyebrow">Kitchen Status</p>
          <h2>Live orders by table</h2>
          <p className="kitchen-subtitle">
            Accept orders, track preparation, and mark served in real time.
          </p>
        </div>
        <div className="kitchen-sync">
          <span className="kitchen-sync-dot" />
          <span>Last sync {lastSync ? formatTime(lastSync) : "--:--"}</span>
        </div>
      </div>

      <div className="kitchen-stats">
        <div className="kitchen-stat">
          <p>Total Orders</p>
          <h3>{totalOrders}</h3>
        </div>
        <div className="kitchen-stat">
          <p>New</p>
          <h3>{newCount}</h3>
        </div>
        <div className="kitchen-stat">
          <p>Preparing</p>
          <h3>{preparingCount}</h3>
        </div>
        <div className="kitchen-stat">
          <p>Served</p>
          <h3>{servedCount}</h3>
        </div>
      </div>

      <div className="kitchen-card-grid">
        {loading && orders.length === 0 ? (
          <div className="kitchen-empty">Loading kitchen orders...</div>
        ) : orders.length === 0 ? (
          <div className="kitchen-empty">No active orders yet.</div>
        ) : (
          orders.map((order) => {
            const total = order.items.reduce(
              (sum, item) => sum + item.price * item.qty,
              0,
            );
            const statusKey = order.kitchenStatus || "new";
            const statusInfo = statusMeta[statusKey] || statusMeta.new;
            const hasNewItems = newItemsMap[order.tableId];

            return (
              <div key={order.tableId} className="kitchen-card">
                <div className="kitchen-card-header">
                  <div>
                    <h3>{order.tableId}</h3>
                    <p>Updated at {formatTime(order.updatedAt)}</p>
                  </div>
                  <span className={`kitchen-status ${statusInfo.tone}`}>
                    {statusInfo.label}
                  </span>
                </div>

                <div className="kitchen-card-body">
                  <div className="kitchen-meta">
                    <div>
                      <span>Customer</span>
                      <strong>{order.customerName || "Guest"}</strong>
                    </div>
                    <div>
                      <span>Items</span>
                      <strong>{order.items.length}</strong>
                    </div>
                    <div>
                      <span>Total</span>
                      <strong>₹{total.toFixed(2)}</strong>
                    </div>
                  </div>

                  {hasNewItems && (
                    <div className="kitchen-new-items">New items added</div>
                  )}

                  <ul className="kitchen-item-list">
                    {order.items.map((item) => {
                      const itemStatusKey = item.itemStatus || "new";
                      const itemStatusInfo =
                        statusMeta[itemStatusKey] || statusMeta.new;
                      return (
                        <li
                          key={`${order.tableId}-${item.id}`}
                          className="kitchen-item-row"
                        >
                          <div className="kitchen-item-details">
                            <span className="kitchen-item-name">
                              {item.name}
                            </span>
                            <span className="kitchen-item-qty">
                              x{item.qty}
                            </span>
                            <span
                              className={`kitchen-item-status ${itemStatusInfo.tone}`}
                            >
                              {itemStatusInfo.label}
                            </span>
                          </div>
                          <div className="kitchen-item-actions">
                            {itemStatusKey === "new" && (
                              <button
                                className="kitchen-item-btn accept"
                                onClick={() =>
                                  updateItemStatus(
                                    order.tableId,
                                    item.id,
                                    "preparing",
                                  )
                                }
                                title="Accept Item"
                              >
                                Accept
                              </button>
                            )}
                            {itemStatusKey === "preparing" && (
                              <button
                                className="kitchen-item-btn served"
                                onClick={() =>
                                  updateItemStatus(
                                    order.tableId,
                                    item.id,
                                    "served",
                                  )
                                }
                                title="Mark Served"
                              >
                                Served
                              </button>
                            )}
                            {itemStatusKey === "served" && (
                              <button
                                className="kitchen-item-btn done"
                                disabled
                              >
                                ✓
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>

                  <button
                    className="kitchen-manage-btn"
                    onClick={() => handleManageOrder(order)}
                  >
                    Manage Order
                  </button>
                </div>

                <div className="kitchen-card-actions">
                  {statusKey === "new" && (
                    <button
                      className="kitchen-btn primary"
                      onClick={() =>
                        updateKitchenStatus(order.tableId, "preparing")
                      }
                    >
                      Accept Order
                    </button>
                  )}
                  {statusKey === "preparing" && (
                    <button
                      className="kitchen-btn success"
                      onClick={() =>
                        updateKitchenStatus(order.tableId, "served")
                      }
                    >
                      Served
                    </button>
                  )}
                  {statusKey === "served" && (
                    <button className="kitchen-btn ghost" disabled>
                      Served
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <OrderDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedOrder(null);
          setSelectedTable(null);
        }}
        table={selectedTable}
        order={selectedOrder}
        generateBill={generateBill}
        billingConfig={billingConfig}
        setBillingConfig={setBillingConfig}
        menuItems={menuItems}
      />
    </div>
  );
};

export default KitchenStatus;
