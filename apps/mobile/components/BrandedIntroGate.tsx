import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AnimatedSplash } from "./AnimatedSplash";
import { useInitialDataReady } from "@/hooks/usePublicData";

/**
 * Hosts the branded AnimatedSplash on top of the app shell and orchestrates
 * the fade-out handoff to the home screen.
 *
 * Timing rules (per the spec):
 *  - The splash must NEVER be cut short: we wait at least
 *    MIN_VISIBLE_MS (the visible content sequence + brief hold) so the
 *    wordmark and subtitle always have time to settle.
 *  - The splash must NEVER feel stuck: we cap the absolute wait at
 *    MAX_VISIBLE_MS — if data is still loading past this point (e.g. a
 *    flaky network) we hand off anyway with a slightly cut fade.
 *  - The actual fade-out takes FADE_OUT_MS and then the splash unmounts.
 */
const MIN_VISIBLE_MS = 2900; // photo + wordmark + subtitle fully played
const MAX_VISIBLE_MS = 4000; // hard cap so the splash never feels stuck
const FADE_OUT_MS = 600; // matches AnimatedSplash's FADE_OUT_DURATION

export interface BrandedIntroGateProps {
  children: React.ReactNode;
}

export function BrandedIntroGate({ children }: BrandedIntroGateProps) {
  const dataReady = useInitialDataReady();
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const dismissRef = useRef<(() => void) | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  // The unmount timer lives in a ref so it can be cancelled if this gate
  // goes away first (a crash caught by the boundary above, or a fast
  // reload in development). An orphaned timer calling setState on an
  // unmounted component is harmless in React 18, but it keeps the whole
  // gate -- and the splash beneath it -- alive in memory for its duration,
  // and leaving cleanup out is the kind of thing that stops being harmless
  // the moment someone adds real work to the callback.
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDismiss = () => {
    // Guard against a second call: the min-wait effect and the max-wait cap
    // can both fire, and two overlapping timers would leave one orphaned.
    if (unmountTimerRef.current !== null) return;

    setDismissed(true);
    dismissRef.current?.();
    // Unmount after the fade-out finishes so the home screen reveals
    // smoothly underneath.
    unmountTimerRef.current = setTimeout(() => {
      unmountTimerRef.current = null;
      setVisible(false);
    }, FADE_OUT_MS);
  };

  useEffect(() => {
    return () => {
      if (unmountTimerRef.current !== null) {
        clearTimeout(unmountTimerRef.current);
        unmountTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (dismissed) return;
    const elapsed = Date.now() - startedAtRef.current;
    if (!dataReady) {
      // Hard cap: if data still hasn't loaded by MAX_VISIBLE_MS, hand off
      // anyway so the splash never feels stuck. The fade will still play
      // out from wherever the photo+text animations happen to be.
      const remainingToCap = Math.max(0, MAX_VISIBLE_MS - elapsed);
      const capHandle = setTimeout(() => {
        if (!dismissed) triggerDismiss();
      }, remainingToCap);
      return () => clearTimeout(capHandle);
    }
    // Data is ready: hand off as soon as the minimum timeline has passed.
    const remainingToMin = Math.max(0, MIN_VISIBLE_MS - elapsed);
    const handle = setTimeout(() => {
      if (!dismissed) triggerDismiss();
    }, remainingToMin);
    return () => clearTimeout(handle);
    // We intentionally do NOT depend on `dismissed` here — we want each
    // tick of the data-ready transition to consider its own state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady, dismissed]);

  if (!visible) {
    return <>{children}</>;
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {children}
      <AnimatedSplash dismissRef={dismissRef} />
    </View>
  );
}
