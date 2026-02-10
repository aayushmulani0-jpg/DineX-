import React, { useEffect, useState } from "react";
import "../../styles/TopBar.css";

const Topbar = ({ search, setSearch }) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const day = now.toLocaleDateString(undefined, { weekday: "long" });
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="topbar">
      <div>Admin</div>
      <div className="topbar-datetime">
        <span className="topbar-day">{day}</span>
        <span className="topbar-date">{date}</span>
        <span className="topbar-time">{time}</span>
      </div>
    </div>
  );
};

export default Topbar;
