import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, borderRadius } from "@/constants/theme";
import {
  SUPPORTED_LANGUAGES,
  changeLanguage,
  restartApp,
  type LanguageCode,
} from "@/lib/i18n";

export default function LanguageScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [switching, setSwitching] = useState<LanguageCode | null>(null);

  const handleSelect = useCallback(
    async (lang: LanguageCode) => {
      if (lang === i18n.language || switching) return;
      const target = SUPPORTED_LANGUAGES.find((l) => l.code === lang)!;

      setSwitching(lang);
      const { requiresRestart } = await changeLanguage(lang);

      if (requiresRestart) {
        Alert.alert(
          t("language.title"),
          t("language.restartNotice", { language: target.label }),
          [{ text: t("language.restartConfirm"), onPress: () => restartApp() }],
          { cancelable: false }
        );
        // Left spinning: the app is about to reload, so there's no useful
        // "done" state to return to on this screen.
      } else {
        setSwitching(null);
      }
    },
    [i18n.language, switching, t]
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: Math.max(insets.top, 24) },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            // Reachable as a deep link, where there is nothing to go back to.
            if (router.canGoBack()) router.back();
            else router.replace("/account");
          }}
          style={[styles.backButton, { backgroundColor: theme.border }]}
          accessibilityRole="button"
          accessibilityLabel={t("productDetail.goBack")}
        >
          <ChevronLeft size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t("language.title")}</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.list}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const selected = i18n.language === lang.code;
          return (
            <Pressable
              key={lang.code}
              onPress={() => handleSelect(lang.code)}
              disabled={switching !== null}
              style={[
                styles.row,
                { backgroundColor: theme.surface, borderColor: theme.hairlineStrong },
              ]}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text style={[styles.label, { color: theme.text }]}>{lang.label}</Text>
              {switching === lang.code ? (
                <ActivityIndicator color={theme.gold} />
              ) : selected ? (
                <Check size={20} color={theme.gold} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.displayMd,
  },
  list: {
    gap: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flag: {
    fontSize: 24,
  },
  label: {
    ...typography.bodyLg,
    flex: 1,
  },
});
