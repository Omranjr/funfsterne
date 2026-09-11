import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Wallet } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { getWalletPassUrl } from "@/lib/api";
import { logSwallowed } from "@/lib/log";
import { borderRadius } from "@/constants/theme";
import { useArabicTextStyle } from "@/hooks/useArabicText";

/**
 * Adds the customer's loyalty QR to Apple Wallet.
 *
 * The whole point of the feature is speed after the cut: a double-tap of the
 * side button instead of unlock, find the app, wait for a cold backend, and
 * navigate to the loyalty tab.
 *
 * iOS does the work. Given a URL that answers with
 * `application/vnd.apple.pkpass`, opening it produces the native "Add to Apple
 * Wallet" sheet -- so there is no native module here, and nothing about the
 * native build changes.
 *
 * TODO before submission: Apple's Human Interface Guidelines ask for their
 * official, localised "Add to Apple Wallet" badge artwork rather than a
 * lookalike. The button below is deliberately plain -- a wallet glyph and a
 * label, not an imitation of the badge -- so that dropping the real asset in
 * is a clean swap and not a redesign.
 */
export function AddToWalletButton() {
  const { t } = useTranslation();
  const arabicText = useArabicTextStyle();
  const [busy, setBusy] = useState(false);

  // Android has no Wallet. Google Wallet is a separate implementation with its
  // own API and its own artwork, tracked separately.
  if (Platform.OS !== "ios") return null;

  const onPress = async () => {
    if (busy) return;
    setBusy(true);

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      const url = await getWalletPassUrl();

      // The token in this URL lives five minutes, so it is fetched at the
      // moment of the tap rather than held from an earlier render.
      const opened = await Linking.canOpenURL(url);
      if (!opened) {
        throw new Error("No handler for the pass URL");
      }

      await Linking.openURL(url);
    } catch (error) {
      logSwallowed("add-to-wallet", error);
      Alert.alert(
        t("loyalty.addToWalletErrorTitle"),
        t("loyalty.addToWalletErrorMessage")
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={t("loyalty.addToWallet")}
      accessibilityState={{ disabled: busy, busy }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        busy && styles.busy,
      ]}
    >
      <View style={styles.inner}>
        {busy ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Wallet size={18} color="#FFFFFF" />
        )}
        <Text style={[styles.label, arabicText]} numberOfLines={1}>
          {t("loyalty.addToWallet")}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // Apple's badge is black in both light and dark appearances, so these
  // colours are fixed rather than themed. Matching the app's surface here
  // would make it read as one of our own buttons, which it is not.
  button: {
    backgroundColor: "#000000",
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 18,
    marginTop: 14,
    alignSelf: "stretch",
  },
  pressed: {
    opacity: 0.82,
  },
  busy: {
    opacity: 0.6,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    // Keeps the row from being pushed wider than the button by a long
    // translation -- the label truncates instead.
    minWidth: 0,
  },
  label: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    flexShrink: 1,
  },
});
