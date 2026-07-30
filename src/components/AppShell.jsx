import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { APP_SHORT_NAME, ORG_NAME } from "../lib/config";
import { useAuth } from "../lib/auth";
import Icon from "./Icon";

function initials(user) {
  const name = user?.full_name || user?.username || "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

/** Live HH:MM:SS clock, like the reference dashboard. */
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="topbar-clock">
      <div className="k">Current time</div>
      <div className="t">
        {now.toLocaleTimeString("en-GB", { hour12: false })}
      </div>
    </div>
  );
}

/** Avatar + dropdown (My profile / Sign out). */
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
        <Link to="/" className="brand">
          <span className="brand-mark">TV</span>
          <span style={{ minWidth: 0 }}>
            <div className="brand-name">{APP_SHORT_NAME}</div>
            <span className="brand-sub">{ORG_NAME}</span>
          </span>
        </Link>

        <div className="spacer" />

        {/* desktop: status + clock + avatar dropdown (authed) or Login (guest) */}
        {isAuthed ? (
          <div className="desktop-only topbar-right">
            <div className="topbar-status">
              <span className="status-dot" /> Online
            </div>
            <Clock />
            <AvatarMenu user={user} onLogout={doLogout} />
          </div>
        ) : (
          <Link to="/login" className="btn primary sm desktop-only">
            <Icon name="key" /> Login
          </Link>
        )}

        {/* mobile: everything lives behind the hamburger */}
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
                  <DrawerLink to="/admin/trainings" icon="training" onClick={close}>
                    Training list
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
                {ORG_NAME}
              </div>
            </div>
          </aside>
        </>
      )}

      <main className={`content ${narrow ? "narrow" : ""}`}>{children}</main>
    </div>
  );
}
