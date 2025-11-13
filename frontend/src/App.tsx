import { Routes, Route } from "react-router-dom";
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
          <Route path="/login" element={<Login />} />
          <Route path="/sign-up" element={<SignUp />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/checkout-success" element={<CheckoutSuccess />} />
          <Route path="/patient-portal" element={<PatientPortal />} />

          {/* Dashboard Routes */}
          <Route
            path="/dashboard"
            element={
              <DashboardLayout>
                <Home />
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/patients"
            element={
              <DashboardLayout>
                <Patients />
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/appointments"
            element={
              <DashboardLayout>
                <Appointments />
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/finances"
            element={
              <DashboardLayout>
                <Finances />
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/patients/:id"
            element={
              <DashboardLayout>
                <PatientRecord />
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/reports"
            element={
              <DashboardLayout>
                <Reports />
              </DashboardLayout>
            }
          />
          <Route
            path="/dashboard/settings"
            element={
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </RootLayout>
    </AuthProvider>
  );
}

export default App;
