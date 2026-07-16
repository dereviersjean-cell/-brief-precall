"use client";

import { useEffect, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "motion/react";

// Animates from whatever the motion value currently holds to `value` — a
// plain motion value driven imperatively (not React state re-renders per
// frame), read back into text via useMotionValueEvent. Re-runs on every
// `value` change rather than only on mount: server-rendered callers
// (dashboard) always have the final value by first render, so this looks
// like a single count-up from 0, but client components that fetch their
// stats after mount (e.g. /brief) start at 0 and only get the real value
// once the fetch resolves — animating once-only would freeze those at 0
// forever. `decimals` lets stat tiles reuse this for both integer counts
// (calls, briefs) and the one-decimal score.
export default function AnimatedNumber({ value, decimals = 0, duration = 0.9 }: { value: number; decimals?: number; duration?: number }) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState("0");

  useMotionValueEvent(motionValue, "change", (latest) => {
    setDisplay(latest.toFixed(decimals));
  });

  useEffect(() => {
    const controls = animate(motionValue, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
}
