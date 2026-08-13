import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { TOKEN_KEY, USER_KEY } from "./config";
import { resetPrefetch } from "./prefetch";

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [checking, setChecking] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    // Drop the warmed admin data so the next sign-in starts clean.
    resetPrefetch();
    setToken("");
    setUser(null);
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await api.login(username, password);
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  // Revalidate the stored token on a hard refresh.
  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }
    let alive = true;
    api
      .me()
      .then((me) => {
        if (!alive) return;
        setUser(me);
        localStorage.setItem(USER_KEY, JSON.stringify(me));
      })
      .catch(() => alive && logout())
      .finally(() => alive && setChecking(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Any 401 from the API layer drops the session.
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener("tv:unauthorized", onUnauthorized);
    return () => window.removeEventListener("tv:unauthorized", onUnauthorized);
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      checking,
      login,
      logout,
      isAuthed: Boolean(token && user),
      isSuperadmin: user?.role === "superadmin",
    }),
    [user, token, checking, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
