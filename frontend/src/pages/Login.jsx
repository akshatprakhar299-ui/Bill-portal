import { useEffect, useState } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("CORE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate(
        user.role === "CORE"
          ? "/core"
          : user.role === "EXECUTIVE"
          ? "/executive"
          : "/admin",
        { replace: true }
      );
    }
  }, [user, navigate]);

  const roleInfo = {
    CORE: "Upload event bills and track approvals.",
    EXECUTIVE: "Review and approve submitted bills.",
    ADMIN: "Give final approval to executive-approved bills.",
  };

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);

      if (loggedInUser.role !== role) {
        throw new Error(
          `This account is a ${loggedInUser.role} account. Select the correct login role.`
        );
      }

      navigate(
        loggedInUser.role === "CORE"
          ? "/core"
          : loggedInUser.role === "EXECUTIVE"
          ? "/executive"
          : "/admin"
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Login failed. Check your credentials."
      );
      localStorage.removeItem("aces_token");
      localStorage.removeItem("aces_user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="brand-mark large">A</div>
        <div>
          <strong>ACES</strong>
          <span>Association of Computer Engineering Students</span>
        </div>
      </div>

      <div className="login-card">
        <div className="login-heading">
          <span className="eyebrow">SECURE PORTAL</span>
          <h1>Welcome back</h1>
          <p>Choose your access level and sign in.</p>
        </div>

        <div className="role-tabs">
          <button
            className={role === "CORE" ? "role-tab active" : "role-tab"}
            onClick={() => setRole("CORE")}
            type="button"
          >
            <Users size={17} />
            Core
          </button>
          <button
            className={role === "EXECUTIVE" ? "role-tab active" : "role-tab"}
            onClick={() => setRole("EXECUTIVE")}
            type="button"
          >
            <ShieldCheck size={17} />
            Executive
          </button>
          <button
            className={role === "ADMIN" ? "role-tab active" : "role-tab"}
            onClick={() => setRole("ADMIN")}
            type="button"
          >
            <LockKeyhole size={17} />
            Admin
          </button>
        </div>

        <p className="role-description">{roleInfo[role]}</p>

        {error && <div className="alert error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />

          <button className="primary-btn login-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="login-security">
          <LockKeyhole size={16} />
          Role-based access • JWT authentication • Password hashing
        </div>
      </div>
    </div>
  );
}
