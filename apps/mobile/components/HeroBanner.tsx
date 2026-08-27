import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MapPin, ChevronRight, Store } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { ThemeToggle } from "./ThemeToggle";
import { type Branch } from "@funfsterne/shared-types";

export interface HeroBannerProps {
  selectedBranch: Branch | null | undefined;
  branches: Branch[] | undefined;
  onSelectBranch: (branch: Branch | null) => void;
  onOpenBranchPicker: () => void;
}

export function HeroBanner({
  selectedBranch,
  branches,
  onOpenBranchPicker,
}: HeroBannerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();

  const hasBranches = (branches?.length ?? 0) > 0;

  const gradientColors: [string, string, string] =
    theme.mode === "dark"
      ? ["#2b2620", "#14120f", "#0a0908"]
      : ["#efe8d8", "#e4d9c2", "#d8c9a8"];

  return (
    <View style={[styles.container, { width: width - 32 }]}>
      <LinearGradient
        colors={gradientColors}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <View style={[styles.overlay, { paddingTop: 16 }]}>
        <View style={styles.topRow}>
          <View style={{ width: 36 }} />
          <ThemeToggle
            style={{
              backgroundColor:
                theme.mode === "dark"
                  ? "rgba(0,0,0,0.25)"
                  : "rgba(255,255,255,0.35)",
            }}
          />
        </View>

        <View style={styles.brand}>
          <Text style={[styles.wordmark, { color: theme.gold }]} numberOfLines={1}>
            Fünf Sterne
          </Text>
          <Text style={[styles.tagline, { color: theme.textMuted }]} numberOfLines={1}>
            {t("home.tagline")}
          </Text>
        </View>

        {hasBranches ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onOpenBranchPicker}
            style={[
              styles.branchRow,
              {
                backgroundColor: theme.border,
              },
            ]}
          >
            <MapPin size={16} color={theme.gold} />
            <View style={styles.branchText}>
              <Text
                style={[styles.branchName, { color: theme.text }]}
                numberOfLines={1}
              >
                {selectedBranch ? selectedBranch.name : t("home.selectBranch")}
              </Text>
              {selectedBranch?.address ? (
                <Text
                  style={[styles.branchAddress, { color: theme.textMuted }]}
                  numberOfLines={1}
                >
                  {selectedBranch.address}
                </Text>
              ) : null}
            </View>
            <ChevronRight size={16} color={theme.textMuted} />
          </TouchableOpacity>
        ) : (
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: theme.border,
                borderColor: theme.border,
              },
            ]}
          >
            <Store size={14} color={theme.gold} />
            <Text style={[styles.statusText, { color: theme.textMuted }]}>
              {t("home.noBranchesAvailable")}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: "hidden",
    alignSelf: "center",
  },
  overlay: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 16,
    justifyContent: "flex-start",
    gap: 12,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  brand: {
    gap: 2,
  },
  wordmark: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 26,
    letterSpacing: -0.3,
  },
  tagline: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  branchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  branchText: {
    flex: 1,
    gap: 2,
  },
  branchName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  branchAddress: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
