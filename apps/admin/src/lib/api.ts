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

/**
 * Body returned when the request never reached the server.
 */
const NETWORK_FAILURE_BODY = JSON.stringify({
  error: "Could not reach the server.",
});

export async function apiFetch(path: string, init?: RequestInit) {
  let res: Response;

  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...apiHeaders(),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    // A dropped connection used to reject out of here, past every caller's
    // `if (!res.ok)` branch and straight out of the handler -- so the
    // `setLoading(false)` / `setDeleting(false)` line after the await never
    // ran. The result was a page stuck on its skeleton, a confirm dialog
    // whose button spun forever, or a save button that never came back,
    // none of them showing an error. Thirteen handlers had this shape.
    //
    // Returning a failed Response instead routes a network failure through
    // the not-ok path each caller already has, which already reports the
    // error and already clears the flag. Fixing it here rather than in
    // thirteen places also means the fourteenth handler is born correct.
    return new Response(NETWORK_FAILURE_BODY, {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "application/json" },
    });
  }

  // Every call through here is an authenticated admin request — signing in
  // uses fetch() directly — so a 401 always means the stored token is no
  // longer good, never a wrong password.
  if (res.status === 401) {
    onUnauthorized?.();
  }

  return res;
}
