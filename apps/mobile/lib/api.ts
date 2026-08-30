import Constants from "expo-constants";
import { getAuthToken } from "./auth";
import { getOrCreateDeviceId } from "./device-id";
import type { Platform as PlatformType } from "@funfsterne/shared-types";

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL =
  (extra.apiBaseUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "https://funfsterne-admin.onrender.com";

// Plain fetch() has no default timeout -- on a dropped/stalled connection
// (backgrounding mid-request, dead wifi handoff, etc.) it can hang
// indefinitely, which is what left the discount-code "Redeeming…" badge
// stuck forever with no way for the user to recover. Every call below goes
// through this so a bad connection surfaces as a normal, retryable error
// instead of a silent hang.
const REQUEST_TIMEOUT_MS = 20000;

/**
 * Timeout for requests that must not be abandoned halfway.
 *
 * The backend sleeps when idle and its first request afterwards has been
 * measured at ~54s. Reads can afford a short timeout — they retry, and the
 * persisted cache means there is usually something on screen already. Signing
 * up cannot: it is the first thing a new customer ever does, it runs outside
 * react-query so nothing retries it, and giving up at 20s turned a slow
 * account creation into a failed one. Waiting is worse than instant, but it
 * is far better than "Request timed out" on the very first tap.
 *
 * The screens show a "still working" message while this runs, so the wait is
 * explained rather than looking like a hang.
 */
const COLD_START_TIMEOUT_MS = 65000;

async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetchWithTimeout(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  // 204 No Content (e.g. DELETE /public/auth/account) has no body -- calling
  // .json() on it throws "Unexpected end of JSON input".
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Routes with typed, backend-defined error codes (e.g.
// ALREADY_REDEEMED_BY_DEVICE) rather than a generic "API error" string.
//
// Originally these were all unauthenticated (the accountless discount
// flow), hence the name -- now that push-token registration and discount
// redemption require a logged-in consumer, this also attaches the Bearer
// token when one is stored, same as apiFetch. Register/login stay
// tokenless since there's nothing to attach yet at that point.
// ---------------------------------------------------------------------------

export type PublicApiErrorCode =
  | "ALREADY_REDEEMED_BY_DEVICE"
  | "ALREADY_REDEEMED_BY_USER"
  | "EXPIRED"
  | "MAX_REDEMPTIONS_REACHED"
  | "NOT_FOUND"
  | "INACTIVE"
  | "USERNAME_TAKEN"
  | "INSUFFICIENT_POINTS";

export class PublicApiError extends Error {
  readonly status: number;
  readonly errorCode: PublicApiErrorCode | null;

  constructor(
    status: number,
    message: string,
    errorCode: PublicApiErrorCode | null
  ) {
    super(message);
    this.name = "PublicApiError";
    this.status = status;
    this.errorCode = errorCode;
  }
}

type PublicErrorBody = {
  errorCode?: PublicApiErrorCode;
  error?: string;
  message?: string;
};

function asPublicApiErrorCode(
  value: unknown
): PublicApiErrorCode | null {
  if (
    value === "ALREADY_REDEEMED_BY_DEVICE" ||
    value === "ALREADY_REDEEMED_BY_USER" ||
    value === "EXPIRED" ||
    value === "MAX_REDEMPTIONS_REACHED" ||
    value === "NOT_FOUND" ||
    value === "INACTIVE" ||
    value === "USERNAME_TAKEN" ||
    value === "INSUFFICIENT_POINTS"
  ) {
    return value;
  }
  return null;
}

/**
 * Called when the API rejects a request that *carried* a token — meaning the
 * stored credential is no longer good: the account was deleted from the
 * admin dashboard, JWT_SECRET was rotated, or the token expired.
 *
 * Without this the app sat in a half-authenticated state: still "logged in"
 * as far as the UI was concerned, but every screen showing its error state,
 * and no route back to the sign-in screen short of reinstalling.
 *
 * AuthContext registers the handler; this module stays free of React so any
 * caller can use it.
 */
type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

// Sign-in and sign-up answer 401 for a wrong password, which is a normal
// answer and emphatically not a dead session — those must never trigger it.
const AUTH_ENDPOINTS = ["/public/auth/login", "/public/auth/register"];

async function publicApiFetch<T>(
  path: string,
  init?: RequestInit,
  timeoutMs?: number
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(url, { ...init, headers }, timeoutMs);
  } catch (err) {
    throw new PublicApiError(
      0,
      err instanceof Error ? err.message : "Network request failed",
      null
    );
  }

  if (!response.ok) {
    if (
      response.status === 401 &&
      token &&
      !AUTH_ENDPOINTS.includes(path)
    ) {
      onUnauthorized?.();
    }

    let body: PublicErrorBody = {};
    try {
      body = (await response.json()) as PublicErrorBody;
    } catch {
      // body was not JSON; fall through with empty body
    }
    throw new PublicApiError(
      response.status,
      body.error ?? body.message ?? `API error: ${response.status}`,
      asPublicApiErrorCode(body.errorCode)
    );
  }

  return response.json() as Promise<T>;
}

// POST /public/push-tokens
// Returns the upserted PushToken row.
type RegisterPushTokenResponse = {
  id: string;
  deviceId: string;
  token: string;
  platform: PlatformType;
  createdAt: string;
};

export function registerPushToken(args: {
  deviceId: string;
  token: string;
  platform: PlatformType;
}): Promise<RegisterPushTokenResponse> {
  return publicApiFetch<RegisterPushTokenResponse>("/public/push-tokens", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

// GET /public/discount-codes/active
// Returns the list of active discount codes (with optional scopeBranch joined).
export type DiscountCodeType = "PERCENTAGE" | "FIXED";

export type DiscountCode = {
  id: string;
  code: string;
  type: DiscountCodeType;
  value: string | number;
  expiresAt: string | null;
  maxRedemptions: number | null;
  currentRedemptions: number;
  isActive: boolean;
  scopeBranchId: string | null;
  scopeBranch?: {
    id: string;
    name: string;
    address: string;
    city: string;
    postalCode: string;
    phone: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
};

export async function getActiveDiscountCodes(): Promise<DiscountCode[]> {
  // The device id lets the server also hide codes redeemed on this phone
  // before accounts existed (those rows have no userId). Resolved here
  // rather than passed in, so callers and the query hook stay unchanged.
  const deviceId = await getOrCreateDeviceId();
  const query = deviceId ? `?deviceId=${encodeURIComponent(deviceId)}` : "";
  return publicApiFetch<DiscountCode[]>(
    `/public/discount-codes/active${query}`,
    { method: "GET" },
  );
}

// POST /public/discount-codes/:code/redeem
// Returns success + updated discount + redemption row, or throws PublicApiError
// with errorCode: ALREADY_REDEEMED_BY_DEVICE | EXPIRED |
// MAX_REDEMPTIONS_REACHED | NOT_FOUND | INACTIVE.
type RedeemDiscountCodeSuccess = {
  success: true;
  discount: DiscountCode;
  redemption: {
    id: string;
    deviceId: string;
    branchId: string | null;
    discountCodeId: string;
    redeemedAt: string;
  };
};

export function redeemDiscountCode(args: {
  code: string;
  deviceId: string;
  branchId?: string;
}): Promise<RedeemDiscountCodeSuccess> {
  return publicApiFetch<RedeemDiscountCodeSuccess>(
    `/public/discount-codes/${encodeURIComponent(args.code)}/redeem`,
    {
      method: "POST",
      body: JSON.stringify({
        deviceId: args.deviceId,
        ...(args.branchId ? { branchId: args.branchId } : {}),
      }),
    }
  );
}

// ---------------------------------------------------------------------------
// Consumer accounts. Register/login are unauthenticated (via publicApiFetch,
// same typed-error pattern as the rest of this file); account deletion goes
// through apiFetch since it requires the Bearer token this module already
// attaches automatically once one is stored.
// ---------------------------------------------------------------------------

export type ConsumerAuthResponse = {
  token: string;
  user: ConsumerProfile;
};

export function registerConsumerUser(args: {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}): Promise<ConsumerAuthResponse> {
  // Long timeout deliberately: this is the first request a brand-new
  // customer ever makes, and it runs outside react-query so nothing retries
  // it on their behalf.
  return publicApiFetch<ConsumerAuthResponse>(
    "/public/auth/register",
    { method: "POST", body: JSON.stringify(args) },
    COLD_START_TIMEOUT_MS
  );
}

export function loginConsumerUser(args: {
  username: string;
  password: string;
}): Promise<ConsumerAuthResponse> {
  // Same reasoning as register: signing back in is often the first thing a
  // returning customer does after the backend has gone idle.
  return publicApiFetch<ConsumerAuthResponse>(
    "/public/auth/login",
    { method: "POST", body: JSON.stringify(args) },
    COLD_START_TIMEOUT_MS
  );
}

export function deleteConsumerAccountRequest(): Promise<void> {
  return apiFetch<void>("/public/auth/account", { method: "DELETE" });
}

export type ConsumerProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
};

export function getConsumerProfile(): Promise<ConsumerProfile> {
  return apiFetch<ConsumerProfile>("/public/auth/me", { method: "GET" });
}

// ---------------------------------------------------------------------------
// Loyalty program. All three routes require the consumer to be logged in,
// so they go through publicApiFetch (same typed-error handling as the rest
// of this file, and it already attaches the Bearer token when one exists).
// ---------------------------------------------------------------------------

export type LoyaltyTransactionType = "EARN" | "REDEEM";

export type LoyaltyTransaction = {
  id: string;
  points: number;
  type: LoyaltyTransactionType;
  note: string | null;
  createdAt: string;
  branch?: { name: string } | null;
};

export type LoyaltyRewardStatus = "ACTIVE" | "REDEEMED";

export type LoyaltyReward = {
  id: string;
  eurosValue: string;
  pointsSpent: number;
  status: LoyaltyRewardStatus;
  createdAt: string;
  redeemedAt: string | null;
};

export type LoyaltyMeResponse = {
  balance: number;
  transactions: LoyaltyTransaction[];
  rewards: LoyaltyReward[];
};

export function getLoyaltyMe(): Promise<LoyaltyMeResponse> {
  return publicApiFetch<LoyaltyMeResponse>("/public/loyalty/me", {
    method: "GET",
  });
}

export type RedeemLoyaltyResponse = {
  reward: { id: string; eurosValue: string };
  balance: number;
};

export function redeemLoyaltyPoints(
  points: number
): Promise<RedeemLoyaltyResponse> {
  return publicApiFetch<RedeemLoyaltyResponse>("/public/loyalty/redeem", {
    method: "POST",
    body: JSON.stringify({ points }),
  });
}
