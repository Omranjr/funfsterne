import React from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { X, MapPin } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { typography, borderRadius } from "@/constants/theme";
import { type Branch } from "@funfsterne/shared-types";

export interface BranchPickerProps {
  visible: boolean;
  branches: Branch[] | undefined;
  selectedBranchId: string | null;
  onSelect: (branch: Branch | null) => void;
  onClose: () => void;
}

export function BranchPicker({
  visible,
  branches,
  selectedBranchId,
  onSelect,
  onClose,
}: BranchPickerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const list = branches ?? [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.backdrop }]}
        onPress={onClose}
        accessibilityLabel={t("home.closeBranchPicker")}
      >
        {/* The sheet claims the touch itself. Without this, the backdrop
            Pressable above also receives taps that land on the sheet's own
            padding or header, so touching the sheet dismissed it. */}
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.hairlineStrong,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[typography.displayMd, { color: theme.text }]}>
              {t("home.selectBranch")}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.close}
              accessibilityRole="button"
              accessibilityLabel={t("home.closeBranchPicker")}
            >
              <X size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {list.length === 0 ? (
            <Text style={[typography.bodyMd, styles.empty, { color: theme.textMuted }]}>
              {t("home.noBranchesAvailable")}
            </Text>
          ) : (
            // Scrollable: the sheet is capped at 70% of the screen, so
            // without this a long branch list was simply cut off with no way
            // to reach the entries below the fold.
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.list}
            >
              {list.map((branch, index) => {
                const selected = selectedBranchId === branch.id;
                const isLast = index === list.length - 1;
                return (
                  <TouchableOpacity
                    key={branch.id}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      onSelect(selected ? null : branch);
                      onClose();
                    }}
                    style={[
                      styles.row,
                      {
                        backgroundColor: selected ? theme.muted : "transparent",
                        borderBottomColor: theme.hairline,
                        borderBottomWidth: isLast
                          ? 0
                          : StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <MapPin
                      size={18}
                      color={selected ? theme.gold : theme.textMuted}
                    />
                    <View style={styles.rowText}>
                      <Text
                        style={[
                          typography.bodyLg,
                          { color: selected ? theme.goldText : theme.text },
                        ]}
                      >
                        {branch.name}
                      </Text>
                      {branch.address ? (
                        <Text
                          style={[typography.bodyMd, { color: theme.textMuted }]}
                          numberOfLines={1}
                        >
                          {branch.address}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: borderRadius.sheet,
    borderTopRightRadius: borderRadius.sheet,
    paddingHorizontal: 16,
    paddingBottom: 32,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
  },
  close: {
    padding: 4,
  },
  list: {
    paddingBottom: 8,
  },
  empty: {
    paddingVertical: 24,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
