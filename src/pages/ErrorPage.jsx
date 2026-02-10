import React from "react";
import { Link } from "react-router-dom";
import "../styles/ErrorPage.css";

const ErrorPage = () => {
  return (
    <div className="error-page">
      <div className="error-card">
        <div className="error-code">404</div>
        <h1 className="error-title">Page not found</h1>
        <p className="error-subtitle">
          The page you’re looking for doesn’t exist or was moved.
        </p>
        
      </div>
    </div>
  );
};

export default ErrorPage;
