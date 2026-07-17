import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  type ViewStyle,
  type StyleProp,
} from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

export interface ScreenWrapperProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  testID?: string;
}

export function ScreenWrapper({
  children,
  style,
  scrollable = false,
  refreshing,
  onRefresh,
  testID,
}: ScreenWrapperProps) {
  const { theme } = useTheme();

  if (scrollable) {
    return (
      <ScrollView
        testID={testID}
        style={[{ flex: 1, backgroundColor: theme.background }, style]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing ?? false}
              onRefresh={onRefresh}
              tintColor={theme.gold}
              colors={[theme.gold]}
            />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    );
  }

  return (
    <View testID={testID} style={[{ flex: 1, backgroundColor: theme.background }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
  },
});
