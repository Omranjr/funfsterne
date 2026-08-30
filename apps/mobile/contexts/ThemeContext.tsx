import { useColorScheme } from "react-native";
import {
  useContext,
  createContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkTheme, lightTheme, type Theme, type ThemeMode } from "@/constants/theme";
import { logSwallowed } from "@/lib/log";

const THEME_STORAGE_KEY = "funfsterne-theme-mode";

/**
 * The order the toggle cycles through.
 *
 * "system" is in the cycle deliberately: the control used to flip only
 * between light and dark, so the first tap stranded the app on a fixed
 * theme with no way back to following the phone — short of clearing app
 * storage. Any three-state cycle has one step where the appearance does not
 * visibly change (leaving "dark" for "system" on a phone that is itself
 * dark), which is why the Account screen shows the mode by name rather than
 * relying on the icon alone.
 */
const MODE_CYCLE: ThemeMode[] = ["system", "light", "dark"];

interface ThemeContextValue {
  theme: Theme;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemMode = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setModeState(stored);
        }
      })
      .catch((error) => {
        // Falls back to "system", which is the right default anyway. This
        // used to be an unhandled rejection.
        logSwallowed("theme-mode-read", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch((error) => {
      logSwallowed("theme-mode-write", error);
    });
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const index = MODE_CYCLE.indexOf(prev);
      const next = MODE_CYCLE[(index + 1) % MODE_CYCLE.length];
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch((error) => {
        logSwallowed("theme-mode-write", error);
      });
      return next;
    });
  }, []);

  const theme =
    mode === "light"
      ? lightTheme
      : mode === "dark"
        ? darkTheme
        : systemMode === "dark"
          ? darkTheme
          : lightTheme;

  // Deliberately NOT gated on the stored mode having loaded. Doing that
  // would blank the whole app for one tick, and the flash it would prevent
  // is not visible anyway: this provider sits under the native splash, and
  // AnimatedSplash paints on `splashGround`, which is identical in both
  // themes. Storage resolves long before the splash fades, so the only
  // thing a gate here could add is a way for the entire app to render
  // nothing if that read ever misbehaved.
  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
