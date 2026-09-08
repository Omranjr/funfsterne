import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { storageKey } from "../brand/registry";

/**
 * Builds the query-cache persister for the active tenant.
 *
 * A factory rather than a module-level singleton because the storage key
 * has to be namespaced by tenant, and the tenant is only known once the app
 * entry point has called `configureBrand` — which happens after this module
 * is evaluated. `RootLayout` calls this once, inside a `useMemo`.
 *
 * Getting this wrong is not a cosmetic bug: an un-namespaced cache key
 * would let one customer's persisted product catalogue and offers rehydrate
 * into another customer's app.
 */
export function createPersister() {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    key: storageKey("query-cache"),
    // Debounces writes so rapid successive query updates (e.g. the home
    // screen's several parallel queries resolving in quick succession) don't
    // each trigger their own AsyncStorage write.
    throttleTime: 1000,
  });
}

// Bump this whenever a persisted query's shape changes incompatibly (e.g. a
// field renamed/removed in the API response) so old on-disk caches from a
// previous app version are discarded instead of rehydrating into code that
// no longer expects that shape.
//
// Bumped to v2 for the multi-tenant migration: responses are unchanged, but
// the cache key moved, and a stale v1 blob under the old key is now dead
// weight that will never be read again.
export const PERSIST_BUSTER = "v2";

// How long a persisted cache is trusted before being discarded outright
// (shown as "no data yet" and refetched fresh) rather than rehydrated and
// silently revalidated in the background.
export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
