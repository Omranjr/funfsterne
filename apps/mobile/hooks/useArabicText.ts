import { Platform, type TextStyle } from "react-native";
import { useTranslation } from "react-i18next";

/**
 * Undoes the three Latin typographic habits that damage Arabic.
 *
 * The app's `micro` and `microXs` roles are IBM Plex Mono with generous
 * letter-spacing, usually uppercased by the screen that uses them. Every one
 * of those choices is wrong for Arabic:
 *
 *   letterSpacing  Arabic is a joined script. Spacing severs the connections
 *                  between letters, which is what turned "جارٍ التحميل" into
 *                  loose fragments on the splash screen.
 *   fontFamily     IBM Plex Mono carries no Arabic glyphs, so the text was
 *                  silently falling back to a system face anyway -- but at
 *                  the mono's metrics, which do not suit it.
 *   textTransform  There is no letter case in Arabic. Uppercasing is a no-op
 *                  at best and confuses some shapers at worst.
 *
 * Returns `null` for every other language, which React Native ignores in a
 * style array -- so Latin rendering is untouched, byte for byte.
 *
 * Append it LAST so it wins over both the typography role and whatever
 * uppercase the screen adds:
 *
 *   style={[typography.micro, styles.microUpper, arabicText, { color }]}
 */
export function useArabicTextStyle(): TextStyle | null {
  const { i18n } = useTranslation();

  if (i18n.language !== "ar") return null;
  return ARABIC_TEXT;
}

/**
 * Named explicitly rather than left undefined: clearing `fontFamily` by
 * setting it to undefined relies on how style flattening treats absent keys,
 * which is not something to depend on. These are the platform defaults, both
 * of which shape Arabic correctly.
 */
const ARABIC_TEXT: TextStyle = {
  fontFamily: Platform.select({
    ios: "System",
    android: "sans-serif",
    default: undefined,
  }),
  letterSpacing: 0,
  textTransform: "none",
};
