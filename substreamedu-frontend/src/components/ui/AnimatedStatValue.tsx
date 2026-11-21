import React, { useEffect, useRef, useState } from 'react';

export interface AnimatedStatValueProps {
  value: number;
  format?: (value: number) => string;
  className?: string;
}

export const STAT_SPRING = { k: 160, c: 24 } as const;
const SUBSTEPS = 4;
const SETTLE_EPS = 0.08;

export const AnimatedStatValue: React.FC<AnimatedStatValueProps> = ({
  value,
  format = (n) => Math.round(n).toLocaleString(),
  className,
}) => {
  const safeTarget = Number.isFinite(value) ? value : 0;
  const [displayed, setDisplayed] = useState<number>(safeTarget);

  const springRef = useRef({ x: safeTarget, v: 0, t: safeTarget });
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || safeTarget === springRef.current.x) {
      springRef.current.x = safeTarget;
      springRef.current.t = safeTarget;
      springRef.current.v = 0;
      setDisplayed(safeTarget);
      return undefined;
    }

    springRef.current.t = safeTarget;

    const tick = (now: number) => {
      const rawDt = lastTimeRef.current
        ? Math.min((now - lastTimeRef.current) / 1000, 1 / 30)
        : 1 / 60;
      lastTimeRef.current = now;

      const s = springRef.current;
      for (let i = 0; i < SUBSTEPS; i++) {
        const dt = rawDt / SUBSTEPS;
        const a = -STAT_SPRING.k * (s.x - s.t) - STAT_SPRING.c * s.v;
        s.v += a * dt;
        s.x += s.v * dt;
      }

      if (Math.abs(s.x - s.t) < SETTLE_EPS && Math.abs(s.v) < SETTLE_EPS) {
        s.x = s.t;
        s.v = 0;
        setDisplayed(s.t);
        rafRef.current = 0;
        return;
      }

      setDisplayed(Math.round(s.x));
      rafRef.current = requestAnimationFrame(tick);
    };

    if (!rafRef.current) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [safeTarget]);

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums' }}>
      {format(displayed)}
    </span>
  );
};

export default AnimatedStatValue;
