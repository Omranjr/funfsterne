import "../global.css";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { theme } from "@/constants/theme";
import { queryClient } from "@/lib/query-client";
import { useNotificationDeepLink } from "@/hooks/useNotifications";

function NotificationRouter() {
  const router = useRouter();

  useNotificationDeepLink(() => {
    router.push({
      pathname: "/account",
      params: { highlightDiscounts: "true" },
    });
  });

  return null;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <StatusBar style="light" />
        <NotificationRouter />
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
          <Stack.Screen
            name="notifications/permission"
            options={{ title: "Notifications" }}
          />
        </Stack>
      </View>
    </QueryClientProvider>
  );
}
