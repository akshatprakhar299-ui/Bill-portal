import { createContext, useContext, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("aces_user");
    return raw ? JSON.parse(raw) : null;
  });

  async function login(email, password) {
    const { data } = await api.post("/auth/login", {
      email,
      password,
    });

    const userData = {
      id: data.user_id,
      name: data.name,
      role: data.role,
    };

    localStorage.setItem("aces_token", data.access_token);
    localStorage.setItem("aces_user", JSON.stringify(userData));

    setUser(userData);
    return userData;
  }

  function logout() {
    localStorage.removeItem("aces_token");
    localStorage.removeItem("aces_user");
    setUser(null);
  }

  const value = useMemo(
    () => ({ user, login, logout }),
    [user]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
