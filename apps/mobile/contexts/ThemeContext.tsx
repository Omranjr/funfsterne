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

const THEME_STORAGE_KEY = "funfsterne-theme-mode";

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
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (cancelled) return;
      if (stored === "light" || stored === "dark" || stored === "system") {
        setModeState(stored);
      }
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {
      // ignore
    });
  }, []);

  const toggle = useCallback(() => {
    setModeState((prev) => {
      const resolved =
        prev === "system"
          ? systemMode === "dark"
            ? "dark"
            : "light"
          : prev;
      const next = resolved === "dark" ? "light" : "dark";
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch(() => {
        // ignore
      });
      return next;
    });
  }, [systemMode]);

  const theme =
    mode === "light"
      ? lightTheme
      : mode === "dark"
        ? darkTheme
        : systemMode === "dark"
          ? darkTheme
          : lightTheme;

  // Use system theme until storage is read to avoid a blank flash.
  const effectiveTheme =
    mode === "light"
      ? lightTheme
      : mode === "dark"
        ? darkTheme
        : systemMode === "dark"
          ? darkTheme
          : lightTheme;

  return (
    <ThemeContext.Provider
      value={{ theme: effectiveTheme, mode, setMode, toggle }}
    >
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
