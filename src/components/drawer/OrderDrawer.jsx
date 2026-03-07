import React, { useState, useEffect } from "react";
import {
  Modal,
  message,
  Popconfirm,
  InputNumber,
  Switch,
  Divider,
  Button,
  Space,
  Tag,
} from "antd";
import axios from "axios";
import "../../styles/OrderDrawer.css";
import {
  CreditCardOutlined,
  ShoppingOutlined,
  CalculatorOutlined,
  DeleteOutlined,
  PlusOutlined,
  MinusOutlined,
} from "@ant-design/icons";

const OrderDrawer = ({
  open,
  onClose,
  table,
  order,
  generateBill,
  billingConfig,
  setBillingConfig,
  menuItems = [],
}) => {
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const paymentOptions = ["Cash", "UPI", "Card"];

  useEffect(() => {
    if (order?.items) {
      setCart(order.items);
    } else {
      setCart([]);
    }
  }, [order]);

  useEffect(() => {
    if (order?.paymentMethod) {
      setPaymentMethod(order.paymentMethod);
    } else {
      setPaymentMethod(null);
    }
  }, [order?.paymentMethod]);

  /* ================= ADMIN ORDER ACTIONS ================= */
  const handleAddItem = async (item) => {
    if (!table) return;

    try {
      const updatedCart = [...cart];
      // Normalize item ID (handle both _id from menu and id from cart)
      const itemId = item.id || item._id;
      const existing = updatedCart.find((i) => i.id === itemId);

      if (existing) {
        existing.qty += 1;
      } else {
        updatedCart.push({
          id: itemId,
          name: item.name,
          price: item.price,
          img: item.img,
          category: item.category,
          qty: 1,
          itemStatus: "new", // New items start with "new" status
        });
      }

      // ADMIN CAN MODIFY EVEN CONFIRMED ORDERS
      await axios.post(`http://localhost:5000/api/orders/${table.id}`, {
        items: updatedCart,
        status: order?.status || "active",
        paymentMethod: order?.paymentMethod || paymentMethod,
      });

      setCart(updatedCart);
      message.success(`${item.name} added`);
    } catch (error) {
      message.error("Failed to add item");
    }
  };

  const handleDecreaseItem = async (id) => {
    if (!table) return;

    try {
      const updatedCart = cart
        .map((item) => (item.id === id ? { ...item, qty: item.qty - 1 } : item))
        .filter((item) => item.qty > 0);

      await axios.post(`http://localhost:5000/api/orders/${table.id}`, {
        items: updatedCart,
        status: order?.status || "active",
        paymentMethod: order?.paymentMethod || paymentMethod,
      });

      setCart(updatedCart);
    } catch (error) {
      message.error("Failed to update quantity");
    }
  };

  const handleRemoveItem = async (id) => {
    if (!table) return;

    try {
      const updatedCart = cart.filter((item) => item.id !== id);

      await axios.post(`http://localhost:5000/api/orders/${table.id}`, {
        items: updatedCart,
        status: order?.status || "active",
        paymentMethod: order?.paymentMethod || paymentMethod,
      });

      setCart(updatedCart);
      message.success("Item removed");
    } catch (error) {
      message.error("Failed to remove item");
    }
  };

  const handleClearAll = async () => {
    if (!table) return;

    // Don't allow admin to clear confirmed orders - only bill generation should clear
    if (order?.status === "confirmed") {
      message.warning("Cannot clear confirmed order. Generate bill instead.");
      return;
    }

    try {
      await axios.post(`http://localhost:5000/api/orders/${table.id}`, {
        items: [],
        status: "draft",
      });

      setCart([]);
      message.success("All items cleared");
    } catch (error) {
      message.error("Failed to clear items");
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const serviceCharge = billingConfig?.serviceEnabled
    ? subtotal * (billingConfig.serviceRate || 0.1)
    : 0;

  const discountedAmount = Math.min(billingConfig?.discount || 0, subtotal);

  const tax =
    (subtotal - discountedAmount + serviceCharge) *
    (billingConfig?.taxRate || 0.18);

  const total = subtotal - discountedAmount + serviceCharge + tax;

  const handleGenerateBill = async () => {
    const finalPaymentMethod = paymentMethod || order?.paymentMethod || "Cash";

    if (cart.length === 0) {
      message.warning("No items in order");
      return;
    }

    try {
      setLoading(true);
      await generateBill(table.id, total, finalPaymentMethod);

      setCart([]);
      setPaymentMethod(null);
      onClose();
    } catch (error) {
      message.error("Failed to generate bill");
    } finally {
      setLoading(false);
    }
  };

  const updateDiscount = async (value) => {
    try {
      const updatedConfig = { ...billingConfig, discount: value || 0 };
      await axios.put("http://localhost:5000/api/billing", updatedConfig);
      setBillingConfig(updatedConfig);
    } catch (error) {
      message.error("Failed to update discount");
    }
  };

  const toggleServiceCharge = async (enabled) => {
    try {
      const updatedConfig = { ...billingConfig, serviceEnabled: enabled };
      await axios.put("http://localhost:5000/api/billing", updatedConfig);
      setBillingConfig(updatedConfig);
    } catch (error) {
      message.error("Failed to update service charge");
    }
  };

  const handleClose = () => {
    if (billingConfig?.discount > 0) {
      updateDiscount(0);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={540}
      className="order-modal"
      title={null}
    >
      <div className="order-header">
        <div>
          <h3>
            <ShoppingOutlined /> {table?.name} - Order Management
          </h3>
          <div className="order-status-info">
            <span className="order-table-info">
              {cart.length} items •
              <Tag
                color={order?.status === "confirmed" ? "green" : "blue"}
                className="order-status-tag"
              >
                {order?.status?.toUpperCase() || "ACTIVE"}
              </Tag>
            </span>
            {order?.paymentMethod && (
              <span className="payment-info">
                <CreditCardOutlined style={{ marginRight: "4px" }} />
                {order.paymentMethod}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="order-items">
        {cart.length === 0 ? (
          <div className="empty-cart">
            No items in order. Add items from menu below.
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.id} className="order-item">
              <div className="item-info">
                <div className="item-name">{item.name}</div>
                <div className="item-sub">
                  ₹{item.price} × {item.qty} = ₹
                  {(item.price * item.qty).toFixed(2)}
                </div>
              </div>

              <Space>
                <Button
                  size="small"
                  onClick={() => handleDecreaseItem(item.id)}
                >
                  <MinusOutlined />
                </Button>

                <span className="item-qty-display">{item.qty}</span>

                <Button
                  size="small"
                  type="primary"
                  onClick={() => handleAddItem(item)}
                >
                  <PlusOutlined />
                </Button>

                <Popconfirm
                  title="Remove item from order?"
                  onConfirm={() => handleRemoveItem(item.id)}
                >
                  <Button size="small" danger>
                    <DeleteOutlined />
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          ))
        )}
      </div>

      {menuItems && menuItems.length > 0 && (
        <>
          <Button
            type="dashed"
            block
            onClick={() => setShowMenu(!showMenu)}
            style={{ marginTop: "12px" }}
            icon={<PlusOutlined />}
          >
            {showMenu ? "Hide Menu" : "Add Items from Menu"}
          </Button>

          {showMenu && (
            <div className="menu-items-section">
              <div className="menu-items-grid">
                {menuItems.map((menuItem) => (
                  <div key={menuItem._id} className="menu-item-card">
                    <div className="menu-item-info">
                      <div className="menu-item-name">{menuItem.name}</div>
                      <div className="menu-item-price">₹{menuItem.price}</div>
                    </div>
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => handleAddItem(menuItem)}
                      icon={<PlusOutlined />}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {cart.length > 0 && order?.status !== "confirmed" && (
        <div className="clear-all-section">
          <Button
            type="dashed"
            danger
            block
            onClick={handleClearAll}
            icon={<DeleteOutlined />}
          >
            Clear All Items
          </Button>
        </div>
      )}

      <Divider />

      <div className="order-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>

        <div className="summary-row">
          <span>Discount (Optional)</span>
          <InputNumber
            min={0}
            max={subtotal}
            value={billingConfig?.discount || 0}
            onChange={updateDiscount}
            formatter={(value) => `₹ ${value}`}
            parser={(value) => value.replace("₹ ", "")}
            style={{ width: 120 }}
            placeholder="Add discount"
          />
        </div>

        <div className="summary-row">
          <span>
            Service Charge ({(billingConfig?.serviceRate || 0.1) * 100}%)
          </span>
          <Switch
            checked={billingConfig?.serviceEnabled}
            onChange={toggleServiceCharge}
          />
        </div>

        <div className="summary-row">
          <span>Tax ({(billingConfig?.taxRate || 0.18) * 100}%)</span>
          <span>₹{tax.toFixed(2)}</span>
        </div>

        <div className="summary-total">
          <span>Total</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
      </div>

      <Divider />

      {/* Payment Selection */}
      <div className="payment-section">
        <div className="payment-label">
          <CreditCardOutlined /> Payment Method
        </div>
        <div className="payment-segmented">
          {paymentOptions.map((option) => (
            <button
              key={option}
              className={`payment-segment ${paymentMethod === option ? "active" : ""}`}
              onClick={() => setPaymentMethod(option)}
            >
              {option}
              {order?.paymentMethod === option && " (Customer)"}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="primary"
        block
        size="large"
        disabled={cart.length === 0}
        onClick={handleGenerateBill}
        className="generate-btn"
        loading={loading}
        icon={<CalculatorOutlined />}
      >
        Generate Bill & Clear Table
      </Button>
    </Modal>
  );
};

export default OrderDrawer;
