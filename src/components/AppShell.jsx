import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { APP_SHORT_NAME } from "../lib/config";
import { useAuth } from "../lib/auth";
import Icon from "./Icon";
import Logo from "./Logo";

function initials(user) {
  const name = user?.full_name || user?.username || "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/** Avatar + dropdown. */
function AvatarMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="avatar-menu" ref={ref}>
      <button
        className="avatar-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="avatar-name">{user?.full_name || user?.username}</span>
        <span className="avatar-circle">{initials(user)}</span>
      </button>

      {open && (
        <div className="avatar-pop" role="menu">
          <div className="avatar-pop-head">
            <span className="avatar-circle">{initials(user)}</span>
            <div>
              <b>{user?.full_name || user?.username}</b>
              <span>
                @{user?.username} · {user?.role}
              </span>
            </div>
          </div>
          <button
            className="avatar-pop-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              navigate("/admin/account");
            }}
          >
            <Icon name="user" fixedWidth /> My profile
          </button>
          <button
            className="avatar-pop-item danger"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <Icon name="logout" fixedWidth /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function DrawerLink({ to, icon, children, onClick, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) => `drawer-link ${isActive ? "active" : ""}`}
    >
      <Icon name={icon} fixedWidth />
      <span>{children}</span>
    </NavLink>
  );
}

export default function AppShell({ children, narrow = false }) {
  const [open, setOpen] = useState(false);
  const { isAuthed, isSuperadmin, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setOpen(false), [location.pathname]);

  const close = () => setOpen(false);
  const doLogout = () => {
    logout();
    close();
    navigate("/login");
  };

  return (
    <div className="shell">
      <header className="topbar no-print">
        {/* Left: Schneider logo | product name — same on mobile */}
        <Link to="/" className="brand">
          <Logo height={30} />
          <span className="brand-divider" aria-hidden="true" />
          <span className="brand-name">Training Validator</span>
        </Link>

        <div className="spacer" />

        {/* Desktop Right Side */}
        {isAuthed ? (
          <div className="desktop-only topbar-right">
            <AvatarMenu user={user} onLogout={doLogout} />
          </div>
        ) : (
          <Link to="/login" className="btn primary sm desktop-only">
            <Icon name="key" /> Login
          </Link>
        )}

        {/* Mobile menu hamburger */}
        <button
          className="icon-btn menu-btn"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          title="Menu"
        >
          <Icon name="bars" />
        </button>
      </header>

      {open && (
        <>
          <div className="drawer-backdrop" onClick={close} />
          <aside className="drawer">
            <div className="card-head">
              <div className="card-title">Menu</div>
              <button
                className="btn sm ghost"
                onClick={close}
                aria-label="Close menu"
              >
                <Icon name="xmark" />
              </button>
            </div>

            <div className="drawer-body">
              <h3>Verify</h3>
              <DrawerLink to="/" icon="qrcode" onClick={close} end>
                Scan a badge
              </DrawerLink>

              <h3>Admin console</h3>
              {isAuthed ? (
                <>
                  <DrawerLink to="/admin/employees" icon="users" onClick={close}>
                    Employees &amp; badges
                  </DrawerLink>
                  <DrawerLink to="/admin/bulk" icon="users" onClick={close}>
                    Bulk edit
                  </DrawerLink>
                  <DrawerLink to="/admin/trainings" icon="training" onClick={close}>
                    Training list
                  </DrawerLink>
                  <DrawerLink to="/admin/card" icon="badge" onClick={close}>
                    Configuration
                  </DrawerLink>
                  {isSuperadmin && (
                    <DrawerLink to="/admin/users" icon="user-gear" onClick={close}>
                      Admin users
                    </DrawerLink>
                  )}
                  <DrawerLink to="/admin/account" icon="user" onClick={close}>
                    My profile
                  </DrawerLink>
                  <button className="drawer-link btn-reset" onClick={doLogout}>
                    <Icon name="logout" fixedWidth />
                    <span>Sign out</span>
                  </button>
                </>
              ) : (
                <DrawerLink to="/login" icon="key" onClick={close}>
                  Login to admin console
                </DrawerLink>
              )}

              <div className="spacer" />
              <div className="tiny muted" style={{ paddingTop: 16 }}>
                Schneider Electric
              </div>
            </div>
          </aside>
        </>
      )}

      <main className={`content ${narrow ? "narrow" : ""}`}>{children}</main>
    </div>
  );
}
