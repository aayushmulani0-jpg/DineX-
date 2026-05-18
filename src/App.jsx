import React, { useState, useEffect, useCallback } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
  useLocation,
} from "react-router-dom";
import axios from "axios";
import { message } from "antd";

const API_BASE = "http://localhost:5000/api";
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import Billing from "./pages/Billing";
import Analytics from "./pages/Analytics";
import MenuPage from "./pages/MenuPage";
import ErrorPage from "./pages/ErrorPage";
import KitchenStatus from "./pages/KitchenStatus";
import CustomerScreen from "./pages/CustomerScreen";
import Stock from "./pages/Stock";
import AuthPage from "./pages/AuthPage";
import Users from "./pages/Users";

const AUTH_SESSION_KEY = "dinex-auth-session";
const AUTH_USERS_KEY = "dinex-auth-users";
const AUTH_ACCESS_REQUESTS_KEY = "dinex-auth-access-requests";
const AUTH_LOGOUT_EVENT = "dinex-auth-logout";

const getSafeArray = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

function Layout({ pendingRequestsCount }) {
  return (
    <div className="layout">
      <Sidebar pendingRequestsCount={pendingRequestsCount} />
      <Outlet />
    </div>
  );
}

function RequireAuth({ isAuthenticated }) {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <Outlet />;
}

function App() {
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [billingConfig, setBillingConfig] = useState(null);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const isAuthenticated = Boolean(currentUser);

  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(AUTH_SESSION_KEY);
      if (savedSession) {
        setCurrentUser(JSON.parse(savedSession));
      }
    } catch (error) {
      console.error("Failed to restore auth session:", error);
      localStorage.removeItem(AUTH_SESSION_KEY);
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      setCurrentUser(null);
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout);

    return () => {
      window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    };
  }, []);

  useEffect(() => {
    const syncPendingCount = () => {
      const requests = getSafeArray(AUTH_ACCESS_REQUESTS_KEY);
      setPendingRequestsCount(requests.length);
    };

    syncPendingCount();
    const interval = setInterval(syncPendingCount, 2000);

    const onStorageChange = (event) => {
      if (event.key === AUTH_ACCESS_REQUESTS_KEY) {
        syncPendingCount();
      }
    };

    window.addEventListener("storage", onStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorageChange);
    };
  }, []);

  const registerUser = useCallback((payload) => {
    const name = (payload?.name || "").trim();
    const normalizedName = name.toLowerCase();
    const email = (payload?.email || "").trim().toLowerCase();
    const password = payload?.password || "";

    if (!name || !email || !password) {
      return { ok: false, error: "All fields are required" };
    }

    if (name.length < 2) {
      return { ok: false, error: "Name must be at least 2 characters" };
    }

    if (!EMAIL_REGEX.test(email)) {
      return { ok: false, error: "Please enter a valid email address" };
    }

    if (!PASSWORD_REGEX.test(password)) {
      return {
        ok: false,
        error:
          "Password must be 8+ chars with uppercase, lowercase, number and special character",
      };
    }

    try {
      const users = getSafeArray(AUTH_USERS_KEY);
      const requests = getSafeArray(AUTH_ACCESS_REQUESTS_KEY);

      if (!Array.isArray(users)) {
        return { ok: false, error: "Invalid user storage state" };
      }

      const approvedEmailExists = users.some((u) => u.email === email);
      if (approvedEmailExists) {
        return { ok: false, error: "Email is already registered" };
      }

      const approvedNameExists = users.some(
        (u) => (u.name || "").trim().toLowerCase() === normalizedName,
      );
      if (approvedNameExists) {
        return { ok: false, error: "Username is already registered" };
      }

      const pendingEmailExists = requests.some(
        (request) => request.email === email,
      );
      if (pendingEmailExists) {
        return {
          ok: false,
          error: "This email already has a pending access request",
        };
      }

      const pendingNameExists = requests.some(
        (request) =>
          (request.name || "").trim().toLowerCase() === normalizedName,
      );
      if (pendingNameExists) {
        return {
          ok: false,
          error: "This username already has a pending access request",
        };
      }

      const newRequest = {
        requestId: `R${Date.now()}`,
        name,
        email,
        password,
        requestedAt: new Date().toISOString(),
      };

      localStorage.setItem(
        AUTH_ACCESS_REQUESTS_KEY,
        JSON.stringify([...requests, newRequest]),
      );
      setPendingRequestsCount((prev) => prev + 1);

      return {
        ok: true,
        status: "requested",
        message:
          "Access request submitted successfully. You can login after admin approval.",
      };
    } catch (error) {
      console.error("Registration failed:", error);
      return { ok: false, error: "Unable to register right now" };
    }
  }, []);

  const loginUser = useCallback((payload) => {
    const identifier = (payload?.identifier || "").trim();
    const password = payload?.password || "";

    if (!identifier || !password) {
      return { ok: false, error: "User ID/Email and password are required" };
    }

    if (identifier.length < 3) {
      return {
        ok: false,
        error: "Enter a valid User ID or Email before logging in",
      };
    }

    try {
      const users = getSafeArray(AUTH_USERS_KEY);
      const requests = getSafeArray(AUTH_ACCESS_REQUESTS_KEY);

      if (!Array.isArray(users)) {
        return { ok: false, error: "Invalid user storage state" };
      }

      const normalizedIdentifier = identifier.toLowerCase();
      const matchedUser = users.find((u) => {
        const emailMatch =
          (u.email || "").toLowerCase() === normalizedIdentifier;
        const idMatch = (u.id || "") === identifier;
        return (emailMatch || idMatch) && u.password === password;
      });

      if (!matchedUser) {
        const pendingMatch = requests.some((request) => {
          const emailMatch =
            (request.email || "").toLowerCase() === normalizedIdentifier;
          return emailMatch && request.password === password;
        });

        if (pendingMatch) {
          return {
            ok: false,
            error: "Your access request is pending admin approval.",
          };
        }

        return { ok: false, error: "Invalid user ID/email or password" };
      }

      const loginAt = new Date().toISOString();
      const sessionId = `S-${Date.now()}`;
      const updatedUsers = users.map((user) =>
        user.id === matchedUser.id
          ? {
              ...user,
              lastLoginAt: loginAt,
              lastSessionId: sessionId,
            }
          : user,
      );

      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(updatedUsers));

      const session = {
        name: matchedUser.name,
        email: matchedUser.email,
        userId: matchedUser.id,
        loginAt,
        sessionId,
      };
      localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
      setCurrentUser(session);

      return { ok: true };
    } catch (error) {
      console.error("Login failed:", error);
      return { ok: false, error: "Unable to login right now" };
    }
  }, []);

  const approveAccessRequest = useCallback((requestId) => {
    try {
      const requests = getSafeArray(AUTH_ACCESS_REQUESTS_KEY);
      const users = getSafeArray(AUTH_USERS_KEY);

      const request = requests.find((item) => item.requestId === requestId);
      if (!request) {
        return { ok: false, error: "Request not found" };
      }

      const exists = users.some((user) => user.email === request.email);
      if (exists) {
        const remaining = requests.filter(
          (item) => item.requestId !== requestId,
        );
        localStorage.setItem(
          AUTH_ACCESS_REQUESTS_KEY,
          JSON.stringify(remaining),
        );
        setPendingRequestsCount(remaining.length);
        return { ok: false, error: "User already approved previously" };
      }

      const newUser = {
        id: `U${Date.now()}`,
        name: request.name,
        email: request.email,
        password: request.password,
        lastLoginAt: null,
        lastSessionId: null,
        createdAt: new Date().toISOString(),
      };

      const remaining = requests.filter((item) => item.requestId !== requestId);
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify([...users, newUser]));
      localStorage.setItem(AUTH_ACCESS_REQUESTS_KEY, JSON.stringify(remaining));
      setPendingRequestsCount(remaining.length);

      return { ok: true, userId: newUser.id };
    } catch (error) {
      console.error("Approve request failed:", error);
      return { ok: false, error: "Unable to approve request" };
    }
  }, []);

  const denyAccessRequest = useCallback((requestId) => {
    try {
      const requests = getSafeArray(AUTH_ACCESS_REQUESTS_KEY);
      const remaining = requests.filter((item) => item.requestId !== requestId);
      localStorage.setItem(AUTH_ACCESS_REQUESTS_KEY, JSON.stringify(remaining));
      setPendingRequestsCount(remaining.length);
      return { ok: true };
    } catch (error) {
      console.error("Deny request failed:", error);
      return { ok: false, error: "Unable to deny request" };
    }
  }, []);

  const removeUserAccess = useCallback(
    (userId) => {
      try {
        const users = getSafeArray(AUTH_USERS_KEY);

        if (users.length <= 1) {
          return {
            ok: false,
            error: "At least one user must keep dashboard access",
          };
        }

        const remaining = users.filter((user) => user.id !== userId);
        const removedUser = users.find((user) => user.id === userId);

        localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(remaining));

        if (removedUser?.id === currentUser?.userId) {
          localStorage.removeItem(AUTH_SESSION_KEY);
          window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
        }

        return { ok: true };
      } catch (error) {
        console.error("Remove access failed:", error);
        return { ok: false, error: "Unable to remove access" };
      }
    },
    [currentUser?.userId],
  );

  /* ================= FETCH TABLES ================= */
  const fetchTables = useCallback(async () => {
    try {
      const res = await api.get("/tables");
      setTables(res.data);
    } catch (error) {
      console.error("Failed to fetch tables:", error);
      message.error("Failed to load tables");
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchTables();
  }, [fetchTables, isAuthenticated]);

  /* ================= FETCH MENU (OPTIMIZED) ================= */
  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/menu", {
        params: {
          _cache: Date.now(),
        },
      });
      setMenuItems(res.data);
    } catch (error) {
      console.error("Failed to fetch menu:", error);
      message.error("Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchMenu();

    // Refresh every 10 minutes
    const interval = setInterval(fetchMenu, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMenu, isAuthenticated]);

  /* ================= FETCH BILLING CONFIG ================= */
  const fetchBilling = useCallback(async () => {
    try {
      const res = await api.get("/billing");
      setBillingConfig(res.data);
    } catch (error) {
      console.error("Failed to fetch billing config:", error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchBilling();
  }, [fetchBilling, isAuthenticated]);

  /* ================= AUTO REFRESH ORDERS ================= */
  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get("/orders");
      const validOrders = res.data.filter(
        (order) => order && order.items && order.items.length > 0,
      );
      setActiveOrders(validOrders);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders, isAuthenticated]);

  /* ================= FETCH BILLS ================= */
  const fetchBills = useCallback(async () => {
    try {
      const res = await api.get("/bills");
      setBills(res.data);
    } catch (error) {
      console.error("Failed to fetch bills:", error);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchBills();
    const interval = setInterval(fetchBills, 15000);
    return () => clearInterval(interval);
  }, [fetchBills, isAuthenticated]);

  /* ================= ADD NEW TABLE (DB) ================= */
  const addNewTable = async () => {
    try {
      const res = await api.post("/tables", {
        name: `Table ${tables.length + 1}`,
      });

      setTables((prev) => [...prev, res.data]);
      message.success(`${res.data.name} added successfully`);
    } catch (error) {
      console.error("Backend error:", error.response?.data);
      message.error("Failed to add table");
    }
  };

  /* ================= REMOVE TABLE (DB) ================= */
  const removeTable = async (tableId) => {
    const tableHasOrders = activeOrders.some(
      (order) => order.tableId === tableId,
    );

    if (tableHasOrders) {
      message.warning("Cannot remove table with active orders");
      return;
    }

    try {
      await api.delete(`/tables/${tableId}`);
      setTables((prev) => prev.filter((t) => t.id !== tableId));
      message.success("Table removed successfully");
    } catch (error) {
      console.error("Failed to remove table:", error);
      message.error("Failed to remove table");
    }
  };

  /* ================= ADD ORDER FROM QR ================= */
  const addOrderFromQR = async (tableId, item) => {
    try {
      const res = await api.get(`/orders/${tableId}`);
      let existingOrder = res.data;
      let updatedItems = existingOrder?.items ? [...existingOrder.items] : [];

      const found = updatedItems.find((o) => o.id === item.id);

      if (found) {
        found.qty += 1;
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

      await api.post(`/orders/${tableId}`, {
        items: updatedItems,
      });

      fetchOrders();
      message.success(`${item.name} added to order`);
    } catch (error) {
      message.error("Failed to add item");
      console.error(error);
    }
  };

  /* ================= GENERATE BILL (WITH DISCOUNT RESET) ================= */
  const generateBill = async (tableId, amount, method) => {
    try {
      // Generate bill first
      const res = await axios.put(
        `http://localhost:5000/api/orders/pay/${tableId}`,
        {
          amount,
          method,
        },
      );

      // Reset discount to 0 after bill generation
      if (billingConfig?.discount > 0) {
        await axios.put("http://localhost:5000/api/billing", {
          ...billingConfig,
          discount: 0,
        });

        // Update local state
        setBillingConfig((prev) => ({ ...prev, discount: 0 }));
      }

      message.success("Bill generated successfully! Table cleared.");
      fetchOrders();
      fetchBills();
    } catch (error) {
      if (error.response?.status === 404) {
        message.error("Order not confirmed by customer yet");
      } else {
        message.error("Failed to generate bill");
      }
      console.error(error);
    }
  };

  if (!authReady) {
    return null;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/menu/:tableId"
          element={
            <MenuPage
              menuItems={menuItems}
              addOrderFromQR={addOrderFromQR}
              billingConfig={billingConfig}
              loading={loading}
            />
          }
        />

        <Route path="/customer" element={<CustomerScreen />} />

        <Route
          path="/auth"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <AuthPage onLogin={loginUser} onRegister={registerUser} />
            )
          }
        />

        <Route element={<RequireAuth isAuthenticated={isAuthenticated} />}>
          <Route
            element={<Layout pendingRequestsCount={pendingRequestsCount} />}
          >
            <Route
              path="/"
              element={
                <Dashboard
                  tables={tables}
                  activeOrders={activeOrders}
                  menuItems={menuItems}
                  billingConfig={billingConfig}
                  setBillingConfig={setBillingConfig}
                  generateBill={generateBill}
                  addNewTable={addNewTable}
                  removeTable={removeTable}
                  loading={loading}
                />
              }
            />
            <Route path="/billing" element={<Billing bills={bills} />} />
            <Route path="/analytics" element={<Analytics bills={bills} />} />
            <Route path="/kitchen" element={<KitchenStatus />} />
            <Route path="/stock" element={<Stock />} />
            <Route
              path="/users"
              element={
                <Users
                  onApproveRequest={approveAccessRequest}
                  onDenyRequest={denyAccessRequest}
                  onRemoveAccess={removeUserAccess}
                />
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<ErrorPage />} />
      </Routes>
    </Router>
  );
}

export default App;
