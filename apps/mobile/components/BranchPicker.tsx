import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from "react-native";
import { X, MapPin } from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: theme.surface,
              borderTopColor: theme.border,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Select branch
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.close}>
              <X size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {branches?.map((branch) => {
            const selected = selectedBranchId === branch.id;
            return (
              <TouchableOpacity
                key={branch.id}
                activeOpacity={0.7}
                onPress={() => {
                  onSelect(selected ? null : branch);
                  onClose();
                }}
                style={[
                  styles.row,
                  {
                    backgroundColor: selected
                      ? theme.border
                      : "transparent",
                    borderBottomColor: theme.border,
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
                      styles.branchName,
                      { color: selected ? theme.gold : theme.text },
                    ]}
                  >
                    {branch.name}
                  </Text>
                  <Text
                    style={[styles.branchAddress, { color: theme.textMuted }]}
                    numberOfLines={1}
                  >
                    {branch.address}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
  },
  close: {
    padding: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  branchName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  branchAddress: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
});
