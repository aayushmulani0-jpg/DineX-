import React from "react";
import { NavLink } from "react-router-dom";

const Sidebar = () => {
  return (
    <div className="sidebar">
      <div className="logo">
        NeuroDineX
        <p className="w-text">Welcome to McCafe Admin</p>
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
    </div>
  );
};

export default Sidebar;
