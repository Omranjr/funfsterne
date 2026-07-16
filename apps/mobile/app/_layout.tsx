import "../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { theme } from "@/constants/theme";
import { queryClient } from "@/lib/query-client";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.colors.background },
            headerTintColor: theme.colors.text,
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="login" options={{ title: "Sign in" }} />
          <Stack.Screen name="verify" options={{ title: "Verify" }} />
          <Stack.Screen name="account" options={{ title: "Account" }} />
        </Stack>
      </View>
    </QueryClientProvider>
  );
}
