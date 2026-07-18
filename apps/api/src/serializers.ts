/**
 * Walk a Prisma result and convert any Decimal-like values to plain numbers
 * so that JSON-serialized responses match the Zod schemas in @funfsterne/shared-types
 * (which declare monetary fields as `z.number()`).
 *
 * Prisma's `Decimal` type serializes to a string in `JSON.stringify` (this is
 * intentional — it preserves precision for arbitrary-precision values). The
 * downside is that clients that expect a number per the schema contract crash
 * on `.toFixed()` or arithmetic.
 *
 * For our schema (`Decimal(10, 2)` → max value 99,999,999.99) the conversion
 * to `Number` is safe — it is well within `Number.MAX_SAFE_INTEGER`. If we
 * later need higher precision we should switch the response shape to use a
 * stringified Decimal explicitly and update the shared schema accordingly.
 *
 * Detection: any object that has a zero-argument `toNumber` function. This
 * is exactly what `Prisma.Decimal` instances expose.
 */
type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

function isPrismaDecimal(value: unknown): value is { toNumber(): number } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toNumber?: unknown }).toNumber === "function"
  );
}

function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function serializePrisma<T>(value: T): Json {
  if (value === null || value === undefined) return null;
  if (isPrismaDecimal(value)) {
    return value.toNumber();
  }
  if (isDate(value)) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializePrisma(item)) as Json;
  }
  if (typeof value === "object") {
    const out: { [key: string]: Json } = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = serializePrisma(v);
    }
    return out;
  }
  // Primitives — pass through.
  return value as Json;
}
