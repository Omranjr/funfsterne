import "react-native-gesture-handler";
import "../global.css";
import { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useRootNavigationState, Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import * as Notifications from "expo-notifications";
import { ThemeProvider, useTheme } from "@/contexts/ThemeContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/query-client";
import {
  asyncStoragePersister,
  PERSIST_BUSTER,
  PERSIST_MAX_AGE,
} from "@/lib/persist-client";
import { onNotificationResponse, toStatus } from "@/hooks/useNotifications";
import {
  SignUpScreen,
  LogInScreen,
  BrandedIntroGate,
  ErrorBoundary,
} from "@/components";
import { hasBeenPrompted } from "@/lib/notification-permission";
import { useAppFonts } from "@/hooks/useFonts";
import { Home, ShoppingBag, Tag, User } from "lucide-react-native";

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

    let cancelled = false;
    (async () => {
      const prompted = await hasBeenPrompted();
      if (cancelled) return;

      if (prompted === null) {
        // First launch after account creation (or an existing install that
        // never saw this screen) — send them through the pre-permission
        // screen, which self-redirects to /discount-codes once resolved.
        router.replace("/notifications/permission");
        return;
      }

      if (prompted === "granted" || prompted === "denied") {
        // Our flag can only be "granted"/"denied" immediately after the
        // real OS prompt actually returned that same answer, so those two
        // values should always agree with the OS's live status. If the OS
        // now reports "undetermined" instead, our stored flag is stale
        // (e.g. restored from an iCloud/Android backup onto a fresh
        // install) rather than reflecting reality -- re-run the flow
        // instead of silently trusting a flag the OS itself disagrees
        // with. ("pending", from the user tapping "Not now", is left
        // alone: the OS legitimately stays undetermined in that case too,
        // since we never showed it the real prompt.)
        try {
          const response = await Notifications.getPermissionsAsync();
          if (!cancelled && toStatus(response) === "undetermined") {
            router.replace("/notifications/permission");
          }
        } catch {
          // Best-effort cross-check; if it fails just trust the stored flag.
        }
      }
    })();

    const unsubscribe = onNotificationResponse(() => {
      router.push("/discount-codes");
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [router, navState?.key]);

  return null;
}

// Keep the native splash screen visible until we've decided whether to
// show the account flow or the main app.
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
          name="account"
          options={{
            title: "Account",
            tabBarIcon: ({ color, size }) => (
              <User size={size} color={color} />
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

// Decides what to render once fonts are ready: the account flow (sign up /
// log in) while unauthenticated, or the main app once logged in. Split out
// from RootLayout because it needs useAuth()/useTheme(), which only work
// once their providers are mounted -- RootLayout itself renders those
// providers, so it can't call the hooks they provide.
function BootSequence() {
  const { theme } = useTheme();
  const { isLoading, isAuthenticated } = useAuth();
  const [authMode, setAuthMode] = useState<"signUp" | "logIn">("signUp");

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {
        // ignore
      });
    }
  }, [isLoading]);

  // BrandedIntroGate now wraps every path (auth screens included, not just
  // the post-login app) so the branded loading animation always plays
  // before the very first thing the user sees, whether that's sign-up or
  // the home screen. It renders `children` immediately underneath its own
  // overlay, so whichever branch below is "ready" first just waits
  // invisibly for the gate's timing to finish before it's revealed.
  return (
    <BrandedIntroGate>
      {isLoading ? (
        <View
          style={[
            styles.center,
            { flex: 1, backgroundColor: theme.background },
          ]}
        >
          <ActivityIndicator color={theme.gold} />
        </View>
      ) : !isAuthenticated ? (
        <SafeAreaView
          style={{ flex: 1, backgroundColor: theme.background }}
          edges={["top", "left", "right"]}
        >
          {authMode === "signUp" ? (
            <SignUpScreen onSwitchToLogIn={() => setAuthMode("logIn")} />
          ) : (
            <LogInScreen onSwitchToSignUp={() => setAuthMode("signUp")} />
          )}
        </SafeAreaView>
      ) : (
        <AppNavigator />
      )}
    </BrandedIntroGate>
  );
}

export default function RootLayout() {
  const { fontsLoaded, fontError } = useAppFonts();

  // If custom font loading ever errors out (corrupted asset, low-memory
  // eviction, etc.), fontsLoaded would otherwise stay false forever and
  // strand the user on this spinner permanently. Proceeding on fontError
  // means custom fontFamily styles silently fall back to the platform
  // default font instead -- a visual downgrade, not a dead end. This gate
  // runs before any provider mounts, so it can't use the theme yet.
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: asyncStoragePersister,
            buster: PERSIST_BUSTER,
            maxAge: PERSIST_MAX_AGE,
          }}
        >
          <AuthProvider>
            <ThemeProvider>
              <SafeAreaProvider>
                <StatusBar style="auto" />
                <BootSequence />
              </SafeAreaProvider>
            </ThemeProvider>
          </AuthProvider>
        </PersistQueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
