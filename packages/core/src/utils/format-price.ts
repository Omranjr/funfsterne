/**
 * Safely format a price-like value for display.
 *
 * The API declares `basePrice: z.number()` and the database column is
 * `Decimal(10, 2)`. After the API-layer `serializePrisma` fix, the runtime
 * value is a JS number — but this helper is defensive in case a stale build,
 * a malformed DB row, or a manual override ever feeds a string or null in.
 *
 * - `null`, `undefined`, empty string → returns the fallback (default "—").
 * - Non-finite numbers (NaN, Infinity) → returns the fallback.
 * - Numbers, numeric strings, Decimal-like objects with `.toNumber()` → formatted.
 */
export function formatPrice(
  value: unknown,
  options: { fallback?: string; fractionDigits?: number } = {},
): string {
  const { fallback = "—", fractionDigits = 2 } = options;

  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  // Decimal-like (defensive — should not be needed post serializePrisma fix).
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  ) {
    value = (value as { toNumber: () => number }).toNumber();
  }

  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return fallback;
  }
  return num.toFixed(fractionDigits);
}
