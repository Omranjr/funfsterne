import { useEffect, useState } from "react";

/** How long something runs before it stops feeling like a normal wait. */
const SLOW_AFTER_MS = 6000;

/**
 * True once `active` has been continuously true for longer than a normal
 * request should take.
 *
 * Signing in or signing up can legitimately take the best part of a minute
 * when the backend has gone idle and has to start up. A spinner that long
 * reads as a frozen app, so the screens use this to swap in a message that
 * says it is still working. Resets the moment the operation ends, so a fast
 * request never shows it at all.
 */
export function useSlowOperation(
  active: boolean,
  delayMs: number = SLOW_AFTER_MS,
): boolean {
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setIsSlow(false);
      return;
    }
    const handle = setTimeout(() => setIsSlow(true), delayMs);
    return () => clearTimeout(handle);
  }, [active, delayMs]);

  return isSlow;
}
