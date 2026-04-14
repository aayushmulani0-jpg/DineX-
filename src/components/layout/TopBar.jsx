import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../../styles/TopBar.css";

const AUTH_SESSION_KEY = "dinex-auth-session";
const AUTH_LOGOUT_EVENT = "dinex-auth-logout";
const protectedPaths = [
  "/",
  "/billing",
  "/analytics",
  "/kitchen",
  "/stock",
  "/users",
];

const Topbar = ({ search, setSearch }) => {
  const [now, setNow] = useState(new Date());
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const day = now.toLocaleDateString(undefined, { weekday: "long" });
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const showLogout = protectedPaths.includes(location.pathname);

  const handleLogout = () => {
    localStorage.removeItem(AUTH_SESSION_KEY);
    window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT));
    navigate("/auth", { replace: true });
  };

  return (
    <div className="topbar">
      <div>Admin</div>
      <div className="topbar-right">
        <div className="topbar-datetime">
          <span className="topbar-day">{day}</span>
          <span className="topbar-date">{date}</span>
          <span className="topbar-time">{time}</span>
        </div>
        {showLogout ? (
          <button
            type="button"
            className="topbar-logout"
            onClick={handleLogout}
          >
            Logout
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default Topbar;
