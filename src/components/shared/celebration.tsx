"use client";

import { useEffect, useRef, useState } from "react";
import { fireConfetti } from "@/lib/confetti";

/**
 * Hook that fires confetti on demand and exposes a `celebrate` function.
 * Stays mounted across view transitions (render once near root).
 */
export function useCelebration() {
  return {
    celebrate: (opts?: Parameters<typeof fireConfetti>[0]) => fireConfetti(opts),
  };
}

/**
 * Animated count-up number. Renders Bengali numerals.
 * Re-runs when `value` changes.
 */
export function AnimatedNumber({
  value,
  duration = 800,
  className,
  format,
}: {
  value: number;
  duration?: number;
  className?: string;
  format?: (n: number) => string;
}) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prevRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  const bn = toBn(display);
  return <span className={className}>{format ? format(display) : bn}</span>;
}

function toBn(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => "০১২৩৪৫৬৭৮৯"[Number(d)]);
}
