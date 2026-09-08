"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { setUnauthorizedHandler } from "./api";
import { getAdminToken, setAdminToken, clearAdminToken } from "./admin-token";
import { TENANT_ID } from "./tenant";

type AdminUser = {
  id: string;
  email: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  user: AdminUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Duplicated from ./api on purpose historically; kept in step by hand.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/auth/login`, {
        method: "POST",
        // Sign-in is tenant-scoped: admin emails are unique per tenant now,
        // because one owner may run several shops from one address.
        headers: {
          "Content-Type": "application/json",
          "x-tenant-id": TENANT_ID,
        },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) return false;

      const data = (await res.json()) as { token: string; admin: AdminUser };
      setAdminToken(data.token);
      setIsAuthenticated(true);
      setUser(data.admin);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    clearAdminToken();
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  // A 401 from any admin call means the stored token is finished --
  // expired (they last 7 days now) or revoked. Drop it and fall back to
  // the sign-in form instead of leaving every page showing a bare
  // "failed to load".
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
