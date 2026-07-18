import "react-native-gesture-handler";
import "../global.css";
import { useEffect, useState, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useRootNavigationState, Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { queryClient } from "@/lib/query-client";
import { onNotificationResponse } from "@/hooks/useNotifications";
import { OnboardingSplash } from "@/components";
import {
  hasSeenOnboarding,
  setHasSeenOnboarding,
} from "@/lib/onboarding";
import { useAppFonts } from "@/hooks/useFonts";
import { Home, ShoppingBag, Tag } from "lucide-react-native";

/**
 * expo-router auto-derives deep linking from the file-based routes plus
 * the `scheme` declared in app.json (`funfsterne://...`). Notification
 * taps that fire while the app is running are handled explicitly here
 * via `onNotificationResponse`, so we always land on the discount-codes
 * screen when the payload references a discount.
 */
function NotificationRouter() {
  const router = useRouter();
  const navState = useRootNavigationState();

  useEffect(() => {
    if (!navState?.key) return;
    const unsubscribe = onNotificationResponse(() => {
      router.push("/discount-codes");
    });
    return unsubscribe;
  }, [router, navState?.key]);

  return null;
}

// Keep the native splash screen visible until we've decided whether to
// show the animated onboarding or the main app.
SplashScreen.preventAutoHideAsync().catch(() => {
  // ignore
});

function AppNavigator() {
  const { theme } = useTheme();

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top", "left", "right"]}
    >
      <NotificationRouter />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            borderTopWidth: StyleSheet.hairlineWidth,
            height: 64 + (Platform.OS === "ios" ? 20 : 0),
            paddingBottom: Platform.OS === "ios" ? 20 : 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: theme.gold,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarLabelStyle: {
            fontFamily: "Inter_600SemiBold",
            fontSize: 11,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, size }) => (
              <Home size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="products"
          options={{
            title: "Shop",
            tabBarIcon: ({ color, size }) => (
              <ShoppingBag size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="discount-codes"
          options={{
            title: "Offers",
            tabBarIcon: ({ color, size }) => (
              <Tag size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="branches"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="notifications/permission"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="products/[id]"
          options={{
            href: null,
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}

export default function RootLayout() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const { fontsLoaded } = useAppFonts();

  useEffect(() => {
    let cancelled = false;
    hasSeenOnboarding().then((seen) => {
      if (cancelled) return;
      setShowOnboarding(!seen);
      SplashScreen.hideAsync().catch(() => {
        // ignore
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setHasSeenOnboarding(true).then(() => {
      setShowOnboarding(false);
    });
  }, []);

  if (!fontsLoaded || showOnboarding === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style="auto" />
          {showOnboarding ? (
            <ThemedOnboarding onComplete={handleOnboardingComplete} />
          ) : (
            <AppNavigator />
          )}
        </SafeAreaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

function ThemedOnboarding({ onComplete }: { onComplete: () => void }) {
  const { theme } = useTheme();
  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.background }}
      edges={["top", "left", "right"]}
    >
      <OnboardingSplash onComplete={onComplete} />
    </SafeAreaView>
  );
}
