/**
 * Minimal colour maths for deriving theme tokens from a brand palette.
 *
 * Deliberately dependency-free and deliberately small: it only has to
 * handle the three operations `createThemes` needs (alpha, mix toward
 * another colour, and parsing the `#rgb`/`#rrggbb` a designer hands over).
 * Anything a brand needs beyond this it supplies literally, via
 * `AppTheme.tokens`.
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGB_FN = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i;

/**
 * Parses a colour to RGB. Returns null rather than throwing: a brand file
 * is hand-written, and one malformed value should degrade that single
 * derived token, not take down the whole app at boot.
 */
export function parseColor(value: string): Rgb | null {
  const short = HEX_SHORT.exec(value);
  if (short) {
    return {
      r: parseInt(short[1] + short[1], 16),
      g: parseInt(short[2] + short[2], 16),
      b: parseInt(short[3] + short[3], 16),
    };
  }

  const long = HEX_LONG.exec(value);
  if (long) {
    return {
      r: parseInt(long[1], 16),
      g: parseInt(long[2], 16),
      b: parseInt(long[3], 16),
    };
  }

  const fn = RGB_FN.exec(value);
  if (fn) {
    return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]) };
  }

  return null;
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** `#rrggbb` at the given alpha, as an `rgba()` string. */
export function withAlpha(color: string, alpha: number): string {
  const rgb = parseColor(color);
  if (!rgb) return color;
  return `rgba(${clampByte(rgb.r)},${clampByte(rgb.g)},${clampByte(rgb.b)},${alpha})`;
}

/** Linear blend: `amount` of 0 returns `from`, 1 returns `to`. */
export function mix(from: string, to: string, amount: number): string {
  const a = parseColor(from);
  const b = parseColor(to);
  if (!a || !b) return from;
  const t = Math.max(0, Math.min(1, amount));
  const hex = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  return `#${hex(a.r + (b.r - a.r) * t)}${hex(a.g + (b.g - a.g) * t)}${hex(
    a.b + (b.b - a.b) * t,
  )}`;
}

export const BLACK = "#000000";
export const WHITE = "#FFFFFF";

/** Darken toward black. */
export function darken(color: string, amount: number): string {
  return mix(color, BLACK, amount);
}

/** Lighten toward white. */
export function lighten(color: string, amount: number): string {
  return mix(color, WHITE, amount);
}
