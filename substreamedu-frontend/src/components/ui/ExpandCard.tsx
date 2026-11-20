import React, { useEffect, useLayoutEffect, useRef } from 'react';
import styles from './ExpandCard.module.css';

// Exact spring constants from designbookmark.com/motion#db-expand-card (expand.js)
export const EXPAND_PROGRESS_SPRING = { stiffness: 240, damping: 21 } as const;
export const EXPAND_DETAILS_SPRING = { stiffness: 260, damping: 28 } as const;
export const EXPAND_DETAILS_DELAY_MS = 160;

interface SpringState {
    x: number;
    v: number;
    t: number;
    k: number;
    c: number;
}

const SUBSTEPS = 4;
const SETTLE_EPSILON = 0.0005;

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const stepSpring = (s: SpringState, dt: number): void => {
    const a = -s.k * (s.x - s.t) - s.c * s.v;
    s.v += a * dt;
    s.x += s.v * dt;
};

const isSettled = (s: SpringState): boolean =>
    Math.abs(s.x - s.t) < SETTLE_EPSILON && Math.abs(s.v) < SETTLE_EPSILON;

const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface ExpandCardProps {
    expanded: boolean;
    onExpand?: () => void;
    summary: React.ReactNode;
    details?: React.ReactNode;
    className?: string;
    ariaLabel?: string;
}

export const ExpandCard: React.FC<ExpandCardProps> = ({
    expanded,
    onExpand,
    summary,
    details,
    className = '',
    ariaLabel,
}) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const innerRef = useRef<HTMLDivElement>(null);
    const detailsRef = useRef<HTMLDivElement>(null);

    const rafRef = useRef<number | null>(null);
    const delayTimerRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const hasMountedRef = useRef<boolean>(false);

    const heightsRef = useRef<{ collapsed: number; expanded: number }>({
        collapsed: 0,
        expanded: 0,
    });

    const springsRef = useRef<{ p: SpringState; a: SpringState }>({
        p: {
            x: expanded ? 1 : 0,
            v: 0,
            t: expanded ? 1 : 0,
            k: EXPAND_PROGRESS_SPRING.stiffness,
            c: EXPAND_PROGRESS_SPRING.damping,
        },
        a: {
            x: expanded ? 1 : 0,
            v: 0,
            t: expanded ? 1 : 0,
            k: EXPAND_DETAILS_SPRING.stiffness,
            c: EXPAND_DETAILS_SPRING.damping,
        },
    });

    const measureContentHeight = (): number => {
        const inner = innerRef.current;
        if (!inner) return 0;
        return inner.scrollHeight || inner.offsetHeight || 0;
    };

    const applyFrame = (pVal: number, aVal: number, lockHeight: boolean): void => {
        const card = cardRef.current;
        const detailsEl = detailsRef.current;
        const { collapsed, expanded: expHeight } = heightsRef.current;

        if (card) {
            if (lockHeight && collapsed > 0 && expHeight > 0) {
                const h = Math.max(collapsed, collapsed + pVal * (expHeight - collapsed));
                card.style.height = `${h.toFixed(2)}px`;
            } else {
                card.style.height = 'auto';
            }
        }

        if (detailsEl) {
            const clampedA = clamp(aVal, 0, 1);
            detailsEl.style.opacity = clampedA.toFixed(3);
            detailsEl.style.transform = `translateY(${((1 - aVal) * 10).toFixed(2)}px)`;
        }
    };

    // Keep height synced if content inside expanded card resizes (e.g., image loads or unmounts)
    useEffect(() => {
        const inner = innerRef.current;
        if (!inner || typeof ResizeObserver === 'undefined') return;

        const observer = new ResizeObserver(() => {
            const measured = measureContentHeight();
            if (measured <= 0) return;

            if (expanded) {
                heightsRef.current.expanded = measured;
                if (rafRef.current === null && cardRef.current) {
                    cardRef.current.style.height = 'auto';
                }
            } else {
                heightsRef.current.collapsed = measured;
            }
        });

        observer.observe(inner);
        return () => observer.disconnect();
    }, [expanded]);

    useLayoutEffect(() => {
        const { p, a } = springsRef.current;
        const measured = measureContentHeight();

        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            if (expanded) {
                heightsRef.current.expanded = measured;
                p.x = 1;
                p.t = 1;
                p.v = 0;
                a.x = 1;
                a.t = 1;
                a.v = 0;
                applyFrame(1, 1, false);
            } else {
                heightsRef.current.collapsed = measured;
                p.x = 0;
                p.t = 0;
                p.v = 0;
                a.x = 0;
                a.t = 0;
                a.v = 0;
                applyFrame(0, 0, false);
            }
            return;
        }

        if (delayTimerRef.current !== null) {
            window.clearTimeout(delayTimerRef.current);
            delayTimerRef.current = null;
        }
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        if (expanded) {
            heightsRef.current.expanded = measured;
            if (heightsRef.current.collapsed <= 0) {
                heightsRef.current.collapsed = Math.min(measured, 220);
            }
        } else {
            heightsRef.current.collapsed = measured;
        }

        if (prefersReducedMotion()) {
            const target = expanded ? 1 : 0;
            p.x = target;
            p.t = target;
            p.v = 0;
            a.x = target;
            a.t = target;
            a.v = 0;
            applyFrame(target, target, false);
            return;
        }

        p.t = expanded ? 1 : 0;
        if (expanded) {
            a.x = 0;
            a.v = 0;
            a.t = 0;
            delayTimerRef.current = window.setTimeout(() => {
                a.t = 1;
                delayTimerRef.current = null;
            }, EXPAND_DETAILS_DELAY_MS);
        } else {
            a.t = 0;
        }

        const canAnimateHeight =
            heightsRef.current.collapsed > 0 &&
            heightsRef.current.expanded > 0 &&
            heightsRef.current.expanded !== heightsRef.current.collapsed;

        applyFrame(p.x, a.x, canAnimateHeight);
        lastTimeRef.current = performance.now();

        const tick = (now: number): void => {
            const dt = Math.min((now - lastTimeRef.current) / 1000, 1 / 30);
            lastTimeRef.current = now;

            const subDt = dt / SUBSTEPS;
            for (let i = 0; i < SUBSTEPS; i++) {
                stepSpring(p, subDt);
                stepSpring(a, subDt);
            }

            const waitingForDelay = delayTimerRef.current !== null;
            if (!waitingForDelay && isSettled(p) && isSettled(a)) {
                p.x = p.t;
                p.v = 0;
                a.x = a.t;
                a.v = 0;
                applyFrame(p.x, a.x, false);
                rafRef.current = null;
                return;
            }

            applyFrame(p.x, a.x, canAnimateHeight);
            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (delayTimerRef.current !== null) {
                window.clearTimeout(delayTimerRef.current);
                delayTimerRef.current = null;
            }
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [expanded]);

    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>): void => {
        if (expanded || !onExpand) return;
        const target = e.target as HTMLElement | null;
        if (target && target.closest('button, a, input, textarea, select')) {
            return;
        }
        onExpand();
    };

    return (
        <div
            ref={cardRef}
            className={`${styles.card} ${expanded ? styles.expanded : ''} ${!expanded && onExpand ? styles.cardInteractive : ''} ${className}`.trim()}
            onClick={handleCardClick}
            aria-label={ariaLabel}
        >
            <div ref={innerRef} className={styles.inner}>
                <div className={styles.summary}>{summary}</div>
                {expanded && details && (
                    <div ref={detailsRef} className={styles.details}>
                        {details}
                    </div>
                )}
            </div>
        </div>
    );
};
