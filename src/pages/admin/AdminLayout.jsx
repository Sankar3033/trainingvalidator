import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import AppShell from "../../components/AppShell";
import { useAuth } from "../../lib/auth";
import { signalFirstPaint, warmAdminCache } from "../../lib/prefetch";

export default function AdminLayout() {
  const { isSuperadmin } = useAuth();

  // Start the background warm-up. It waits for the employees list to land
  // before fetching anything else; the timer is the fallback for a deep link
  // straight to another admin page, where nothing else opens the gate.
  useEffect(() => {
    warmAdminCache();
    const t = setTimeout(signalFirstPaint, 2500);
    return () => clearTimeout(t);
  }, []);
  const tabs = [
    { to: "/admin/employees", label: "Employees & badges" },
    { to: "/admin/bulk", label: "Bulk edit" },
    { to: "/admin/trainings", label: "Training list" },
    { to: "/admin/card", label: "Configuration" },
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
