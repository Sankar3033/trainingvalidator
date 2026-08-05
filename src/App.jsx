import { Navigate, Route, Routes } from "react-router-dom";
import Protected from "./components/Protected";
import ScanPage from "./pages/ScanPage";
import InfoPage from "./pages/InfoPage";
import LoginPage from "./pages/LoginPage";
import AdminLayout from "./pages/admin/AdminLayout";
import EmployeesPage from "./pages/admin/EmployeesPage";
import EmployeeFormPage from "./pages/admin/EmployeeFormPage";
import BadgePage from "./pages/admin/BadgePage";
import TrainingsPage from "./pages/admin/TrainingsPage";
import ConsoleUsersPage from "./pages/admin/ConsoleUsersPage";
import CardDesignerPage from "./pages/admin/CardDesignerPage";
import AccountPage from "./pages/admin/AccountPage";

export default function App() {
  return (
    <Routes>
      {/* ---------- public: scanner + badge verification ---------- */}
      <Route path="/" element={<ScanPage />} />
      <Route path="/scan" element={<Navigate to="/" replace />} />
      <Route path="/getInfo/:uid" element={<InfoPage />} />
      {/* lowercase alias so a hand-typed link still works */}
      <Route path="/getinfo/:uid" element={<InfoPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* ---------- My profile: standalone, its own page (JWT protected) ---- */}
      <Route
        path="/admin/account"
        element={
          <Protected>
            <AccountPage />
          </Protected>
        }
      />

      {/* ---------- admin console (JWT protected) ---------- */}
      <Route
        path="/admin"
        element={
          <Protected>
            <AdminLayout />
          </Protected>
        }
      >
        <Route index element={<Navigate to="/admin/employees" replace />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="employees/new" element={<EmployeeFormPage />} />
        <Route path="employees/:uid/edit" element={<EmployeeFormPage />} />
        <Route path="employees/:uid/badge" element={<BadgePage />} />
        <Route path="trainings" element={<TrainingsPage />} />
        <Route path="card" element={<CardDesignerPage />} />
        <Route
          path="users"
          element={
            <Protected superadminOnly>
              <ConsoleUsersPage />
            </Protected>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
