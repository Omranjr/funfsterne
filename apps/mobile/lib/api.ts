import Constants from "expo-constants";
import { getAuthToken } from "./auth";
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
const REQUEST_TIMEOUT_MS = 15000;

async function fetchWithTimeout(
  url: string,
  init?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
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
  | "USERNAME_TAKEN";

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
    value === "USERNAME_TAKEN"
  ) {
    return value;
  }
  return null;
}

async function publicApiFetch<T>(
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

  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
      ...init,
      headers,
    });
  } catch (err) {
    throw new PublicApiError(
      0,
      err instanceof Error ? err.message : "Network request failed",
      null
    );
  }

  if (!response.ok) {
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

export function getActiveDiscountCodes(): Promise<DiscountCode[]> {
  return publicApiFetch<DiscountCode[]>("/public/discount-codes/active", {
    method: "GET",
  });
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
  return publicApiFetch<ConsumerAuthResponse>("/public/auth/register", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export function loginConsumerUser(args: {
  username: string;
  password: string;
}): Promise<ConsumerAuthResponse> {
  return publicApiFetch<ConsumerAuthResponse>("/public/auth/login", {
    method: "POST",
    body: JSON.stringify(args),
  });
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
