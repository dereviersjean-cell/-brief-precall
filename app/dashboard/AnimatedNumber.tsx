"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useMotionValue, useMotionValueEvent } from "motion/react";

// Counts up from 0 to `value` on mount — a plain motion value driven
// imperatively (not React state re-renders per frame), read back into text
// via useMotionValueEvent. `decimals` lets stat tiles reuse this for both
// integer counts (calls, briefs) and the one-decimal score.
export default function AnimatedNumber({ value, decimals = 0, duration = 0.9 }: { value: number; decimals?: number; duration?: number }) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState("0");
  const hasAnimated = useRef(false);

  useMotionValueEvent(motionValue, "change", (latest) => {
    setDisplay(latest.toFixed(decimals));
  });

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;
    const controls = animate(motionValue, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display}</>;
}
