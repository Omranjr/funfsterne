/**
 * Reporting for failures that are deliberately non-fatal.
 *
 * Several places in the app swallow an error on purpose — a best-effort
 * storage write, a permission probe with a safe default. That shape is
 * right: the app must keep going. The problem is a bare `catch {}` leaves
 * nothing behind when the thing being swallowed is genuinely broken, which
 * is how a missing Firebase config turned into "this customer mysteriously
 * cannot receive notifications" instead of an error anyone could act on.
 *
 * This keeps the swallow and adds a trace. It is a no-op in production
 * builds today, and is the single place to hand these to a crash reporter
 * when one is added (see the "crash/error reporting" checklist item).
 */
export function logSwallowed(scope: string, error: unknown): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn(`[${scope}]`, error);
  }
}
