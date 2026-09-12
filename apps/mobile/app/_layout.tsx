import "react-native-gesture-handler";
import "../global.css";
import { useEffect, useState } from "react";
import {
  View,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useRouter, useRootNavigationState, Tabs } from "expo-router";
import {
  House,
  ShoppingBag,
  TicketPercent,
  Star,
  User,
  type LucideIcon,
} from "lucide-react-native";
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
import {
  onNotificationResponse,
  consumeInitialNotificationResponse,
  toStatus,
} from "@/hooks/useNotifications";
import {
  SignUpScreen,
  LogInScreen,
  BrandedIntroGate,
  ErrorBoundary,
} from "@/components";
import { hasBeenPrompted } from "@/lib/notification-permission";
import { useAppFonts } from "@/hooks/useFonts";
import { usePushTokenSync } from "@/hooks/usePushTokenSync";
import { initI18n } from "@/lib/i18n";
import { logSwallowed } from "@/lib/log";
import { useTranslation } from "react-i18next";

/**
 * Tab glyphs. Each tab renders its own icon above the Plex Mono label, and
 * the icon carries the focused/unfocused colour the same way the label does.
 */
const TAB_ICON_SIZE = 21;

/**
 * The Rewards tab, raised on a gold disc.
 *
 * Rewards sits in the centre because it is the tab customers open under time
 * pressure with a barber waiting, and the centre is the easiest reach on a
 * phone held one-handed. Offers, which used to be there, is browsed at
 * leisure and can take the harder slot.
 *
 * The disc is gold whether or not the tab is active. Everywhere else in this
 * bar gold means "you are here", which lights up precisely when you no longer
 * need to find it -- a destination the app is pointing at has to look
 * different from a state. What focus changes is the star's fill, not the
 * disc.
 *
 * Sizing is deliberately modest. The icon inside is the same TAB_ICON_SIZE as
 * every other tab, so the disc reads as a sibling wearing a coin rather than
 * a different species; at 46pt it crowns only ~11pt above the bar, which is
 * enough to read as raised without towering over the row.
 */
const REWARD_DISC = 46;
const REWARD_DISC_RING = 4;
const REWARD_DISC_LIFT = 20;

function RewardTabIcon({ focused }: { color: string; focused: boolean }) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        styles.rewardDisc,
        {
          backgroundColor: theme.gold,
          // Ring in the bar's own colour, so the disc reads as floating above
          // the bar rather than punched through it.
          borderColor: theme.groundDeep,
        },
      ]}
    >
      <Star
        size={TAB_ICON_SIZE}
        color={theme.onGold}
        fill={focused ? theme.onGold : "transparent"}
        strokeWidth={focused ? 2.1 : 1.8}
      />
    </View>
  );
}

function tabIcon(Icon: LucideIcon) {
  return function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    return (
      <Icon
        size={TAB_ICON_SIZE}
        color={color}
        // A slightly heavier stroke on the active tab so the gold reads as
        // selected even at a glance, without changing the icon's size.
        strokeWidth={focused ? 2.1 : 1.6}
      />
    );
  };
}

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

    // The tap that launched a closed app is delivered only through
    // getLastNotificationResponseAsync -- the listener below never sees it.
    void consumeInitialNotificationResponse(() => {
      if (!cancelled) router.push("/discount-codes");
    });

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

/**
 * Hard ceiling on how long the native splash may stay up.
 *
 * `BootSequence` hides it as soon as auth resolves, but `BootSequence` is
 * itself gated behind fonts AND i18n -- so anything that keeps either from
 * settling means nothing ever calls `hideAsync`, and the native splash
 * (the same owner photo the animated splash uses, which is why the two are
 * indistinguishable) covers the app forever. That is a total outage from a
 * failure in a purely cosmetic dependency.
 *
 * Generous enough that a healthy boot never reaches it. If it does fire,
 * the customer sees the loading indicator underneath instead of a frozen
 * photo -- still wrong, but visibly alive and recoverable.
 */
const NATIVE_SPLASH_MAX_MS = 8000;

function AppNavigator() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  // Re-registers the push token whenever the app comes to the foreground;
  // the one-shot registration on the permission screen was unrecoverable
  // if it ever failed. See usePushTokenSync for the full reasoning.
  usePushTokenSync();

  return (
    // Deliberately no "top" edge: the Home hero is full-bleed to y:0 with
    // the status bar floating over it. An opaque top inset here would put a
    // solid strip above the photo and clip the portrait. Screens that do
    // need a top inset apply it themselves via useSafeAreaInsets().
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.ground }}
      edges={["left", "right"]}
    >
      <NotificationRouter />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.groundDeep,
            borderTopColor: theme.hairlineStrong,
            borderTopWidth: StyleSheet.hairlineWidth,
            // The bar owns the bottom inset itself (the root SafeAreaView
            // deliberately doesn't claim it, so the Home hero can run
            // full-bleed). Without this the labels sit under the home
            // indicator / gesture pill on devices that have one.
            height: 72 + insets.bottom,
            // The Rewards disc is lifted above the bar's top edge; without
            // this it is clipped flat and the whole effect disappears.
            overflow: "visible",
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 9,
          },
          tabBarActiveTintColor: theme.gold,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarLabelStyle: {
            // Plex Mono medium at 10dp: 9dp is the design's floor, but the
            // mono's thin strokes lose legibility there on device, and the
            // spec allows 9.5–10 provided family and tracking hold.
            fontFamily: "IBMPlexMono_500Medium",
            fontSize: 10,
            letterSpacing: 1.4, // ≈0.14em at 10dp
            textTransform: "uppercase",
          },
          tabBarItemStyle: {
            paddingTop: 2,
            overflow: "visible",
          },
          tabBarIconStyle: {
            marginBottom: 1,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: t("tabs.home"), tabBarIcon: tabIcon(House) }}
        />
        <Tabs.Screen
          name="products"
          options={{ title: t("tabs.shop"), tabBarIcon: tabIcon(ShoppingBag) }}
        />
        {/* Centre slot. See RewardTabIcon for why. */}
        <Tabs.Screen
          name="loyalty"
          options={{ title: t("tabs.rewards"), tabBarIcon: RewardTabIcon }}
        />
        <Tabs.Screen
          name="discount-codes"
          options={{ title: t("tabs.offers"), tabBarIcon: tabIcon(TicketPercent) }}
        />
        <Tabs.Screen
          name="account"
          options={{ title: t("tabs.account"), tabBarIcon: tabIcon(User) }}
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
        <Tabs.Screen
          name="language"
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

  // Hand the native splash over to the animated one the moment this
  // component can paint -- NOT when auth finishes.
  //
  // Waiting on `!isLoading` meant the native splash stayed up for the whole
  // session check. That check only runs when a token exists, and on iOS the
  // token lives in the Keychain, which survives deleting the app (the note
  // in lib/notification-permission.ts spells this out). So the very first
  // launch after reinstalling finds an old token, validates it against a
  // backend that is usually asleep, and holds the splash for the entire
  // round trip -- tens of seconds of a frozen photo that looks identical to
  // the animated splash, because it is the same image.
  //
  // Nothing is exposed by hiding early: BrandedIntroGate renders the
  // animated splash over whatever is beneath it, including the loading
  // spinner this component shows while `isLoading` is true. The handoff is
  // invisible, and the gate has its own cap so it always clears.
  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {
      // Already hidden, or unavailable -- neither is a problem.
    });
  }, []);

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
  const [i18nReady, setI18nReady] = useState(false);

  // Runs from the one component that is never gated behind anything.
  useEffect(() => {
    const handle = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {
        // Already hidden, or the module is unavailable. Either is fine.
      });
    }, NATIVE_SPLASH_MAX_MS);
    return () => clearTimeout(handle);
  }, []);

  useEffect(() => {
    let cancelled = false;
    initI18n()
      .catch((error) => {
        // Without this the app hangs on the bare spinner below, forever,
        // with no branding and no way out -- `initI18n` touches
        // AsyncStorage twice and `changeLanguage` once, any of which can
        // reject. i18next is already initialised at module load with
        // English resources and `lng: "en"`, so carrying on simply means
        // the customer gets English instead of their stored preference.
        // The same reasoning the font gate below already applies: a visual
        // downgrade beats a dead end.
        logSwallowed("i18n-init", error);
      })
      .finally(() => {
        // If initI18n triggered a native RTL mismatch fix, it also calls
        // Updates.reloadAsync() -- this session is being torn down, so
        // there's no point flipping i18nReady here (and in the (rare) case
        // reload isn't available, proceeding with a language whose RTL
        // flag doesn't yet match the native layout would look broken).
        if (!cancelled) setI18nReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // If custom font loading ever errors out (corrupted asset, low-memory
  // eviction, etc.), fontsLoaded would otherwise stay false forever and
  // strand the user on this spinner permanently. Proceeding on fontError
  // means custom fontFamily styles silently fall back to the platform
  // default font instead -- a visual downgrade, not a dead end. This gate
  // runs before any provider mounts, so it can't use the theme yet.
  if ((!fontsLoaded && !fontError) || !i18nReady) {
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
  rewardDisc: {
    width: REWARD_DISC,
    height: REWARD_DISC,
    borderRadius: REWARD_DISC / 2,
    borderWidth: REWARD_DISC_RING,
    alignItems: "center",
    justifyContent: "center",
    // Pulls the disc up out of the icon row, then gives back the height it
    // would otherwise still claim. A 46pt disc lifted 20pt occupies 26pt of
    // row where every other tab occupies 21, which would push this one label
    // 5pt below its neighbours -- exactly the kind of near-miss that reads as
    // broken without being obviously wrong. The pair leaves the icon slot the
    // same height as all the others, so only the disc moves.
    marginTop: -REWARD_DISC_LIFT,
    marginBottom: -(REWARD_DISC - REWARD_DISC_LIFT - TAB_ICON_SIZE),
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
