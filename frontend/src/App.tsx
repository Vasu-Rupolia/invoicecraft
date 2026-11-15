import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { useAuth } from "./context/AuthContext";
import { useBusiness } from "./context/BusinessContext";

import AuthPage from "./pages/auth/AuthPage";
import BusinessSelectionPage from "./pages/BusinessSelectionPage";
import DashboardPage from "./pages/DashboardPage";
import CustomersPage from "./pages/CustomersPage";
import InvoicesPage from "./pages/InvoicesPage";
import QuotationsPage from "./pages/QuotationsPage";
import SettingsPage from "./pages/SettingsPage";
import GuidePage from "./pages/GuidePage";

import AppLayout from "./components/layout/AppLayout";
import ReportsPage from "./pages/ReportsPage";

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
    </div>
  );
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  if (user) return <Navigate to="/dashboard" replace />;

  return children;
}

function ProtectedRoute() {
  const { user, loading: authLoading } = useAuth();
  const { activeBusiness, loading: businessLoading } = useBusiness();

  if (authLoading || (user && businessLoading)) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!activeBusiness) {
    return <Navigate to="/select-business" replace />;
  }

  return <AppLayout />;
}

function BusinessRoute() {
  const { user, loading: authLoading } = useAuth();
  const { activeBusiness, loading: businessLoading } = useBusiness();

  if (authLoading || (user && businessLoading)) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (activeBusiness) {
    return <Navigate to="/dashboard" replace />;
  }

  return <BusinessSelectionPage />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <GuestRoute>
            <AuthPage mode="login" />
          </GuestRoute>
        }
      />

      <Route
        path="/register"
        element={
          <GuestRoute>
            <AuthPage mode="register" />
          </GuestRoute>
        }
      />

      <Route path="/select-business" element={<BusinessRoute />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/quotations" element={<QuotationsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/reports" element={<ReportsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}