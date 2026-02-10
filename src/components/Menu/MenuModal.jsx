import React, { useState, useMemo, useEffect } from "react";
import { Modal, Button, message, Input, Tag } from "antd";
import { PlusOutlined, MinusOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import "../../styles/MenuModal.css";

const MenuModal = ({ open, onClose, table, menuItems = [] }) => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentOrder, setCurrentOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  /* ================= FETCH CURRENT ORDER ================= */
  const fetchOrder = async () => {
    if (!table?.id) return;

    try {
      setRefreshing(true);
      const res = await axios.get(
        `http://localhost:5000/api/orders/${table.id}`,
      );
      setCurrentOrder(res.data);
      setOrderItems(res.data.items || []);
    } catch (error) {
      console.error("Failed to fetch order:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (open && table?.id) {
      fetchOrder();
    }
  }, [open, table]);

  /* ================= FILTER MENU ================= */
  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.dsc.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategory, searchTerm]);

  const categories = useMemo(() => {
    const unique = new Set(menuItems.map((item) => item.category || "Other"));
    return ["All", ...unique];
  }, [menuItems]);

  /* ================= ADMIN ORDER ACTIONS ================= */
  const handleAddItem = async (item) => {
    if (!table) return;

    try {
      const updatedItems = [...orderItems];
      const existing = updatedItems.find((i) => i.id === item.id);

      if (existing) {
        existing.qty += 1;
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

      // ADMIN CAN MODIFY EVEN CONFIRMED ORDERS
      await axios.post(`http://localhost:5000/api/orders/${table.id}`, {
        items: updatedItems,
        status: currentOrder?.status || "active", // Keep current status
        paymentMethod: currentOrder?.paymentMethod, // Keep payment method
      });

      setOrderItems(updatedItems);
      message.success(`${item.name} added to order`);
      fetchOrder(); // Refresh to sync with database
    } catch (error) {
      message.error("Failed to add item");
      console.error(error);
    }
  };

  const handleDecreaseItem = async (itemId) => {
    if (!table) return;

    try {
      const updatedItems = orderItems
        .map((item) =>
          item.id === itemId ? { ...item, qty: item.qty - 1 } : item,
        )
        .filter((item) => item.qty > 0);

      await axios.post(`http://localhost:5000/api/orders/${table.id}`, {
        items: updatedItems,
        status: currentOrder?.status || "active",
        paymentMethod: currentOrder?.paymentMethod,
      });

      setOrderItems(updatedItems);
      fetchOrder(); // Refresh to sync with database
    } catch (error) {
      message.error("Failed to update quantity");
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!table) return;

    try {
      const updatedItems = orderItems.filter((item) => item.id !== itemId);

      await axios.post(`http://localhost:5000/api/orders/${table.id}`, {
        items: updatedItems,
        status: currentOrder?.status || "active",
        paymentMethod: currentOrder?.paymentMethod,
      });

      setOrderItems(updatedItems);
      message.success("Item removed from order");
      fetchOrder(); // Refresh to sync with database
    } catch (error) {
      message.error("Failed to remove item");
    }
  };

  const handleClearAll = async () => {
    if (!table) return;

    // Don't allow admin to clear confirmed orders - only bill generation should clear
    if (currentOrder?.status === "confirmed") {
      message.warning("Cannot clear confirmed order. Generate bill instead.");
      return;
    }

    try {
      await axios.post(`http://localhost:5000/api/orders/${table.id}`, {
        items: [],
        status: "draft",
      });

      setOrderItems([]);
      message.success("All items cleared");
      fetchOrder(); // Refresh to sync with database
    } catch (error) {
      message.error("Failed to clear items");
    }
  };

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearchTerm("");
      setSelectedCategory("All");
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="100%"
      className="menu-fullscreen-modal"
      closable={false}
    >
      <div className="menu-fullscreen-container">
        <div className="menu-header">
          <div>
            <h2>Manage Order - {table?.name || "Select Table"}</h2>
            <div className="order-status">
              <span>Status: </span>
              <Tag
                color={currentOrder?.status === "confirmed" ? "green" : "blue"}
              >
                {currentOrder?.status?.toUpperCase() || "NO ORDER"}
              </Tag>
              {currentOrder?.paymentMethod && (
                <>
                  <span className="payment-label">Payment: </span>
                  <Tag className="payment-tag" color="orange">
                    {currentOrder.paymentMethod}
                  </Tag>
                </>
              )}
            </div>
          </div>

          <div className="menu-header-controls">
            <Input.Search
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="menu-search"
              allowClear
            />
            <Button onClick={fetchOrder} loading={refreshing}>
              Refresh
            </Button>
            <Button onClick={onClose}>Close</Button>
          </div>
        </div>

        {/* Current Order Summary */}
        <div className="current-order-summary">
          <div className="summary-header">
            <h4>Current Order ({orderItems.length} items)</h4>
            <div className="summary-actions">
              <Button
                size="small"
                danger
                onClick={handleClearAll}
                disabled={
                  orderItems.length === 0 ||
                  currentOrder?.status === "confirmed"
                }
              >
                Clear All
              </Button>
            </div>
          </div>

          {orderItems.length > 0 ? (
            <div className="order-items-preview">
              {orderItems.map((item) => (
                <div key={item.id} className="order-preview-item">
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-sub">
                      ₹{item.price} × {item.qty}
                    </span>
                  </div>
                  <div className="item-actions">
                    <Button
                      size="small"
                      icon={<MinusOutlined />}
                      onClick={() => handleDecreaseItem(item.id)}
                    />
                    <span className="item-qty">{item.qty}</span>
                    <Button
                      size="small"
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => handleAddItem(item)}
                    />
                    <Button
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveItem(item.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-order">
              No items in order. Add items from menu below.
            </div>
          )}
        </div>

        {/* Category Selector */}
        <div className="menu-modal-segments">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`menu-modal-segment ${
                selectedCategory === cat ? "active" : ""
              }`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="menu-text-grid">
          {filteredMenu.map((item) => (
            <div key={item.id} className="menu-text-card">
              <div className="card-header">
                <h4 className="card-title">{item.name}</h4>
                <div className="card-price">₹{item.price}</div>
              </div>

              <p className="card-desc">{item.dsc}</p>

              <div className="card-footer">
                <span className="card-category">{item.category}</span>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleAddItem(item)}
                >
                  Add
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredMenu.length === 0 && (
          <div className="no-items-found">
            No items found for "{searchTerm}"
          </div>
        )}
      </div>
    </Modal>
  );
};

export default React.memo(MenuModal);
