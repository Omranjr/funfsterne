import React from "react";
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  type TextInputProps,
  type ViewStyle,
  type TextStyle,
  type StyleProp,
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

export interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  labelStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
}

export function Input({
  label,
  error,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  placeholderTextColor,
  ...textInputProps
}: InputProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { gap: 4 }, containerStyle]}>
      {label ? (
        <Text style={[styles.label, { color: theme.text }, labelStyle]}>{label}</Text>
      ) : null}
      <TextInput
        {...textInputProps}
        placeholderTextColor={placeholderTextColor ?? theme.textMuted}
        style={[
          styles.input,
          {
            backgroundColor: theme.surface,
            borderColor: error ? "#EF4444" : theme.muted,
            color: theme.text,
          },
          inputStyle,
        ]}
      />
      {error ? (
        <Text style={[styles.error, errorStyle]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // gap set dynamically
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    minHeight: 48,
  },
  error: {
    fontSize: 12,
    color: "#EF4444",
  },
});
