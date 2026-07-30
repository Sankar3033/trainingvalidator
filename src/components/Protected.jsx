import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import AppShell from "./AppShell";
import { Spinner } from "./ui";

export default function Protected({ children, superadminOnly = false }) {
  const { isAuthed, checking, isSuperadmin } = useAuth();
  const location = useLocation();

  if (checking) {
    return (
      <AppShell>
        <Spinner label="Checking your session…" />
      </AppShell>
    );
  }
  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (superadminOnly && !isSuperadmin) {
    return <Navigate to="/admin" replace />;
  }
  return children;
}
