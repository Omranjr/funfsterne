/**
 * Formats an amount as euros the way the chosen language writes them.
 *
 * German puts the symbol last with a comma -- "28,00 €" -- while the admin
 * was hardcoding "€" + toFixed(2) and producing the English form regardless
 * of the language switcher. The same fix was applied in the mobile app; these
 * two now agree, which matters because the owner reads a price in the admin
 * and then checks it in the app.
 *
 * Falls back to the old form if the browser has no usable Intl data for the
 * locale. A price must always render -- a thrown formatter would blank the
 * cell, which is worse than the wrong separator.
 */
export function formatEuro(value: unknown, locale: string): string {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return "—";

  try {
    return num.toLocaleString(locale, {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  } catch {
    return `€${num.toFixed(2)}`;
  }
}
