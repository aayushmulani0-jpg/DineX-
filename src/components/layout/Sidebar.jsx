import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = ({ pendingRequestsCount = 0 }) => {
  return (
    <div className="sidebar">
      <div className="logo">
        DineX
        <p className="w-text">Welcome to DineX Admin</p>
      </div>

      <NavLink
        to="/"
        className={({ isActive }) =>
          isActive ? "menu-item active" : "menu-item"
        }
      >
        Dashboard
      </NavLink>

      <NavLink
        to="/billing"
        className={({ isActive }) =>
          isActive ? "menu-item active" : "menu-item"
        }
      >
        Billing
      </NavLink>

      <NavLink
        to="/analytics"
        className={({ isActive }) =>
          isActive ? "menu-item active" : "menu-item"
        }
      >
        Analytics
      </NavLink>

      <NavLink
        to="/kitchen"
        className={({ isActive }) =>
          isActive ? "menu-item active" : "menu-item"
        }
      >
        Kitchen Status
      </NavLink>

      <NavLink
        to="/stock"
        className={({ isActive }) =>
          isActive ? "menu-item active" : "menu-item"
        }
      >
        Stock
      </NavLink>

      <NavLink
        to="/users"
        className={({ isActive }) =>
          isActive ? "menu-item active" : "menu-item"
        }
      >
        <span className="menu-item-label">
          Users
          {pendingRequestsCount > 0 ? (
            <span
              className="menu-item-dot"
              aria-label="Pending access requests"
            />
          ) : null}
        </span>
      </NavLink>
    </div>
  );
};

export default Sidebar;
