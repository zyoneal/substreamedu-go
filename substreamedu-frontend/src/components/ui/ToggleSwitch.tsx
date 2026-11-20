import React, { useEffect, useRef } from 'react';
import styles from './ToggleSwitch.module.css';

// Exact spring constants from designbookmark.com/motion#db-toggle-switch (switch.js / motion.js)
export const TOGGLE_POSITION_SPRING = { stiffness: 320, damping: 18 } as const;
export const TOGGLE_STRETCH_SPRING = { stiffness: 300, damping: 20 } as const;
export const TOGGLE_STRETCH_KICK = 60;

interface SpringState {
    x: number;
    v: number;
    t: number;
    k: number;
    c: number;
}

interface SwitchMetrics {
    knobSize: number;
    travel: number;
    maxStretch: number;
}

const SIZE_METRICS: Record<'sm' | 'md', SwitchMetrics> = {
    md: { knobSize: 26, travel: 20, maxStretch: 10 },
    sm: { knobSize: 16, travel: 14, maxStretch: 6.5 },
};

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

const applyVisualState = (
    track: HTMLSpanElement | null,
    knob: HTMLSpanElement | null,
    pValue: number,
    wValue: number,
    isOn: boolean,
    size: 'sm' | 'md',
    metrics: SwitchMetrics
): void => {
    if (!track || !knob) return;

    // Keep proportional knob travel even if CSS media queries resize the track
    const trackWidth = track.clientWidth;
    const trackHeight = track.clientHeight;
    let knobSize = metrics.knobSize;
    let travel = metrics.travel;
    let maxStretch = metrics.maxStretch;

    if (trackWidth > 0 && trackHeight > 0) {
        const inset = size === 'sm' ? 2 : 3;
        knobSize = Math.max(8, trackHeight - inset * 2);
        travel = Math.max(0, trackWidth - knobSize - inset * 2);
        maxStretch = knobSize * (10 / 26);
    }

    const grow = clamp(wValue, 0, 1) * maxStretch;
    const x = pValue * travel;
    const clampedP = clamp(pValue, 0, 1);
    const tx = isOn ? x - grow * clampedP : x;

    knob.style.width = `${(knobSize + grow).toFixed(2)}px`;
    knob.style.transform = `translateX(${tx.toFixed(2)}px)`;
    track.style.background = `color-mix(in srgb, var(--toggle-track-on) ${(clampedP * 100).toFixed(1)}%, var(--toggle-track-off))`;
};

export interface ToggleSwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    ariaLabel: string;
    label?: string;
    description?: string;
    title?: string;
    size?: 'sm' | 'md';
    disabled?: boolean;
    className?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
    checked,
    onChange,
    ariaLabel,
    label,
    description,
    title,
    size = 'md',
    disabled = false,
    className = '',
}) => {
    const trackRef = useRef<HTMLSpanElement>(null);
    const knobRef = useRef<HTMLSpanElement>(null);
    const rafRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number>(0);
    const hasMountedRef = useRef<boolean>(false);
    const checkedRef = useRef<boolean>(checked);

    const springsRef = useRef<{ p: SpringState; w: SpringState }>({
        p: {
            x: checked ? 1 : 0,
            v: 0,
            t: checked ? 1 : 0,
            k: TOGGLE_POSITION_SPRING.stiffness,
            c: TOGGLE_POSITION_SPRING.damping,
        },
        w: {
            x: 0,
            v: 0,
            t: 0,
            k: TOGGLE_STRETCH_SPRING.stiffness,
            c: TOGGLE_STRETCH_SPRING.damping,
        },
    });

    useEffect(() => {
        const metrics = SIZE_METRICS[size];
        const { p, w } = springsRef.current;
        checkedRef.current = checked;

        if (!hasMountedRef.current) {
            hasMountedRef.current = true;
            p.x = checked ? 1 : 0;
            p.t = checked ? 1 : 0;
            p.v = 0;
            w.x = 0;
            w.t = 0;
            w.v = 0;
            applyVisualState(trackRef.current, knobRef.current, p.x, w.x, checked, size, metrics);
            return;
        }

        if (prefersReducedMotion()) {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            p.x = checked ? 1 : 0;
            p.t = checked ? 1 : 0;
            p.v = 0;
            w.x = 0;
            w.t = 0;
            w.v = 0;
            applyVisualState(trackRef.current, knobRef.current, p.x, w.x, checked, size, metrics);
            return;
        }

        p.t = checked ? 1 : 0;
        w.t = 0;
        w.v = TOGGLE_STRETCH_KICK;

        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        lastTimeRef.current = performance.now();

        const tick = (now: number): void => {
            const dt = Math.min((now - lastTimeRef.current) / 1000, 1 / 30);
            lastTimeRef.current = now;

            const subDt = dt / SUBSTEPS;
            for (let i = 0; i < SUBSTEPS; i++) {
                stepSpring(p, subDt);
                stepSpring(w, subDt);
            }

            if (isSettled(p) && isSettled(w)) {
                p.x = p.t;
                p.v = 0;
                w.x = 0;
                w.v = 0;
                applyVisualState(trackRef.current, knobRef.current, p.x, w.x, checkedRef.current, size, metrics);
                rafRef.current = null;
                return;
            }

            applyVisualState(trackRef.current, knobRef.current, p.x, w.x, checkedRef.current, size, metrics);
            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);

        return () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [checked, size]);

    const handleClick = (): void => {
        if (disabled) return;
        onChange(!checked);
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={ariaLabel}
            title={title}
            disabled={disabled}
            onClick={handleClick}
            className={`${styles.toggleButton} ${checked ? styles.checked : ''} ${className}`.trim()}
        >
            {(label || description) && (
                <span className={styles.labelGroup}>
                    {label && <span className={styles.labelText}>{label}</span>}
                    {description && <span className={styles.descriptionText}>{description}</span>}
                </span>
            )}
            <span
                ref={trackRef}
                aria-hidden="true"
                className={`${styles.track} ${size === 'sm' ? styles.trackSm : styles.trackMd}`}
            >
                <span
                    ref={knobRef}
                    className={`${styles.knob} ${size === 'sm' ? styles.knobSm : styles.knobMd}`}
                />
            </span>
        </button>
    );
};
