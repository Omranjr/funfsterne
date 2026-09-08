import { QueryClient } from "@tanstack/react-query";

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
