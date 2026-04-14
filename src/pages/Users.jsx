import React, { useEffect, useMemo, useState } from "react";
import Topbar from "../components/layout/TopBar";
import "../styles/Users.css";

const AUTH_USERS_KEY = "dinex-auth-users";
const AUTH_ACCESS_REQUESTS_KEY = "dinex-auth-access-requests";

const getSafeArray = (key) => {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const Users = ({ onApproveRequest, onDenyRequest, onRemoveAccess }) => {
  const [users, setUsers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = () => {
      setUsers(getSafeArray(AUTH_USERS_KEY));
      setPendingRequests(getSafeArray(AUTH_ACCESS_REQUESTS_KEY));
    };

    loadData();

    const interval = setInterval(loadData, 3000);

    const onStorageChange = (event) => {
      if (
        event.key === AUTH_USERS_KEY ||
        event.key === AUTH_ACCESS_REQUESTS_KEY
      ) {
        loadData();
      }
    };

    window.addEventListener("storage", onStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorageChange);
    };
  }, []);

  const refreshData = () => {
    setUsers(getSafeArray(AUTH_USERS_KEY));
    setPendingRequests(getSafeArray(AUTH_ACCESS_REQUESTS_KEY));
  };

  const handleApprove = (requestId) => {
    setFeedback("");
    setError("");

    const result = onApproveRequest?.(requestId);
    if (!result?.ok) {
      setError(result?.error || "Unable to approve request.");
      return;
    }

    setFeedback("Access request approved successfully.");
    refreshData();
  };

  const handleDeny = (requestId) => {
    setFeedback("");
    setError("");

    const result = onDenyRequest?.(requestId);
    if (!result?.ok) {
      setError(result?.error || "Unable to deny request.");
      return;
    }

    setFeedback("Access request denied.");
    refreshData();
  };

  const handleRemoveAccess = (userId) => {
    setFeedback("");
    setError("");

    const result = onRemoveAccess?.(userId);
    if (!result?.ok) {
      setError(result?.error || "Unable to remove access.");
      return;
    }

    setFeedback("User access removed. They must request access again.");
    refreshData();
  };

  const totalUsers = users.length;
  const canRemoveAccess = totalUsers > 1;
  const activeLoggedInUsers = useMemo(
    () => users.filter((user) => Boolean(user.lastLoginAt)).length,
    [users],
  );
  const pendingCount = pendingRequests.length;

  return (
    <div className="main users-main">
      <Topbar />

      <div className="users-hero">
        <h2>Dashboard User Access</h2>
        <p>View all registered users who can access protected admin pages.</p>
      </div>

      <div className="users-stats">
        <div className="users-stat-card">
          <p>Total Users With Access</p>
          <h3>{totalUsers}</h3>
        </div>
        <div className="users-stat-card">
          <p>Users Logged In At Least Once</p>
          <h3>{activeLoggedInUsers}</h3>
        </div>
        <div className="users-stat-card">
          <p>Pending Access Requests</p>
          <h3>{pendingCount}</h3>
        </div>
      </div>

      <div className="users-pending-header">
        <h3>
          Pending Access Requests
          {pendingCount > 0 ? <span className="users-dot" /> : null}
        </h3>
      </div>

      <div className="users-table-wrap">
        {pendingRequests.length === 0 ? (
          <div className="users-empty">No pending requests.</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Requested At</th>
                <th>Decision</th>
              </tr>
            </thead>
            <tbody>
              {pendingRequests.map((request) => (
                <tr key={request.requestId}>
                  <td>{request.name || "-"}</td>
                  <td>{request.email || "-"}</td>
                  <td>{formatDateTime(request.requestedAt)}</td>
                  <td>
                    <div className="users-actions">
                      <button
                        type="button"
                        className="users-action-btn approve"
                        onClick={() => handleApprove(request.requestId)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="users-action-btn deny"
                        onClick={() => handleDeny(request.requestId)}
                      >
                        Deny
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {feedback ? <p className="users-feedback">{feedback}</p> : null}
      {error ? <p className="users-error">{error}</p> : null}

      <div className="users-table-wrap">
        {users.length === 0 ? (
          <div className="users-empty">No registered users found.</div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>User ID</th>
                <th>Email</th>
                <th>Last Login Session</th>
                <th>Last Login Time</th>
                <th>Registered At</th>
                {canRemoveAccess ? <th>Access</th> : null}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name || "-"}</td>
                  <td>{user.id || "-"}</td>
                  <td>{user.email || "-"}</td>
                  <td>{user.lastSessionId || "-"}</td>
                  <td>{formatDateTime(user.lastLoginAt)}</td>
                  <td>{formatDateTime(user.createdAt)}</td>
                  {canRemoveAccess ? (
                    <td>
                      <button
                        type="button"
                        className="users-action-btn remove"
                        onClick={() => handleRemoveAccess(user.id)}
                      >
                        Remove Access
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!canRemoveAccess && users.length === 1 ? (
        <p className="users-note">
          Remove access is hidden because only one approved user remains.
        </p>
      ) : null}
    </div>
  );
};

export default Users;
