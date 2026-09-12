import { Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";

import CoreDashboard from "./pages/core/CoreDashboard";
import UploadBill from "./pages/core/UploadBill";
import MyBills from "./pages/core/MyBills";

import ExecutiveDashboard from "./pages/executive/ExecutiveDashboard";
import PendingExecutive from "./pages/executive/PendingExecutive";

import AdminDashboard from "./pages/admin/AdminDashboard";
import PendingAdmin from "./pages/admin/PendingAdmin";
import AllBills from "./pages/admin/AllBills";


function RoleHome({ role }) {
  const path =
    role === "CORE" ? "/core" :
    role === "EXECUTIVE" ? "/executive" :
    "/admin";

  return <Navigate to={path} replace />;
}


export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/core"
        element={
          <ProtectedRoute role="CORE">
            <Layout>
              <CoreDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/core/upload"
        element={
          <ProtectedRoute role="CORE">
            <Layout>
              <UploadBill />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/core/bills"
        element={
          <ProtectedRoute role="CORE">
            <Layout>
              <MyBills />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/executive"
        element={
          <ProtectedRoute role="EXECUTIVE">
            <Layout>
              <ExecutiveDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/executive/pending"
        element={
          <ProtectedRoute role="EXECUTIVE">
            <Layout>
              <PendingExecutive />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <Layout>
              <AdminDashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/pending"
        element={
          <ProtectedRoute role="ADMIN">
            <Layout>
              <PendingAdmin />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/all"
        element={
          <ProtectedRoute role="ADMIN">
            <Layout>
              <AllBills />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route path="/" element={<RoleRedirect />} />
      <Route path="*" element={<RoleRedirect />} />
    </Routes>
  );
}


function RoleRedirect() {
  const raw = localStorage.getItem("aces_user");

  if (!raw) return <Navigate to="/login" replace />;

  try {
    const user = JSON.parse(raw);
    return <RoleHome role={user.role} />;
  } catch {
    return <Navigate to="/login" replace />;
  }
}
