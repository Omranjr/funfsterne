import Constants from "expo-constants";
import { getAuthToken } from "./auth";
import type { Platform as PlatformType } from "@funfsterne/shared-types";

const extra = Constants.expoConfig?.extra ?? {};

export const API_BASE_URL =
  (extra.apiBaseUrl as string | undefined) ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  "http://localhost:4000";

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

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public, unauthenticated routes (accountless discount flow).
//
// These calls intentionally do NOT call getAuthToken() and do NOT attach an
// Authorization header. They use a dedicated error class so the UI can show
// the backend's typed `errorCode` (e.g. ALREADY_REDEEMED_BY_DEVICE) rather
// than a generic "API error" string.
// ---------------------------------------------------------------------------

export type PublicApiErrorCode =
  | "ALREADY_REDEEMED_BY_DEVICE"
  | "EXPIRED"
  | "MAX_REDEMPTIONS_REACHED"
  | "NOT_FOUND"
  | "INACTIVE";

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
    value === "EXPIRED" ||
    value === "MAX_REDEMPTIONS_REACHED" ||
    value === "NOT_FOUND" ||
    value === "INACTIVE"
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

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };

  const response = await fetch(url, {
    ...init,
    headers,
  });

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
