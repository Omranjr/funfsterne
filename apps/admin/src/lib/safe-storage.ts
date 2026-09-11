/**
 * localStorage that cannot take the app down with it.
 *
 * Reading or writing localStorage throws in more situations than it looks:
 * Safari in a private tab reports a quota of zero, so `setItem` raises
 * QuotaExceededError; a browser set to block site data throws on access
 * outright; and some embedded webviews have no storage at all.
 *
 * That matters here because the admin is used mostly on a phone, mostly in
 * Safari. An unguarded write inside a React effect or event handler is an
 * uncaught error, which the nearest boundary turns into a full-screen crash
 * -- losing the whole dashboard because a preference could not be saved.
 *
 * Everything here degrades instead: a read that fails returns null, a write
 * that fails is dropped. The setting reverts next visit, which is a far
 * smaller problem than the page disappearing.
 *
 * The inline anti-flash script in `app/layout.tsx` already guards its own
 * access this way; this brings the rest of the app in line.
 */

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Preference not persisted. Deliberately silent: there is nothing the
    // person can do about it, and it does not affect the current session.
  }
}
