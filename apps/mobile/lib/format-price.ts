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


/**
 * Formats an amount as euros the way the customer's language writes them.
 *
 * German puts the symbol last and uses a comma: "28,00 €". English puts it
 * first with a point: "€28.00". Hardcoding "€" + toFixed(2) produced the
 * English form for everyone, which is a small thing that consistently reads
 * as "not built here" to a German customer.
 *
 * Falls back to the plain "€28.00" form if the runtime has no usable Intl
 * data. Money must always render: a thrown formatter would blank a price
 * tag, which is far worse than the wrong separator.
 */
export function formatCurrency(
  value: unknown,
  locale: string,
  options: { fallback?: string } = {},
): string {
  const { fallback = "—" } = options;
  const plain = formatPrice(value, { fallback });
  if (plain === fallback) return fallback;

  const num = Number(plain);
  if (!Number.isFinite(num)) return fallback;

  try {
    return num.toLocaleString(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return `€${plain}`;
  }
}
