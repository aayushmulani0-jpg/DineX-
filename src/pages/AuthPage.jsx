import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/Auth.css";

const initialLogin = { identifier: "", password: "" };
const initialRegister = { name: "", email: "", password: "" };
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_HINT =
  "Use 8+ characters with uppercase, lowercase, number and special character.";

const getPasswordErrors = (password) => {
  const errors = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters.");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Add at least one uppercase letter.");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Add at least one lowercase letter.");
  }
  if (!/\d/.test(password)) {
    errors.push("Add at least one number.");
  }
  if (!/[^A-Za-z\d]/.test(password)) {
    errors.push("Add at least one special character.");
  }

  return errors;
};

const AuthPage = ({ onLogin, onRegister }) => {
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const location = useLocation();
  const navigate = useNavigate();

  const redirectTo = useMemo(
    () => location.state?.from?.pathname || "/",
    [location.state],
  );

  const handleLoginSubmit = (event) => {
    event.preventDefault();
    const nextFieldErrors = {};

    if (!loginForm.identifier.trim()) {
      nextFieldErrors.identifier = "User ID or Email is required.";
    }
    if (!loginForm.password) {
      nextFieldErrors.loginPassword = "Password is required.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Please fix highlighted fields and try again.");
      setNotice("");
      return;
    }

    setFieldErrors({});
    setError("");
    setNotice("");

    const result = onLogin?.(loginForm);
    if (!result?.ok) {
      setError(result?.error || "Unable to login");
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  const handleRegisterSubmit = (event) => {
    event.preventDefault();
    const nextFieldErrors = {};
    const passwordErrors = getPasswordErrors(registerForm.password);

    if (!registerForm.name.trim()) {
      nextFieldErrors.name = "Name is required.";
    } else if (registerForm.name.trim().length < 2) {
      nextFieldErrors.name = "Name must be at least 2 characters.";
    }

    if (!registerForm.email.trim()) {
      nextFieldErrors.email = "Email is required.";
    } else if (!EMAIL_REGEX.test(registerForm.email.trim())) {
      nextFieldErrors.email = "Please enter a valid email address.";
    }

    if (!registerForm.password) {
      nextFieldErrors.registerPassword = "Password is required.";
    } else if (passwordErrors.length > 0) {
      nextFieldErrors.registerPassword = passwordErrors[0];
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Please fix highlighted fields and try again.");
      setNotice("");
      return;
    }

    setFieldErrors({});
    setError("");
    setNotice("");

    const result = onRegister?.(registerForm);
    if (!result?.ok) {
      setError(result?.error || "Unable to register");
      return;
    }

    setMode("login");
    setLoginForm(initialLogin);
    setRegisterForm(initialRegister);
    setNotice(result.message || "Access request submitted for admin approval.");
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>DineX Admin</h1>
          <p>Login to access dashboard and ProLayout screens.</p>
        </div>

        <div className="auth-switcher" role="tablist" aria-label="Auth modes">
          <button
            type="button"
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setMode("login");
              setFieldErrors({});
              setError("");
              setNotice("");
            }}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "register" ? "auth-tab active" : "auth-tab"}
            onClick={() => {
              setMode("register");
              setFieldErrors({});
              setError("");
              setNotice("");
            }}
          >
            Register
          </button>
        </div>

        {mode === "login" ? (
          <form className="auth-form" onSubmit={handleLoginSubmit}>
            <label htmlFor="login-identifier">User ID or Email</label>
            <input
              id="login-identifier"
              type="text"
              placeholder="e.g. U171... or your email"
              value={loginForm.identifier}
              className={fieldErrors.identifier ? "auth-input-error" : ""}
              onChange={(event) =>
                setLoginForm((prev) => ({
                  ...prev,
                  identifier: event.target.value,
                }))
              }
              required
            />
            {fieldErrors.identifier ? (
              <p className="auth-field-error">{fieldErrors.identifier}</p>
            ) : null}

            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={loginForm.password}
              className={fieldErrors.loginPassword ? "auth-input-error" : ""}
              onChange={(event) =>
                setLoginForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              required
            />
            {fieldErrors.loginPassword ? (
              <p className="auth-field-error">{fieldErrors.loginPassword}</p>
            ) : null}

            <button type="submit" className="auth-submit">
              Login
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleRegisterSubmit}>
            <label htmlFor="register-name">Name</label>
            <input
              id="register-name"
              type="text"
              value={registerForm.name}
              className={fieldErrors.name ? "auth-input-error" : ""}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
              required
            />
            {fieldErrors.name ? (
              <p className="auth-field-error">{fieldErrors.name}</p>
            ) : null}

            <label htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              value={registerForm.email}
              className={fieldErrors.email ? "auth-input-error" : ""}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  email: event.target.value,
                }))
              }
              required
            />
            {fieldErrors.email ? (
              <p className="auth-field-error">{fieldErrors.email}</p>
            ) : null}

            <label htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              value={registerForm.password}
              className={fieldErrors.registerPassword ? "auth-input-error" : ""}
              onChange={(event) =>
                setRegisterForm((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
              required
            />
            <p className="auth-password-hint">{PASSWORD_HINT}</p>
            {fieldErrors.registerPassword ? (
              <p className="auth-field-error">{fieldErrors.registerPassword}</p>
            ) : null}

            <button type="submit" className="auth-submit">
              Request access
            </button>
          </form>
        )}

        {notice ? (
          <div className="auth-message auth-message-success">{notice}</div>
        ) : null}
        {error ? (
          <div className="auth-message auth-message-error">{error}</div>
        ) : null}
      </div>
    </div>
  );
};

export default AuthPage;
