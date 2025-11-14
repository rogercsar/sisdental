import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./lib/store/auth";
import Landing from "./pages/Landing/Landing";
import DashboardLayout from "./components/layout/DashboardLayout";
import { RootLayout } from "./components/RootLayout";
import { AuthProvider } from "./components/AuthProvider";
import Login from "./pages/Login/Login";
import SignUp from "./pages/SignUp/SignUp";
import NotFound from "./pages/NotFound/NotFound";
import Pricing from "./pages/Pricing/Pricing";
import CheckoutSuccess from "./pages/CheckoutSuccess/CheckoutSuccess";

// Import dashboard pages
import Home from "./pages/Dashboard/Home";
import Patients from "./pages/Dashboard/Patients";
import Appointments from "./pages/Dashboard/Appointments";
import Finances from "./pages/Dashboard/Finances";
import PatientRecord from "./pages/Dashboard/PatientRecord";
import Reports from "./pages/Dashboard/Reports";
import Settings from "./pages/Dashboard/Settings";
import PatientPortal from "./pages/PatientPortal/PatientPortal";

function App() {
  return (
    <AuthProvider>
      <RootLayout>
        <Routes>
          <Route path="/" element={<RootEntry />} />
          <Route path="/login" element={<Login />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/checkout-success" element={<CheckoutSuccess />} />
          <Route path="/patient-portal" element={<PatientPortal />} />

          {/* Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Home />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/patients"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Patients />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/appointments"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Appointments />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/finances"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Finances />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/patients/:id"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PatientRecord />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/reports"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Reports />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Settings />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </RootLayout>
    </AuthProvider>
  );
}

export default App;

function RootEntry() {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null;
  return user ? <Navigate to="/dashboard" replace /> : <Landing />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
