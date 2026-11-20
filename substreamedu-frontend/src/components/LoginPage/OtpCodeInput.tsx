import React, { useEffect, useRef, useState } from 'react';
import styles from './css/LoginPage.module.css';

interface SpringState {
    x: number;
    v: number;
    t: number;
    k: number;
    c: number;
}

const BOX_COUNT = 6;
const BOX_RADIUS = 12; // matches LoginPage / Login input corner radius
const DIGIT_Y_STIFFNESS = 520;
const DIGIT_Y_DAMPING = 16;
const DIGIT_O_STIFFNESS = 400;
const DIGIT_O_DAMPING = 28;
const ACTIVE_STIFFNESS = 300;
const ACTIVE_DAMPING = 26;
const MERGE_STIFFNESS = 260;
const MERGE_DAMPING = 24;
const VERIFIED_STIFFNESS = 220;
const VERIFIED_DAMPING = 28;

const createSpring = (x: number, k: number, c: number, reducedMotion: boolean): SpringState => ({
    x,
    v: 0,
    t: x,
    k,
    c: reducedMotion ? 2 * Math.sqrt(k) : c,
});

const stepSpring = (s: SpringState, dt: number): void => {
    const a = -s.k * (s.x - s.t) - s.c * s.v;
    s.v += a * dt;
    s.x += s.v * dt;
};

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

export interface OtpCodeInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit?: () => void;
    isVerifying: boolean;
    isVerified: boolean;
    hasError: boolean;
    verifiedLabel?: string;
    ariaLabel?: string;
    ariaDescribedBy?: string;
}

export const OtpCodeInput: React.FC<OtpCodeInputProps> = ({
    value,
    onChange,
    onSubmit,
    isVerifying,
    isVerified,
    hasError,
    verifiedLabel = 'Verified',
    ariaLabel = 'Confirmation code',
    ariaDescribedBy,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const okRef = useRef<HTMLDivElement>(null);
    const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
    const digitRefs = useRef<(HTMLSpanElement | null)[]>([]);
    const caretRefs = useRef<(HTMLSpanElement | null)[]>([]);

    const [isFocused, setIsFocused] = useState(false);

    const stateRef = useRef({
        value: '',
        focused: false,
        verifying: false,
        verified: false,
    });

    const springsRef = useRef<{
        boxes: Array<{ y: SpringState; o: SpringState; a: SpringState }>;
        merge: SpringState;
        green: SpringState;
    } | null>(null);

    // Sync React props into spring targets without restarting rAF
    useEffect(() => {
        const clean = value.replace(/\D/g, '').slice(0, BOX_COUNT);
        const prev = stateRef.current.value;
        stateRef.current.value = clean;

        const springs = springsRef.current;
        if (!springs) return;

        for (let i = 0; i < BOX_COUNT; i++) {
            const c = clean[i] || '';
            const prevC = prev[i] || '';
            const b = springs.boxes[i];
            if (c && c !== prevC) {
                b.y.x = -14;
                b.y.v = 0;
                b.o.x = 0;
                b.o.t = 1;
            } else if (!c) {
                b.o.t = 0;
            } else {
                b.o.t = 1;
            }
        }
    }, [value]);

    useEffect(() => {
        stateRef.current.focused = isFocused;
    }, [isFocused]);

    useEffect(() => {
        stateRef.current.verifying = isVerifying;
        stateRef.current.verified = isVerified;
        const springs = springsRef.current;
        if (!springs) return;

        if (isVerified) {
            springs.merge.t = 1;
            const t = window.setTimeout(() => {
                if (springsRef.current && stateRef.current.verified) {
                    springsRef.current.green.t = 1;
                }
            }, 220);
            return () => window.clearTimeout(t);
        }

        if (isVerifying) {
            springs.merge.t = 1;
            springs.green.t = 0;
        } else {
            springs.merge.t = 0;
            springs.green.t = 0;
        }
    }, [isVerifying, isVerified]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const reducedMotion =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const initialClean = stateRef.current.value;
        const springs = {
            boxes: Array.from({ length: BOX_COUNT }, (_, i) => ({
                y: createSpring(0, DIGIT_Y_STIFFNESS, DIGIT_Y_DAMPING, reducedMotion),
                o: createSpring(initialClean[i] ? 1 : 0, DIGIT_O_STIFFNESS, DIGIT_O_DAMPING, reducedMotion),
                a: createSpring(0, ACTIVE_STIFFNESS, ACTIVE_DAMPING, reducedMotion),
            })),
            merge: createSpring(0, MERGE_STIFFNESS, MERGE_DAMPING, reducedMotion),
            green: createSpring(0, VERIFIED_STIFFNESS, VERIFIED_DAMPING, reducedMotion),
        };
        springsRef.current = springs;

        let clock = 0;
        let last = performance.now();
        let rafId = 0;

        const loop = (now: number) => {
            const dt = Math.min((now - last) / 1000, 1 / 30);
            last = now;
            const sub = 4;
            const subDt = dt / sub;
            const { value: val, focused, verifying, verified } = stateRef.current;
            const locked = verifying || verified;

            for (let k = 0; k < sub; k++) {
                clock += subDt;
                for (let i = 0; i < BOX_COUNT; i++) {
                    const b = springs.boxes[i];
                    b.a.t = !locked && focused && i === Math.min(val.length, BOX_COUNT - 1) ? 1 : 0;
                    stepSpring(b.y, subDt);
                    stepSpring(b.o, subDt);
                    stepSpring(b.a, subDt);
                }
                stepSpring(springs.merge, subDt);
                stepSpring(springs.green, subDt);
            }

            const W = container.offsetWidth || 320;
            const gap0 = 8;
            const bw = Math.min(50, (W - gap0 * (BOX_COUNT - 1)) / BOX_COUNT);
            const m = clamp(springs.merge.x, 0, 1.1);
            const mClamped = clamp(m, 0, 1);
            const gap = gap0 * (1 - mClamped);
            const total = bw * BOX_COUNT + gap * (BOX_COUNT - 1);
            const left0 = (W - total) / 2;
            const g = clamp(springs.green.x, 0, 1);

            for (let i = 0; i < BOX_COUNT; i++) {
                const boxEl = boxRefs.current[i];
                const digitEl = digitRefs.current[i];
                const caretEl = caretRefs.current[i];
                const b = springs.boxes[i];
                if (!boxEl || !digitEl || !caretEl) continue;

                boxEl.style.left = `${(left0 + i * (bw + gap)).toFixed(2)}px`;
                boxEl.style.width = `${(bw + (i < BOX_COUNT - 1 ? gap0 * mClamped + 1 : 0)).toFixed(2)}px`;

                const r = BOX_RADIUS * (1 - mClamped);
                boxEl.style.borderRadius =
                    i === 0
                        ? `${BOX_RADIUS}px ${r.toFixed(2)}px ${r.toFixed(2)}px ${BOX_RADIUS}px`
                        : i === BOX_COUNT - 1
                        ? `${r.toFixed(2)}px ${BOX_RADIUS}px ${BOX_RADIUS}px ${r.toFixed(2)}px`
                        : `${r.toFixed(2)}px`;

                const a = clamp(b.a.x, 0, 1);
                if (g > 0.01) {
                    boxEl.style.background = `color-mix(in srgb, #16a34a ${(g * 100).toFixed(1)}%, var(--color-surface-elevated, #eae7e1))`;
                    boxEl.style.borderColor = 'transparent';
                } else if (mClamped > 0.25) {
                    boxEl.style.background = 'var(--color-surface-elevated, #eae7e1)';
                    boxEl.style.borderColor = 'transparent';
                } else if (a > 0.01) {
                    boxEl.style.background = `color-mix(in srgb, #ffffff ${(a * 100).toFixed(1)}%, var(--color-surface-elevated, #eae7e1))`;
                    boxEl.style.borderColor = `rgba(10, 10, 10, ${(0.16 + a * 0.64).toFixed(2)})`;
                } else {
                    boxEl.style.background = '';
                    boxEl.style.borderColor = '';
                }

                digitEl.style.opacity = (clamp(b.o.x, 0, 1) * (1 - g)).toFixed(3);
                digitEl.style.transform = `translate3d(0, ${b.y.x.toFixed(2)}px, 0)`;
                caretEl.style.opacity = a > 0.5 && !val[i] && (clock * 1.8) % 2 < 1.2 ? '1' : '0';
            }

            if (okRef.current) {
                okRef.current.style.opacity = clamp(springs.green.x * 1.6 - 0.5, 0, 1).toFixed(3);
                okRef.current.style.transform = `translate3d(0, ${((1 - g) * 8).toFixed(2)}px, 0)`;
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(rafId);
            springsRef.current = null;
        };
    }, []);

    const digits = value.replace(/\D/g, '').slice(0, BOX_COUNT);

    return (
        <div
            ref={containerRef}
            className={`${styles.otpBoxes} ${hasError ? styles.inputShake : ''}`}
            onClick={() => inputRef.current?.focus()}
        >
            {Array.from({ length: BOX_COUNT }, (_, i) => (
                <div
                    key={i}
                    ref={(el) => {
                        boxRefs.current[i] = el;
                    }}
                    className={`${styles.otpBox} ${hasError ? styles.otpBoxError : ''}`}
                    aria-hidden="true"
                >
                    <span
                        ref={(el) => {
                            digitRefs.current[i] = el;
                        }}
                        className={styles.otpDigit}
                    >
                        {digits[i] || ''}
                    </span>
                    <span
                        ref={(el) => {
                            caretRefs.current[i] = el;
                        }}
                        className={styles.otpCaret}
                    />
                </div>
            ))}

            <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="one-time-code"
                maxLength={BOX_COUNT}
                value={digits}
                disabled={isVerifying || isVerified}
                aria-label={ariaLabel}
                aria-describedby={ariaDescribedBy}
                className={styles.otpHiddenInput}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(e) => {
                    const next = e.target.value.replace(/\D/g, '').slice(0, BOX_COUNT);
                    onChange(next);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && digits.length === BOX_COUNT && onSubmit) {
                        e.preventDefault();
                        onSubmit();
                    }
                }}
            />

            <div ref={okRef} className={styles.otpVerifiedOverlay} aria-live="polite">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                <span>{verifiedLabel}</span>
            </div>
        </div>
    );
};
