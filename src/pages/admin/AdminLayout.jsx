import { NavLink, Outlet } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useAuth } from "../../lib/auth";

export default function AdminLayout() {
  const { isSuperadmin } = useAuth();
  const tabs = [
    { to: "/admin/employees", label: "Employees & badges" },
    { to: "/admin/trainings", label: "Training list" },
    ...(isSuperadmin ? [{ to: "/admin/users", label: "Admin users" }] : []),
  ];

  return (
    <AppShell>
      <nav className="tabs no-print">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) => `tab ${isActive ? "active" : ""}`}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </AppShell>
  );
}
