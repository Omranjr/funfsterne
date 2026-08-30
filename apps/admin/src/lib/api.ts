import { getAdminToken } from "./admin-token";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

/**
 * Called when the API rejects an admin request as unauthenticated.
 *
 * Admin tokens now carry a 7-day expiry, so a dead session is a normal
 * end-of-week event rather than something that only happened if the account
 * was deleted. Without this every page just set its own "failed to load"
 * flag: the dashboard looked broken, said nothing about why, and offered no
 * way back to the sign-in form.
 *
 * AuthProvider registers the handler; this module stays free of React so
 * any caller can use it.
 */
type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

export function apiHeaders(): Record<string, string> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

export async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...apiHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  // Every call through here is an authenticated admin request — signing in
  // uses fetch() directly — so a 401 always means the stored token is no
  // longer good, never a wrong password.
  if (res.status === 401) {
    onUnauthorized?.();
  }

  return res;
}
