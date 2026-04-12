import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useParams } from "react-router-dom";
import { Row, Col, Typography, Tag, message, Modal, Input } from "antd";
import {
  ShoppingCartOutlined,
  CloseOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  MinusOutlined,
  ArrowRightOutlined,
} from "@ant-design/icons";
import axios from "axios";
import "../styles/MenuPage.css";

const { Title, Text } = Typography;

export default function MenuPage({
  menuItems = [],
  billingConfig,
  loading = false,
}) {
  const { tableId } = useParams();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showMobileSummary, setShowMobileSummary] = useState(false);
  const [showBillDetails, setShowBillDetails] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [menuData, setMenuData] = useState(menuItems);
  const [orderStatus, setOrderStatus] = useState("draft");
  const [customerOrderId, setCustomerOrderId] = useState(null);
  const [showAddMoreSection, setShowAddMoreSection] = useState(false);
  const [additionalItems, setAdditionalItems] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerMobile, setCustomerMobile] = useState("");
  const [customerInfoOpen, setCustomerInfoOpen] = useState(false);
  const [savingCustomerInfo, setSavingCustomerInfo] = useState(false);
  const [isTableActive, setIsTableActive] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();
  const orderStatusRef = useRef(orderStatus);
  const customerNameRef = useRef(customerName);
  const customerMobileRef = useRef(customerMobile);
  const customerInfoOpenRef = useRef(customerInfoOpen);
  const customerOrderIdRef = useRef(customerOrderId);
  const menuDataRef = useRef(menuData);

  const paymentOptions = ["Cash", "UPI", "Card"];
  const normalizedTableId = tableId ? `T${tableId}` : null;

  useEffect(() => {
    orderStatusRef.current = orderStatus;
  }, [orderStatus]);

  useEffect(() => {
    customerNameRef.current = customerName;
  }, [customerName]);

  useEffect(() => {
    customerMobileRef.current = customerMobile;
  }, [customerMobile]);

  useEffect(() => {
    customerInfoOpenRef.current = customerInfoOpen;
  }, [customerInfoOpen]);

  useEffect(() => {
    customerOrderIdRef.current = customerOrderId;
  }, [customerOrderId]);

  useEffect(() => {
    menuDataRef.current = menuData;
  }, [menuData]);

  /* ================= SYNC MENU FROM SERVER ================= */
  useEffect(() => {
    const syncMenu = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/sync/menu");
        const nextMenu = Array.isArray(res.data) ? res.data : [];
        const previousMenu = menuDataRef.current;

        if (
          previousMenu.length !== nextMenu.length ||
          previousMenu.some((item, index) => item.id !== nextMenu[index]?.id)
        ) {
          setMenuData(nextMenu);
        }
      } catch (err) {
        console.error("Failed to sync menu", err);
      }
    };

    syncMenu();
    const interval = setInterval(syncMenu, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ================= REAL-TIME ORDER SYNC ================= */
  const fetchOrder = useCallback(async () => {
    if (!normalizedTableId) return;

    try {
      const res = await axios.get(
        `http://localhost:5000/api/orders/sync/${normalizedTableId}`,
      );

      const orderData = res.data;
      const newStatus = orderData.status || "draft";
      const previousStatus = orderStatusRef.current;
      const previousCustomerName = customerNameRef.current;
      const previousCustomerMobile = customerMobileRef.current;
      const previousCustomerInfoOpen = customerInfoOpenRef.current;
      const previousCustomerOrderId = customerOrderIdRef.current;

      setOrderItems(orderData.items || []);

      // Only reset customer info when transitioning FROM active/confirmed TO draft
      // Don't reset if already in draft state (user might be typing)
      if (newStatus === "draft" && previousStatus !== "draft") {
        // Order was just cleared/billed - reset everything
        setCustomerName("");
        setCustomerMobile("");
        setPaymentMethod(null);
        setCustomerOrderId(null);
        setShowAddMoreSection(false);
        setAdditionalItems([]);
        setCustomerInfoOpen(true);
        setIsTableActive(false);
      } else if (newStatus === "draft" && previousStatus === "draft") {
        // Already in draft state - check if we need to show modal (initial load or user typing)
        // Only open modal if customer info is empty and modal is not already open
        if (
          !previousCustomerName &&
          !previousCustomerMobile &&
          !previousCustomerInfoOpen
        ) {
          setCustomerInfoOpen(true);
        }
      } else if (newStatus === "active" || newStatus === "confirmed") {
        // Active or confirmed order - load customer info only if not already set
        if (orderData.customerName && !previousCustomerName) {
          setCustomerName(orderData.customerName);
        }
        if (orderData.customerMobile && !previousCustomerMobile) {
          setCustomerMobile(orderData.customerMobile);
        }
        if (orderData.paymentMethod) {
          setPaymentMethod(orderData.paymentMethod);
        }

        setCustomerInfoOpen(false);
        setIsTableActive(true);

        // Generate order ID if confirmed
        if (orderData.status === "confirmed" && !previousCustomerOrderId) {
          setCustomerOrderId(
            `${normalizedTableId}-${Date.now().toString().slice(-6)}`,
          );
        }

        // Show add more section if order is confirmed
        if (orderData.status === "confirmed") {
          setShowAddMoreSection(true);
        }
      }

      setOrderStatus(newStatus);
    } catch (error) {
      console.error("Failed to fetch order:", error);
    }
  }, [
    normalizedTableId,
    customerOrderId,
    orderStatus,
    customerName,
    customerMobile,
    customerInfoOpen,
  ]);

  useEffect(() => {
    if (!normalizedTableId) return;

    fetchOrder();
    const syncInterval = setInterval(fetchOrder, 2000);

    return () => clearInterval(syncInterval);
  }, [normalizedTableId, fetchOrder]);

  const isCustomerInfoValid =
    customerName.trim().length > 0 && /^\d{10}$/.test(customerMobile.trim());

  const customerPayload =
    customerName.trim() || customerMobile.trim()
      ? {
          customerName: customerName.trim(),
          customerMobile: customerMobile.trim(),
        }
      : {};

  const handleSaveCustomerInfo = async () => {
    if (!normalizedTableId) return;
    if (!isCustomerInfoValid) {
      messageApi.warning("Enter a valid name and mobile number");
      return;
    }

    try {
      setSavingCustomerInfo(true);
      await axios.post(
        `http://localhost:5000/api/orders/${normalizedTableId}`,
        {
          status: "active",
          ...customerPayload,
        },
      );

      setCustomerInfoOpen(false);
      messageApi.success("Thanks! You can browse the menu now.");
    } catch (error) {
      messageApi.error("Failed to save customer info");
    } finally {
      setSavingCustomerInfo(false);
    }
  };

  /* ================= CATEGORY FILTER ================= */
  const categories = useMemo(() => {
    const unique = new Set(menuData.map((item) => item.category));
    return ["All", ...unique];
  }, [menuData]);

  const filteredItems = useMemo(
    () =>
      selectedCategory === "All"
        ? menuData
        : menuData.filter((item) => item.category === selectedCategory),
    [menuData, selectedCategory],
  );

  /* ================= BILLING CALCULATION ================= */
  const allItems = useMemo(
    () => [...orderItems, ...additionalItems],
    [orderItems, additionalItems],
  );

  const subtotal = useMemo(
    () => allItems.reduce((sum, item) => sum + item.price * item.qty, 0),
    [allItems],
  );

  const serviceCharge = useMemo(
    () =>
      billingConfig?.serviceEnabled
        ? subtotal * (billingConfig.serviceRate || 0.1)
        : 0,
    [billingConfig, subtotal],
  );

  const discountedAmount = useMemo(
    () => Math.min(billingConfig?.discount || 0, subtotal),
    [billingConfig, subtotal],
  );

  const tax = useMemo(
    () =>
      (subtotal - discountedAmount + serviceCharge) *
      (billingConfig?.taxRate || 0.18),
    [subtotal, discountedAmount, serviceCharge, billingConfig],
  );

  const total = useMemo(
    () => subtotal - discountedAmount + serviceCharge + tax,
    [subtotal, discountedAmount, serviceCharge, tax],
  );

  /* ================= ORDER ACTIONS ================= */
  const handleAdd = async (item) => {
    try {
      const isPostConfirmation = orderStatusRef.current === "confirmed";

      const targetItems = isPostConfirmation ? additionalItems : orderItems;

      const found = targetItems.find((o) => o.id === item.id);

      let updatedItems;
      if (found) {
        updatedItems = targetItems.map((o) =>
          o.id === item.id ? { ...o, qty: o.qty + 1 } : o,
        );
      } else {
        updatedItems = [
          ...targetItems,
          {
            id: item.id,
            name: item.name,
            price: item.price,
            img: item.img,
            category: item.category,
            qty: 1,
          },
        ];
      }

      if (isPostConfirmation) {
        // For post-confirmation items, store locally only
        setAdditionalItems(updatedItems);
        messageApi.success(`${item.name} added for later confirmation`);
      } else {
        // For pre-confirmation items, save to server
        await axios.post(
          `http://localhost:5000/api/orders/${normalizedTableId}`,
          {
            items: updatedItems,
            status: "active",
            ...customerPayload,
          },
        );
        messageApi.success(`${item.name} added to order`);
        await fetchOrder();
      }
    } catch (error) {
      messageApi.error("Failed to add item");
      console.error(error);
    }
  };

  const decreaseItem = async (item, isAdditional = false) => {
    try {
      if (isAdditional) {
        const updated = additionalItems
          .map((o) => (o.id === item.id ? { ...o, qty: o.qty - 1 } : o))
          .filter((o) => o.qty > 0);
        setAdditionalItems(updated);
      } else {
        const updated = orderItems
          .map((o) => (o.id === item.id ? { ...o, qty: o.qty - 1 } : o))
          .filter((o) => o.qty > 0);

        await axios.post(
          `http://localhost:5000/api/orders/${normalizedTableId}`,
          {
            items: updated,
            status: updated.length > 0 ? "active" : "draft",
            ...customerPayload,
          },
        );

        setOrderItems(updated);
      }
      messageApi.success("Item quantity decreased");
    } catch (error) {
      messageApi.error("Failed to update quantity");
    }
  };

  const removeItem = async (item, isAdditional = false) => {
    try {
      if (isAdditional) {
        const updated = additionalItems.filter((o) => o.id !== item.id);
        setAdditionalItems(updated);
      } else {
        const updated = orderItems.filter((o) => o.id !== item.id);

        await axios.post(
          `http://localhost:5000/api/orders/${normalizedTableId}`,
          {
            items: updated,
            status: updated.length > 0 ? "active" : "draft",
            ...customerPayload,
          },
        );

        setOrderItems(updated);
      }
      messageApi.success("Item removed from order");
    } catch (error) {
      messageApi.error("Failed to remove item");
    }
  };

  const handleSetPaymentMethod = async () => {
    if (!paymentMethod) {
      messageApi.warning("Please select payment method");
      return;
    }

    try {
      const res = await axios.put(
        `http://localhost:5000/api/orders/confirm/${normalizedTableId}`,
        { paymentMethod, ...customerPayload },
      );

      if (res.data && res.data._id) {
        setOrderStatus("confirmed");
        setCustomerOrderId(
          `${normalizedTableId}-${Date.now().toString().slice(-6)}`,
        );
        setShowAddMoreSection(true);
        messageApi.success(
          `Payment method set to ${paymentMethod}. Order confirmed!`,
        );
      }
    } catch (error) {
      if (error.response?.status === 404) {
        messageApi.error("No order found. Please add items first.");
      } else {
        messageApi.error("Failed to set payment method");
      }
    }
  };

  const handleConfirmAdditionalItems = async () => {
    if (additionalItems.length === 0) {
      messageApi.warning("No additional items to confirm");
      return;
    }

    try {
      // Combine existing order items with additional items
      const combinedItems = [...orderItems];

      additionalItems.forEach((addItem) => {
        const existingIndex = combinedItems.findIndex(
          (item) => item.id === addItem.id,
        );
        if (existingIndex > -1) {
          combinedItems[existingIndex].qty += addItem.qty;
        } else {
          combinedItems.push(addItem);
        }
      });

      await axios.post(
        `http://localhost:5000/api/orders/${normalizedTableId}`,
        {
          items: combinedItems,
          status: "confirmed",
          paymentMethod: paymentMethod,
          ...customerPayload,
        },
      );

      messageApi.success(
        "Additional items confirmed! Admin has been notified.",
      );
      setAdditionalItems([]);
      await fetchOrder();
    } catch (error) {
      messageApi.error("Failed to confirm additional items");
    }
  };

  const handleClearOrder = async () => {
    try {
      // Only clear the customer's local/confirmed order
      if (orderStatus === "confirmed") {
        // For confirmed orders, clear additional items but keep the main order
        setAdditionalItems([]);
        messageApi.success("Additional items cleared");
      } else {
        // For draft/active orders, clear everything
        await axios.post(
          `http://localhost:5000/api/orders/${normalizedTableId}`,
          {
            items: [],
            status: "draft",
            ...customerPayload,
          },
        );

        setOrderItems([]);
        setPaymentMethod(null);
        setOrderStatus("draft");
        setCustomerOrderId(null);
        setAdditionalItems([]);
        setShowAddMoreSection(false);
        messageApi.success("Order cleared successfully");
      }
    } catch (error) {
      messageApi.error("Failed to clear order");
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading Menu...</p>
      </div>
    );
  }

  return (
    <>
      {contextHolder}

      <Modal
        open={customerInfoOpen}
        title="Welcome"
        closable={false}
        maskClosable={false}
        keyboard={false}
        onOk={handleSaveCustomerInfo}
        okText="Continue"
        okButtonProps={{
          disabled: !isCustomerInfoValid,
          loading: savingCustomerInfo,
        }}
        cancelButtonProps={{ style: { display: "none" } }}
      >
        <p>Enter your name and mobile number to view the menu.</p>
        <div style={{ display: "grid", gap: "12px" }}>
          <Input
            placeholder="Your name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            autoFocus
          />
          <Input
            placeholder="Mobile number"
            value={customerMobile}
            onChange={(e) =>
              setCustomerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            inputMode="numeric"
            maxLength={10}
          />
        </div>
      </Modal>

      <div className="menu-layout">
        {/* LEFT SIDE - MENU */}
        <div className="menu-left">
          <div className="menu-header">
            <div>
              <div className="logo">NeuroDineX</div>
              <center className="table-badge">
                Table: {tableId}
                {orderStatus === "confirmed" && (
                  <span className="confirmed-badge">
                    <CheckCircleOutlined /> Confirmed
                  </span>
                )}
              </center>
            </div>

            {(orderItems.length > 0 || orderStatus === "confirmed") && (
              <button
                className="mobile-order-btn"
                onClick={() => setShowMobileSummary(true)}
              >
                <ShoppingCartOutlined />
                {orderItems.length} {orderStatus === "confirmed" && "✓"}
              </button>
            )}
          </div>

          {/* CATEGORY SELECTOR */}
          <div className="segmented-wrapper">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`segmented-item ${selectedCategory === cat ? "active" : ""}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* FOOD GRID */}
          <Row gutter={[16, 16]}>
            {filteredItems.map((item) => (
              <Col key={item.id} xs={12} sm={12} md={12} lg={8}>
                <div className="food-card">
                  <div className="food-image-wrapper">
                    <img
                      src={item.img}
                      alt={item.name}
                      className="food-image"
                      onError={(e) => {
                        e.target.src =
                          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c";
                      }}
                    />
                    <div className="image-gradient" />
                    <div className="image-overlay-text">₹{item.price}</div>
                  </div>

                  <div className="food-content">
                    <div className="food-title">{item.name}</div>

                    <div className="food-meta food-meta-flex">
                      <div className="food-desc">{item.dsc}</div>
                      <div className="food-rating-right">
                        <span className="rating-tag">{item.rate} ★</span>
                      </div>
                    </div>

                    <button
                      className="add-to-btn"
                      onClick={() => handleAdd(item)}
                    >
                      <PlusOutlined />
                      {showAddMoreSection ? "Add More Items" : "Add to Order"}
                    </button>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </div>

        {/* RIGHT SIDE - ORDER SUMMARY */}
        <div className={`menu-right ${showMobileSummary ? "show-mobile" : ""}`}>
          <div className="order-panel">
            {/* Mobile close button */}
            {showMobileSummary && (
              <div className="order-panel-header">
                <div className="section-title">Order Summary</div>
                <button
                  className="mobile-close-btn"
                  onClick={() => setShowMobileSummary(false)}
                >
                  <CloseOutlined />
                </button>
              </div>
            )}

            <div className="order-panel-body">
              {orderItems.length === 0 && additionalItems.length === 0 ? (
                <div className="empty-cart">
                  <Text type="secondary">No items added yet.</Text>
                  <br />
                  <Text type="secondary">Browse menu and add items!</Text>
                </div>
              ) : (
                <>
                  {/* MAIN ORDER ITEMS */}
                  <div className="order-section">
                    <div className="section-title">
                      {orderStatus === "confirmed"
                        ? "Current Order"
                        : "Your Order"}
                    </div>

                    <div className="order-items-list">
                      {orderItems.map((item) => (
                        <div key={item.id} className="order-item-row">
                          <div className="order-item-info">
                            <div className="order-item-name">{item.name}</div>
                            <div className="order-controls">
                              <button
                                className="stepper-btn"
                                onClick={() => decreaseItem(item, false)}
                              >
                                <MinusOutlined />
                              </button>
                              <span className="stepper-qty">{item.qty}</span>
                              <button
                                className="stepper-btn"
                                onClick={() => handleAdd(item)}
                              >
                                <PlusOutlined />
                              </button>
                              <DeleteOutlined
                                className="delete-icon"
                                onClick={() => removeItem(item, false)}
                              />
                            </div>
                          </div>

                          <div className="order-item-price">
                            ₹{(item.price * item.qty).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ADDITIONAL ITEMS SECTION */}
                  {showAddMoreSection && (
                    <div className="order-section additional-section">
                      <div className="section-title">
                        <PlusOutlined /> Add More Items
                        <span className="section-subtitle">
                          (Will be served separately)
                        </span>
                      </div>

                      <div className="additional-items-list">
                        {additionalItems.map((item) => (
                          <div
                            key={`additional-${item.id}`}
                            className="order-item-row"
                          >
                            <div className="order-item-info">
                              <div className="order-item-name">{item.name}</div>
                              <div className="order-controls">
                                <button
                                  className="stepper-btn"
                                  onClick={() => decreaseItem(item, true)}
                                >
                                  <MinusOutlined />
                                </button>
                                <span className="stepper-qty">{item.qty}</span>
                                <button
                                  className="stepper-btn"
                                  onClick={() => handleAdd(item)}
                                >
                                  <PlusOutlined />
                                </button>
                                <DeleteOutlined
                                  className="delete-icon"
                                  onClick={() => removeItem(item, true)}
                                />
                              </div>
                            </div>

                            <div className="order-item-price">
                              ₹{(item.price * item.qty).toFixed(2)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PAYMENT METHOD SELECTION */}
                  {orderStatus !== "confirmed" && (
                    <div className="payment-segmented">
                      {paymentOptions.map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`payment-segment ${paymentMethod === option ? "active" : ""}`}
                          onClick={() => setPaymentMethod(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* CONFIRMED ORDER NOTE */}
                  {orderStatus === "confirmed" && customerOrderId && (
                    <div className="order-confirmed-note">
                      <CheckCircleOutlined />
                      <span>Order #{customerOrderId} Confirmed!</span>
                      <small>Your food is being prepared</small>
                    </div>
                  )}

                  {/* ORDER ACTIONS */}
                  <div className="order-actions">
                    {orderStatus === "confirmed" &&
                      additionalItems.length > 0 && (
                        <button
                          className="confirm-additional-btn"
                          onClick={handleConfirmAdditionalItems}
                        >
                          <ArrowRightOutlined /> Confirm Additional Items
                        </button>
                      )}
                    <button
                      className="clear-order-btn"
                      onClick={handleClearOrder}
                    >
                      {orderStatus === "confirmed"
                        ? "Clear Additional Items"
                        : "Clear All Items"}
                    </button>

                    {orderStatus !== "confirmed" && (
                      <button
                        className="checkout-btn"
                        onClick={handleSetPaymentMethod}
                        disabled={!paymentMethod || orderItems.length === 0}
                      >
                        <ArrowRightOutlined /> Confirm Order & Pay
                      </button>
                    )}
                  </div>

                  {/* BILL SECTION */}
                  <div className="swiggy-bill-wrapper">
                    <div
                      className="swiggy-bill-header"
                      onClick={() => setShowBillDetails(!showBillDetails)}
                    >
                      <div>
                        <div className="to-pay-label">
                          To Pay ₹{total.toFixed(2)}
                        </div>
                        <div className="tax-note">
                          Incl. all taxes & charges
                        </div>
                      </div>
                      <div
                        className={`arrow ${showBillDetails ? "rotate" : ""}`}
                      >
                        ▼
                      </div>
                    </div>

                    {showBillDetails && (
                      <div className="swiggy-bill-body">
                        <div className="bill-row">
                          <span>Item Total</span>
                          <span>₹{subtotal.toFixed(2)}</span>
                        </div>
                        <div className="bill-row">
                          <span>Discount</span>
                          <span>-₹{discountedAmount.toFixed(2)}</span>
                        </div>
                        <div className="bill-row">
                          <span>Service Charge</span>
                          <span>₹{serviceCharge.toFixed(2)}</span>
                        </div>
                        <div className="bill-row">
                          <span>
                            Tax ({(billingConfig?.taxRate || 0.18) * 100}%)
                          </span>
                          <span>₹{tax.toFixed(2)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
