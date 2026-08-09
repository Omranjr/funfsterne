import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

const PERSIST_KEY = "funfsterne-query-cache";

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: PERSIST_KEY,
  // Debounces writes so rapid successive query updates (e.g. the home
  // screen's several parallel queries resolving in quick succession) don't
  // each trigger their own AsyncStorage write.
  throttleTime: 1000,
});

// Bump this whenever a persisted query's shape changes incompatibly (e.g. a
// field renamed/removed in the API response) so old on-disk caches from a
// previous app version are discarded instead of rehydrating into code that
// no longer expects that shape.
export const PERSIST_BUSTER = "v1";

// How long a persisted cache is trusted before being discarded outright
// (shown as "no data yet" and refetched fresh) rather than rehydrated and
// silently revalidated in the background.
export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours
