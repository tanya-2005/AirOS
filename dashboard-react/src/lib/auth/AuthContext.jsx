import { useCallback, useEffect, useState } from "react";
import { AuthContext } from "./authContextObject";
import { getToken, setToken as persistToken, clearToken, onUnauthorized, ApiError } from "../api/client";
import { postLogin, postLogout, getMe } from "../api/endpoints";

/**
 * Session state for the whole app — wraps RouterProvider in App.jsx.
 * Every protected page reads `user`/`hasRole` from useAuth() (lib/auth/useAuth.js)
 * instead of each fetching its own "who am I" (avoids duplicate state, one
 * real source of truth for identity). Token lives in localStorage (see
 * lib/api/client.js); this is the only thing that writes it, and mirrors
 * it into `user` state so components can react to login/logout without
 * polling. This file exports ONLY this component — the context object and
 * the hook each live in their own file so Fast Refresh can hot-patch all
 * three independently instead of invalidating the whole module tree.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    const hadToken = !!getToken();
    clearToken();
    setUser(null);
    if (hadToken) {
      try {
        await postLogout();
      } catch {
        // token was already invalid server-side (e.g. this IS the 401 path) — nothing more to do
      }
    }
  }, []);

  useEffect(() => {
    onUnauthorized(() => {
      clearToken();
      setUser(null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      if (!getToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await getMe();
        if (!cancelled) setUser(res.user);
      } catch (err) {
        if (!cancelled && !(err instanceof ApiError && err.status === 401)) {
          // Non-auth failure (e.g. backend unreachable) — leave the token
          // in place so a transient network blip doesn't force a re-login;
          // 401s already self-clear via onUnauthorized above.
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(email, password) {
    const res = await postLogin(email, password);
    persistToken(res.token);
    setUser(res.user);
    return res.user;
  }

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    hasRole: (...roles) => !!user && roles.includes(user.role),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
