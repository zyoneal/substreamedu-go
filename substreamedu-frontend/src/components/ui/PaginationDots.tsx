import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import styles from './PaginationDots.module.css';

export interface PaginationSlide {
  id: string;
  label: string;
  content: React.ReactNode;
}

export interface PaginationDotsProps {
  slides: readonly PaginationSlide[];
  initialIndex?: number;
  /** Optional auto-advance interval in ms. Set to 0 to disable auto-advance. */
  autoAdvanceMs?: number;
  /** Pause auto-advance for this many ms after a user clicks a dot. */
  userPauseMs?: number;
  ariaLabel?: string;
  className?: string;
  viewportClassName?: string;
  onSlideChange?: (index: number) => void;
}

interface SpringState {
  x: number;
  v: number;
  t: number;
  k: number;
  c: number;
}

export const STRIP_SPRING = { k: 170, c: 22 } as const;
export const LEADING_EDGE_SPRING = { k: 520, c: 34 } as const;
export const TRAILING_EDGE_SPRING = { k: 140, c: 18 } as const;
export const ACTIVE_PILL_WIDTH = 20;
const SUBSTEPS = 4;
const SETTLE_EPS = 0.001;

function createSpring(x: number, k = 400, c = 30): SpringState {
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

const PaginationDots: React.FC<PaginationDotsProps> = ({
  slides,
  initialIndex = 0,
  autoAdvanceMs = 0,
  userPauseMs = 7000,
  ariaLabel = 'Slides',
  className,
  viewportClassName,
  onSlideChange,
}) => {
  const count = slides.length;
  const safeInitial = Math.min(Math.max(initialIndex, 0), Math.max(count - 1, 0));
  const [activeIndex, setActiveIndex] = useState(safeInitial);

  const stripRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const dotRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const curRef = useRef(safeInitial);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const pausedUntilRef = useRef(0);
  const onSlideChangeRef = useRef(onSlideChange);

  const reducedRef = useRef(false);
  const stripSpringRef = useRef<SpringState>(
    createSpring(safeInitial, STRIP_SPRING.k, STRIP_SPRING.c)
  );
  const leftEdgeRef = useRef<SpringState>(createSpring(0));
  const rightEdgeRef = useRef<SpringState>(createSpring(ACTIVE_PILL_WIDTH));

  useEffect(() => {
    onSlideChangeRef.current = onSlideChange;
  }, [onSlideChange]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
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
    const strip = stripRef.current;
    const pill = pillRef.current;
    const P = stripSpringRef.current;
    const A = leftEdgeRef.current;
    const B = rightEdgeRef.current;
    if (strip) {
      strip.style.transform = `translateX(${(-P.x * 100).toFixed(3)}%)`;
    }
    if (pill) {
      pill.style.transform = `translateX(${A.x.toFixed(2)}px)`;
      pill.style.width = `${Math.max(8, B.x - A.x).toFixed(2)}px`;
    }
  }, []);

  const tick = useCallback(
    (now: number) => {
      const rawDt = lastTimeRef.current
        ? Math.min((now - lastTimeRef.current) / 1000, 1 / 30)
        : 1 / 60;
      lastTimeRef.current = now;

      const P = stripSpringRef.current;
      const A = leftEdgeRef.current;
      const B = rightEdgeRef.current;

      for (let k = 0; k < SUBSTEPS; k++) {
        stepSpring(P, rawDt / SUBSTEPS);
        stepSpring(A, rawDt / SUBSTEPS);
        stepSpring(B, rawDt / SUBSTEPS);
      }

      if (isSettled(P) && isSettled(A) && isSettled(B)) {
        P.x = P.t;
        P.v = 0;
        A.x = A.t;
        A.v = 0;
        B.x = B.t;
        B.v = 0;
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

  const measureDotTarget = useCallback((index: number) => {
    const btn = dotRefs.current[index];
    if (!btn) {
      return null;
    }
    const center = btn.offsetLeft + btn.offsetWidth / 2;
    return {
      left: center - ACTIVE_PILL_WIDTH / 2,
      right: center + ACTIVE_PILL_WIDTH / 2,
    };
  }, []);

  const goTo = useCallback(
    (index: number, isUserAction: boolean) => {
      if (count === 0) return;
      const next = ((index % count) + count) % count;
      const prev = curRef.current;
      const dir = next >= prev ? 1 : -1;
      curRef.current = next;
      setActiveIndex(next);
      onSlideChangeRef.current?.(next);

      if (isUserAction) {
        pausedUntilRef.current = Date.now() + userPauseMs;
      }

      const reduced = reducedRef.current;
      const P = stripSpringRef.current;
      const A = leftEdgeRef.current;
      const B = rightEdgeRef.current;

      tuneSpring(P, STRIP_SPRING.k, STRIP_SPRING.c, reduced);
      P.t = next;

      const target = measureDotTarget(next);
      if (target) {
        A.t = target.left;
        B.t = target.right;
        if (dir > 0) {
          tuneSpring(B, LEADING_EDGE_SPRING.k, LEADING_EDGE_SPRING.c, reduced);
          tuneSpring(A, TRAILING_EDGE_SPRING.k, TRAILING_EDGE_SPRING.c, reduced);
        } else {
          tuneSpring(A, LEADING_EDGE_SPRING.k, LEADING_EDGE_SPRING.c, reduced);
          tuneSpring(B, TRAILING_EDGE_SPRING.k, TRAILING_EDGE_SPRING.c, reduced);
        }
      }

      startLoop();
    },
    [count, measureDotTarget, startLoop, userPauseMs]
  );

  // Snap initial pill position cleanly on mount
  useLayoutEffect(() => {
    const target = measureDotTarget(curRef.current);
    if (target) {
      leftEdgeRef.current.x = target.left;
      leftEdgeRef.current.t = target.left;
      rightEdgeRef.current.x = target.right;
      rightEdgeRef.current.t = target.right;
    }
    paint();
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
    };
  }, [measureDotTarget, paint]);

  // Optional auto-advance respecting user interaction pause
  useEffect(() => {
    if (!autoAdvanceMs || count < 2) {
      return undefined;
    }
    const id = window.setInterval(() => {
      if (Date.now() >= pausedUntilRef.current && document.visibilityState !== 'hidden') {
        goTo((curRef.current + 1) % count, false);
      }
    }, autoAdvanceMs);
    return () => window.clearInterval(id);
  }, [autoAdvanceMs, count, goTo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(curRef.current + 1, true);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(curRef.current - 1, true);
    }
  };

  const activeSlide = slides[activeIndex];

  return (
    <div
      className={cn(styles.pager, className)}
      onPointerDown={() => {
        pausedUntilRef.current = Date.now() + userPauseMs;
      }}
    >
      <div className={cn(styles.viewport, viewportClassName)}>
        <div className={styles.strip} ref={stripRef}>
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              className={styles.slide}
              role="tabpanel"
              aria-label={slide.label}
              aria-hidden={idx !== activeIndex}
            >
              {slide.content}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.controls}>
        <div
          className={styles.dots}
          role="tablist"
          aria-label={ariaLabel}
          onKeyDown={handleKeyDown}
        >
          <span className={styles.activePill} ref={pillRef} aria-hidden="true" />
          {slides.map((slide, idx) => (
            <button
              key={slide.id}
              ref={(el) => {
                dotRefs.current[idx] = el;
              }}
              type="button"
              role="tab"
              aria-label={slide.label}
              aria-selected={idx === activeIndex}
              className={styles.dot}
              onClick={() => goTo(idx, true)}
            />
          ))}
        </div>
        {activeSlide && (
          <div className={styles.caption} aria-live="polite">
            <span className={styles.captionIndex}>
              {String(activeIndex + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </span>{' '}
            · {activeSlide.label}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaginationDots;
