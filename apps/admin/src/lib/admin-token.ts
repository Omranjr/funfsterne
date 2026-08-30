import Cookies from "js-cookie";

/**
 * Where the admin session token lives, and the only place that knows it.
 *
 * Split out of `auth.tsx` to break an import cycle: the API client needs to
 * read the token, and the auth provider needs to register the API client's
 * unauthorized handler. With both living in `auth.tsx` those two modules
 * imported each other — which happens to work through hoisting, but is
 * exactly the kind of thing that breaks when a bundler reorders modules.
 *
 * The cookie is readable by JavaScript on purpose: the client reads it back
 * to build the `Authorization` header, because the API is on a different
 * origin from the dashboard. See the security notes on the checklist for
 * why it is not `httpOnly`.
 */
const TOKEN_COOKIE = "adminToken";

/** Matches the 7-day expiry the API now signs admin tokens with. */
const TOKEN_DAYS = 7;

export function getAdminToken(): string | undefined {
  return Cookies.get(TOKEN_COOKIE);
}

export function setAdminToken(token: string): void {
  Cookies.set(TOKEN_COOKIE, token, {
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    expires: TOKEN_DAYS,
  });
}

export function clearAdminToken(): void {
  Cookies.remove(TOKEN_COOKIE);
}
