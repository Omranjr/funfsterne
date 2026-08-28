import { useCallback } from "react";
import {
  useFonts as useGoogleFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_600SemiBold,
} from "@expo-google-fonts/playfair-display";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
} from "@expo-google-fonts/manrope";
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
} from "@expo-google-fonts/ibm-plex-mono";

export function useAppFonts() {
  const [fontsLoaded, fontError] = useGoogleFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_600SemiBold,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
  });

  const loadFonts = useCallback(async () => {
    // useGoogleFonts handles loading automatically; this hook just exposes
    // a stable API for consumers that want to await font readiness.
    return fontsLoaded;
  }, [fontsLoaded]);

  return { fontsLoaded, fontError, loadFonts };
}
