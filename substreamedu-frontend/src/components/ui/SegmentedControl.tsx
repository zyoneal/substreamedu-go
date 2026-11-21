import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { cn } from '../../lib/utils';
import styles from './SegmentedControl.module.css';

export interface SegmentedOption<T extends string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  ariaLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  roleMode?: 'tablist' | 'group';
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md';
  disabled?: boolean;
  className?: string;
}

interface SpringState {
  x: number;
  v: number;
  t: number;
  k: number;
  c: number;
}

export const PILL_POS_SPRING = { k: 380, c: 28 } as const;
export const PILL_WIDTH_SPRING = { k: 360, c: 28 } as const;
const SUBSTEPS = 4;
const SETTLE_EPS = 0.05;

function createSpring(x: number, k: number, c: number): SpringState {
  return { x, v: 0, t: x, k, c };
}

function tuneSpring(s: SpringState, k: number, c: number, reduced: boolean) {
  s.k = k;
  s.c = reduced ? 2 * Math.sqrt(k) : c;
}

function stepSpring(s: SpringState, dt: number) {
  const a = -s.k * (s.x - s.t) - s.c * s.v;
  s.v += a * dt;
  s.x += s.v * dt;
}

function isSettled(s: SpringState) {
  return Math.abs(s.x - s.t) < SETTLE_EPS && Math.abs(s.v) < SETTLE_EPS;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  roleMode = 'tablist',
  variant = 'light',
  size = 'md',
  disabled = false,
  className,
}: SegmentedControlProps<T>): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const initializedRef = useRef(false);
  const reducedRef = useRef(false);

  const posSpringRef = useRef<SpringState>(createSpring(0, PILL_POS_SPRING.k, PILL_POS_SPRING.c));
  const widthSpringRef = useRef<SpringState>(createSpring(0, PILL_WIDTH_SPRING.k, PILL_WIDTH_SPRING.c));

  const activeIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value)
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => {
      reducedRef.current = query.matches;
    };
    sync();
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', sync);
      return () => query.removeEventListener('change', sync);
    }
    return undefined;
  }, []);

  const paint = useCallback(() => {
    const pill = pillRef.current;
    if (!pill) return;
    const x = posSpringRef.current.x;
    const w = Math.max(0, widthSpringRef.current.x);
    pill.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
    pill.style.width = `${w.toFixed(2)}px`;
    pill.style.opacity = w > 0 ? '1' : '0';
  }, []);

  const tick = useCallback(
    (now: number) => {
      const rawDt = lastTimeRef.current
        ? Math.min((now - lastTimeRef.current) / 1000, 1 / 30)
        : 1 / 60;
      lastTimeRef.current = now;

      const P = posSpringRef.current;
      const W = widthSpringRef.current;

      for (let i = 0; i < SUBSTEPS; i++) {
        stepSpring(P, rawDt / SUBSTEPS);
        stepSpring(W, rawDt / SUBSTEPS);
      }

      if (isSettled(P) && isSettled(W)) {
        P.x = P.t;
        P.v = 0;
        W.x = W.t;
        W.v = 0;
        paint();
        rafRef.current = 0;
        return;
      }

      paint();
      rafRef.current = requestAnimationFrame(tick);
    },
    [paint]
  );

  const startLoop = useCallback(() => {
    if (!rafRef.current) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  const syncPillToActive = useCallback(
    (immediate: boolean) => {
      const btn = buttonRefs.current[activeIndex];
      if (!btn) return;
      const targetX = btn.offsetLeft;
      const targetW = btn.offsetWidth;

      const P = posSpringRef.current;
      const W = widthSpringRef.current;
      P.t = targetX;
      W.t = targetW;

      if (immediate || reducedRef.current || !initializedRef.current) {
        P.x = targetX;
        P.v = 0;
        W.x = targetW;
        W.v = 0;
        initializedRef.current = true;
        paint();
        return;
      }

      tuneSpring(P, PILL_POS_SPRING.k, PILL_POS_SPRING.c, reducedRef.current);
      tuneSpring(W, PILL_WIDTH_SPRING.k, PILL_WIDTH_SPRING.c, reducedRef.current);
      startLoop();
    },
    [activeIndex, paint, startLoop]
  );

  useLayoutEffect(() => {
    syncPillToActive(!initializedRef.current);
  }, [syncPillToActive, options.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver(() => {
      syncPillToActive(true);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [syncPillToActive]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || options.length < 2) return;
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const step = e.key === 'ArrowRight' ? 1 : -1;
    let nextIdx = (activeIndex + step + options.length) % options.length;
    let guard = 0;
    while (options[nextIdx]?.disabled && guard < options.length) {
      nextIdx = (nextIdx + step + options.length) % options.length;
      guard++;
    }
    const nextOpt = options[nextIdx];
    if (nextOpt && !nextOpt.disabled) {
      onChange(nextOpt.value);
      buttonRefs.current[nextIdx]?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      role={roleMode}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
      className={cn(
        styles.control,
        variant === 'dark' ? styles.dark : styles.light,
        size === 'sm' ? styles.sm : styles.md,
        className
      )}
    >
      <span ref={pillRef} className={styles.pill} aria-hidden="true" />
      {options.map((opt, idx) => {
        const isActive = opt.value === value;
        const isDisabled = disabled || Boolean(opt.disabled);
        return (
          <button
            key={opt.value}
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            type="button"
            disabled={isDisabled}
            role={roleMode === 'tablist' ? 'tab' : undefined}
            aria-selected={roleMode === 'tablist' ? isActive : undefined}
            aria-pressed={roleMode === 'group' ? isActive : undefined}
            aria-label={opt.ariaLabel}
            onClick={() => {
              if (!isDisabled && opt.value !== value) {
                onChange(opt.value);
              }
            }}
            className={cn(styles.option, isActive && styles.optionActive)}
          >
            {opt.icon && <span className={styles.icon}>{opt.icon}</span>}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
