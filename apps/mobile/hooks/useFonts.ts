import { useCallback } from "react";
import {
  useFonts as useGoogleFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

export function useAppFonts() {
  const [fontsLoaded, fontError] = useGoogleFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const loadFonts = useCallback(async () => {
    // useGoogleFonts handles loading automatically; this hook just exposes
    // a stable API for consumers that want to await font readiness.
    return fontsLoaded;
  }, [fontsLoaded]);

  return { fontsLoaded, fontError, loadFonts };
}
