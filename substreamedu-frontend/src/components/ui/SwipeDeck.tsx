import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import styles from './SwipeDeck.module.css';

// Exact spring constants from designbookmark.com/motion#db-swipe-deck (tokens.css & deck.js)
export const DECK_DRAG_SPRING = { stiffness: 900, damping: 50 } as const;
export const DECK_RETURN_SPRING = { stiffness: 280, damping: 16 } as const;
export const DECK_DEPTH_SPRING = { stiffness: 260, damping: 22 } as const;
export const DECK_FLING_SPRING = { stiffness: 70, damping: 17 } as const;
export const DECK_THRESHOLD = 110;
export const DECK_VELOCITY_THRESHOLD = 700;

interface SpringState {
    x: number;
    v: number;
    t: number;
    k: number;
    c: number;
}

const SUBSTEPS = 4;
const SETTLE_EPSILON = 0.05;
const DRAG_DEADZONE_PX = 6;
const FLING_CLEANUP_MS = 380;

const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

const makeSpring = (x: number, k: number, c: number): SpringState => ({
    x,
    v: 0,
    t: x,
    k,
    c,
});

const tuneSpring = (s: SpringState, k: number, c: number): void => {
    s.k = k;
    s.c = c;
};

const stepSpring = (s: SpringState, dt: number): void => {
    const a = -s.k * (s.x - s.t) - s.c * s.v;
    s.v += a * dt;
    s.x += s.v * dt;
};

const isSettled = (s: SpringState, eps = SETTLE_EPSILON): boolean =>
    Math.abs(s.x - s.t) < eps && Math.abs(s.v) < eps;

const prefersReducedMotion = (): boolean =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface SwipeDeckHandle {
    fling: (dir: -1 | 1) => void;
}

export interface SwipeDeckProps {
    cardKey: string | number;
    upcomingCount: number;
    canSwipe: boolean;
    rightLabel?: string;
    leftLabel?: string;
    swipeHint?: string;
    onSwipeRight: () => void;
    onSwipeLeft: () => void;
    children: React.ReactNode;
}

interface DragSession {
    pointerId: number;
    startX: number;
    startY: number;
    x0: number;
    y0: number;
    lx: number;
    ly: number;
    lt: number;
    vx: number;
    vy: number;
    active: boolean;
}

interface FlyingState {
    dir: -1 | 1;
    x: SpringState;
    y: SpringState;
    grabSign: number;
}

export const SwipeDeck = React.forwardRef<SwipeDeckHandle, SwipeDeckProps>(
    (
        {
            cardKey,
            upcomingCount,
            canSwipe,
            rightLabel = 'Good',
            leftLabel = 'Again',
            swipeHint,
            onSwipeRight,
            onSwipeLeft,
            children,
        },
        ref
    ) => {
        const topCardRef = useRef<HTMLDivElement>(null);
        const rightStampRef = useRef<HTMLSpanElement>(null);
        const leftStampRef = useRef<HTMLSpanElement>(null);
        const backCard1Ref = useRef<HTMLDivElement>(null);
        const backCard2Ref = useRef<HTMLDivElement>(null);
        const ghostRef = useRef<HTMLDivElement>(null);

        const [isDragging, setIsDragging] = useState(false);
        const [flyingDir, setFlyingDir] = useState<-1 | 1 | null>(null);

        const dragRef = useRef<DragSession | null>(null);
        const grabSignRef = useRef<number>(1);
        const rafRef = useRef<number | null>(null);
        const lastTimeRef = useRef<number>(0);
        const flingTimerRef = useRef<number | null>(null);
        const prevCardKeyRef = useRef<string | number>(cardKey);

        const springsRef = useRef<{
            x: SpringState;
            y: SpringState;
            topDepth: SpringState;
            back1Depth: SpringState;
            back2Depth: SpringState;
        }>({
            x: makeSpring(0, DECK_DRAG_SPRING.stiffness, DECK_DRAG_SPRING.damping),
            y: makeSpring(0, DECK_DRAG_SPRING.stiffness, DECK_DRAG_SPRING.damping),
            topDepth: makeSpring(0, DECK_DEPTH_SPRING.stiffness, DECK_DEPTH_SPRING.damping),
            back1Depth: makeSpring(1, DECK_DEPTH_SPRING.stiffness, DECK_DEPTH_SPRING.damping),
            back2Depth: makeSpring(2, DECK_DEPTH_SPRING.stiffness, DECK_DEPTH_SPRING.damping),
        });

        const flyingRef = useRef<FlyingState | null>(null);

        const renderFrame = (): void => {
            const { x, y, topDepth, back1Depth, back2Depth } = springsRef.current;
            const topEl = topCardRef.current;
            const p = clamp(Math.abs(x.x) / (DECK_THRESHOLD * 1.6), 0, 1);

            if (topEl) {
                const depth = Math.max(0, topDepth.x);
                const scale = 1 - Math.min(depth, 3) * 0.055;
                const depthY = Math.min(depth, 3) * 16;
                const rot = x.x * 0.065 * grabSignRef.current;
                topEl.style.transform = `translate(${x.x.toFixed(2)}px, ${(y.x + depthY).toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(4)})`;
            }

            if (rightStampRef.current) {
                rightStampRef.current.style.opacity = clamp(x.x / DECK_THRESHOLD, 0, 1).toFixed(3);
            }
            if (leftStampRef.current) {
                leftStampRef.current.style.opacity = clamp(-x.x / DECK_THRESHOLD, 0, 1).toFixed(3);
            }

            const applyBackCard = (el: HTMLDivElement | null, springDepth: SpringState): void => {
                if (!el) return;
                const depth = Math.max(0, springDepth.x - p);
                const scale = 1 - Math.min(depth, 3) * 0.055;
                const ty = Math.min(depth, 3) * 16;
                el.style.transform = `translateY(${ty.toFixed(2)}px) scale(${scale.toFixed(4)})`;
                el.style.opacity = clamp(3.6 - depth, 0, 1).toFixed(3);
                el.style.filter = depth > 0.01 ? `brightness(${(1 - Math.min(depth, 3) * 0.06).toFixed(3)})` : '';
            };

            applyBackCard(backCard1Ref.current, back1Depth);
            applyBackCard(backCard2Ref.current, back2Depth);

            const fly = flyingRef.current;
            if (fly && ghostRef.current) {
                const rot = fly.x.x * 0.065 * fly.grabSign;
                const dist = Math.abs(fly.x.x);
                const fade = clamp(1 - dist / 650, 0, 1);
                ghostRef.current.style.transform = `translate(${fly.x.x.toFixed(2)}px, ${fly.y.x.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)`;
                ghostRef.current.style.opacity = fade.toFixed(3);
            }
        };

        const ensureLoop = (): void => {
            if (rafRef.current !== null) return;
            lastTimeRef.current = performance.now();

            const tick = (now: number): void => {
                const dt = Math.min((now - lastTimeRef.current) / 1000, 1 / 30);
                lastTimeRef.current = now;

                const s = springsRef.current;
                const fly = flyingRef.current;
                const subDt = dt / SUBSTEPS;

                for (let i = 0; i < SUBSTEPS; i++) {
                    stepSpring(s.x, subDt);
                    stepSpring(s.y, subDt);
                    stepSpring(s.topDepth, subDt);
                    stepSpring(s.back1Depth, subDt);
                    stepSpring(s.back2Depth, subDt);
                    if (fly) {
                        stepSpring(fly.x, subDt);
                        stepSpring(fly.y, subDt);
                    }
                }

                renderFrame();

                const activeDrag = Boolean(dragRef.current?.active);
                const settled =
                    !activeDrag &&
                    !fly &&
                    isSettled(s.x) &&
                    isSettled(s.y) &&
                    isSettled(s.topDepth, 0.002) &&
                    isSettled(s.back1Depth, 0.002) &&
                    isSettled(s.back2Depth, 0.002);

                if (settled) {
                    s.x.x = s.x.t;
                    s.x.v = 0;
                    s.y.x = s.y.t;
                    s.y.v = 0;
                    s.topDepth.x = s.topDepth.t;
                    s.topDepth.v = 0;
                    s.back1Depth.x = s.back1Depth.t;
                    s.back1Depth.v = 0;
                    s.back2Depth.x = s.back2Depth.t;
                    s.back2Depth.v = 0;
                    renderFrame();
                    rafRef.current = null;
                    return;
                }

                rafRef.current = requestAnimationFrame(tick);
            };

            rafRef.current = requestAnimationFrame(tick);
        };

        const launchFlingVisual = (dir: -1 | 1, startX: number, startY: number, vx: number, vy: number): void => {
            if (prefersReducedMotion()) return;

            const s = springsRef.current;
            const p = clamp(Math.abs(startX) / (DECK_THRESHOLD * 1.6), 0, 1);

            // Bake drag rise into the incoming card's depth spring (prevents drop-back glitch from deck.js)
            s.topDepth.x = Math.max(0, 1 - p);
            s.topDepth.t = 0;
            s.topDepth.v = 0;
            s.back1Depth.x = Math.max(1, 2 - p);
            s.back1Depth.t = 1;
            s.back2Depth.x = Math.max(2, 3 - p);
            s.back2Depth.t = 2;

            // Reset active top card position for the incoming card
            tuneSpring(s.x, DECK_DRAG_SPRING.stiffness, DECK_DRAG_SPRING.damping);
            tuneSpring(s.y, DECK_DRAG_SPRING.stiffness, DECK_DRAG_SPRING.damping);
            s.x.x = 0;
            s.x.t = 0;
            s.x.v = 0;
            s.y.x = 0;
            s.y.t = 0;
            s.y.v = 0;

            const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1024;
            const flyX = makeSpring(startX, DECK_FLING_SPRING.stiffness, DECK_FLING_SPRING.damping);
            const flyY = makeSpring(startY, DECK_FLING_SPRING.stiffness, DECK_FLING_SPRING.damping);
            flyX.v = dir * Math.max(Math.abs(vx), 1500);
            flyX.t = dir * Math.max(viewportW / 2 + 360, Math.abs(startX) + 420);
            flyY.t = startY + clamp(vy * 0.2, -120, 120);

            flyingRef.current = {
                dir,
                x: flyX,
                y: flyY,
                grabSign: grabSignRef.current,
            };
            setFlyingDir(dir);

            if (flingTimerRef.current !== null) {
                window.clearTimeout(flingTimerRef.current);
            }
            flingTimerRef.current = window.setTimeout(() => {
                flyingRef.current = null;
                setFlyingDir(null);
                flingTimerRef.current = null;
            }, FLING_CLEANUP_MS);

            ensureLoop();
        };

        useImperativeHandle(ref, () => ({
            fling: (dir: -1 | 1) => {
                grabSignRef.current = 1;
                launchFlingVisual(dir, 0, 0, dir * 1500, 0);
            },
        }));

        // Initial static stack placement and card change reset
        useEffect(() => {
            if (prevCardKeyRef.current !== cardKey) {
                prevCardKeyRef.current = cardKey;
                dragRef.current = null;
                setIsDragging(false);
                const s = springsRef.current;
                s.x.x = 0;
                s.x.t = 0;
                s.x.v = 0;
                s.y.x = 0;
                s.y.t = 0;
                s.y.v = 0;
            }
            renderFrame();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [cardKey, upcomingCount]);

        useEffect(() => {
            return () => {
                if (rafRef.current !== null) {
                    cancelAnimationFrame(rafRef.current);
                    rafRef.current = null;
                }
                if (flingTimerRef.current !== null) {
                    window.clearTimeout(flingTimerRef.current);
                    flingTimerRef.current = null;
                }
            };
        }, []);

        const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
            if (!canSwipe) return;
            if (e.button !== 0 && e.pointerType === 'mouse') return;

            const target = e.target as HTMLElement | null;
            if (target && target.closest('button, a, input, textarea, select')) {
                return;
            }

            const el = topCardRef.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const s = springsRef.current;
            grabSignRef.current = e.clientY < rect.top + rect.height / 2 ? 1 : -1;

            dragRef.current = {
                pointerId: e.pointerId,
                startX: e.clientX,
                startY: e.clientY,
                x0: e.clientX - s.x.x,
                y0: e.clientY - s.y.x,
                lx: e.clientX,
                ly: e.clientY,
                lt: performance.now(),
                vx: 0,
                vy: 0,
                active: false,
            };
        };

        const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
            const drag = dragRef.current;
            if (!drag || e.pointerId !== drag.pointerId) return;

            const dx = e.clientX - drag.startX;
            const dy = e.clientY - drag.startY;

            if (!drag.active) {
                if (Math.hypot(dx, dy) < DRAG_DEADZONE_PX) return;
                // Only engage horizontal card swipe if horizontal intent >= vertical
                if (Math.abs(dy) > Math.abs(dx) * 1.35) {
                    dragRef.current = null;
                    return;
                }
                drag.active = true;
                setIsDragging(true);
                const s = springsRef.current;
                tuneSpring(s.x, DECK_DRAG_SPRING.stiffness, DECK_DRAG_SPRING.damping);
                tuneSpring(s.y, DECK_DRAG_SPRING.stiffness, DECK_DRAG_SPRING.damping);
                try {
                    e.currentTarget.setPointerCapture(e.pointerId);
                } catch {
                    // Pointer capture unavailable in some environments
                }
            }

            const now = performance.now();
            const dt = Math.max(1, now - drag.lt) / 1000;
            drag.vx = drag.vx * 0.5 + ((e.clientX - drag.lx) / dt) * 0.5;
            drag.vy = drag.vy * 0.5 + ((e.clientY - drag.ly) / dt) * 0.5;
            drag.lx = e.clientX;
            drag.ly = e.clientY;
            drag.lt = now;

            const s = springsRef.current;
            s.x.t = e.clientX - drag.x0;
            s.y.t = (e.clientY - drag.y0) * 0.6;

            if (prefersReducedMotion()) {
                s.x.x = s.x.t;
                s.y.x = s.y.t;
                renderFrame();
            } else {
                ensureLoop();
            }
        };

        const finishDrag = (e: React.PointerEvent<HTMLDivElement>): void => {
            const drag = dragRef.current;
            if (!drag || e.pointerId !== drag.pointerId) return;
            dragRef.current = null;

            if (!drag.active) return;
            setIsDragging(false);
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {
                // Ignore if capture was not set
            }

            const s = springsRef.current;
            const x = s.x.t;
            const { vx, vy } = drag;

            const rawDir =
                Math.abs(x) > DECK_THRESHOLD
                    ? Math.sign(x)
                    : Math.abs(vx) > DECK_VELOCITY_THRESHOLD && Math.sign(vx) === Math.sign(x || vx)
                    ? Math.sign(vx)
                    : 0;

            if (rawDir === 1 || rawDir === -1) {
                launchFlingVisual(rawDir, s.x.x, s.y.x, vx, vy);
                if (rawDir === 1) {
                    onSwipeRight();
                } else {
                    onSwipeLeft();
                }
            } else if (prefersReducedMotion()) {
                s.x.x = 0;
                s.x.t = 0;
                s.y.x = 0;
                s.y.t = 0;
                renderFrame();
            } else {
                tuneSpring(s.x, DECK_RETURN_SPRING.stiffness, DECK_RETURN_SPRING.damping);
                tuneSpring(s.y, DECK_RETURN_SPRING.stiffness, DECK_RETURN_SPRING.damping);
                s.x.t = 0;
                s.y.t = 0;
                ensureLoop();
            }
        };

        return (
            <div className={styles.deck}>
                {upcomingCount >= 2 && (
                    <div
                        ref={backCard2Ref}
                        className={styles.backCard}
                        style={{ zIndex: 20 }}
                        aria-hidden="true"
                    />
                )}
                {upcomingCount >= 1 && (
                    <div
                        ref={backCard1Ref}
                        className={styles.backCard}
                        style={{ zIndex: 30 }}
                        aria-hidden="true"
                    />
                )}

                {flyingDir !== null && (
                    <div ref={ghostRef} className={styles.flyingGhost} aria-hidden="true">
                        <span
                            className={`${styles.stamp} ${
                                flyingDir === 1 ? styles.stampRight : styles.stampLeft
                            }`}
                            style={{ opacity: 1 }}
                        >
                            {flyingDir === 1 ? rightLabel : leftLabel}
                        </span>
                    </div>
                )}

                <div
                    ref={topCardRef}
                    className={`${styles.topCard} ${canSwipe ? styles.swipeable : ''} ${
                        isDragging ? styles.dragging : ''
                    }`.trim()}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                >
                    <span
                        ref={rightStampRef}
                        className={`${styles.stamp} ${styles.stampRight}`}
                        aria-hidden="true"
                    >
                        {rightLabel}
                    </span>
                    <span
                        ref={leftStampRef}
                        className={`${styles.stamp} ${styles.stampLeft}`}
                        aria-hidden="true"
                    >
                        {leftLabel}
                    </span>
                    {children}
                </div>

                {canSwipe && swipeHint && <p className={styles.swipeHint}>{swipeHint}</p>}
            </div>
        );
    }
);

SwipeDeck.displayName = 'SwipeDeck';
