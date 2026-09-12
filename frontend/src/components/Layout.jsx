import { useEffect, useState } from "react";
import { Bell, FileCheck2, LogOut, Menu, X } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import api from "../services/api";

const links = {
  CORE: [
    ["/core", "Dashboard"],
    ["/core/upload", "Upload Bill"],
    ["/core/bills", "My Bills"],
  ],
  EXECUTIVE: [
    ["/executive", "Dashboard"],
    ["/executive/pending", "Pending Approvals"],
  ],
  ADMIN: [
    ["/admin", "Dashboard"],
    ["/admin/pending", "Final Approvals"],
    ["/admin/all", "All Bills"],
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function doLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>ACES</strong>
            <span>Bill Portal</span>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="nav">
          {(links[user.role] || []).map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === `/${user.role.toLowerCase()}`}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                isActive ? "nav-link active" : "nav-link"
              }
            >
              <FileCheck2 size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-mini">
            <div className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="user-copy">
              <strong>{user.name}</strong>
              <span>{user.role}</span>
            </div>
          </div>

          <button className="logout-btn" onClick={doLogout}>
            <LogOut size={17} />
            Logout
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="mobile-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="mobile-menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={22} />
          </button>

          <div>
            <span className="eyebrow">ACES EXPENSE MANAGEMENT</span>
            <h1>
              {user.role === "CORE"
                ? "Core Member"
                : user.role === "EXECUTIVE"
                ? "Executive Review"
                : "Administration"}
            </h1>
          </div>

          <NotificationBell />
        </header>

        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}

function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  async function load() {
    try {
      const { data } = await api.get("/notifications");
      setNotifications(data);
    } catch {
      // Token may be expired; normal API errors are handled by pages.
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, []);

  const unread = notifications.filter((n) => !n.is_read).length;

  async function markRead(id) {
    try {
      await api.post(`/notifications/${id}/read`);
      setNotifications((items) =>
        items.map((item) =>
          item.id === id ? { ...item, is_read: true } : item
        )
      );
    } catch {}
  }

  return (
    <div className="notification-wrap">
      <button
        className="icon-btn"
        onClick={() => setOpen((value) => !value)}
        title="Notifications"
      >
        <Bell size={20} />
        {unread > 0 && <span className="notification-count">{unread}</span>}
      </button>

      {open && (
        <div className="notification-panel">
          <div className="notification-head">
            <strong>Notifications</strong>
            <span>{unread} unread</span>
          </div>

          {notifications.length === 0 ? (
            <div className="empty-small">No notifications yet.</div>
          ) : (
            notifications.map((item) => (
              <button
                className={`notification-item ${item.is_read ? "read" : ""}`}
                key={item.id}
                onClick={() => markRead(item.id)}
              >
                <span className="notification-dot" />
                <div>
                  <p>{item.message}</p>
                  <small>
                    {new Date(item.created_at).toLocaleString()}
                  </small>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
