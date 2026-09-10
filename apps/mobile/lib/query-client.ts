import { QueryClient, focusManager } from "@tanstack/react-query";
import { AppState, type AppStateStatus } from "react-native";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      // Persisted cache (see lib/persist-client.ts) rehydrates whatever is
      // still in the in-memory cache at gcTime's cutoff -- this needs to
      // comfortably outlive a normal close-and-reopen gap so returning
      // users get an instant paint from disk instead of an empty cache.
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
    },
  },
});

/**
 * Teaches React Query what "the app came back" means on a phone.
 *
 * `refetchOnWindowFocus` defaults to true, but it listens for a browser
 * focus event that does not exist in React Native -- so without this it
 * never fires, and neither does anything else: the tab screens stay mounted
 * for the life of the process, so `refetchOnMount` is a one-time event too.
 * The practical result was that `staleTime` marked data stale and then
 * nothing ever acted on it. A discount code added in the admin could sit
 * invisible in the app indefinitely, because the only path to fresh data was
 * a manual pull-to-refresh.
 *
 * Registered here rather than in a component so it is installed exactly
 * once, alongside the client it belongs to.
 */
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener(
    "change",
    (status: AppStateStatus) => {
      // "inactive" is the brief in-between state iOS reports while the app
      // switcher animates; treating it as blurred would fire a refetch on
      // every glance at the multitasker.
      handleFocus(status === "active");
    },
  );

  return () => subscription.remove();
});
