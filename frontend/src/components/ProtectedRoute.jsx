import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && user.role !== role) {
    const target =
      user.role === "CORE" ? "/core" :
      user.role === "EXECUTIVE" ? "/executive" :
      "/admin";

    return <Navigate to={target} replace />;
  }

  return children;
}
