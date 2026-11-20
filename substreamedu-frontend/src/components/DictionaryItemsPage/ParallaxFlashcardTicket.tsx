import React, { useEffect, useRef } from 'react';
import {
    DictionaryItem,
    CardAnimationState,
    cleanTranscription,
    highlightContext,
} from './useDictionaryItemsSession';
import styles from './css/DictionaryItemsPage.module.css';

interface SpringState {
    x: number;
    v: number;
    t: number;
    k: number;
    c: number;
}

const TICKET_TILT = 14; // deg (--ticket-tilt)
const TICKET_DEPTH = 12; // px (--ticket-depth)
const FLIP_STIFFNESS = 170; // --ticket-flip stiffness
const FLIP_DAMPING = 15; // --ticket-flip damping
const TILT_STIFFNESS = 220;
const TILT_DAMPING = 18;
const GLARE_STIFFNESS = 300;
const GLARE_DAMPING = 26;
const LIFT_STIFFNESS = 300;
const LIFT_DAMPING = 18;

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

export interface ParallaxFlashcardTicketProps {
    card: DictionaryItem;
    resourceName?: string;
    currentIndex: number;
    totalCount: number;
    flipped: boolean;
    animationState: CardAnimationState;
    imageFailed: boolean;
    onFlip: () => void;
    onYouGlishClick: (word: string) => void;
    onImageError: () => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
}

export const ParallaxFlashcardTicket: React.FC<ParallaxFlashcardTicketProps> = ({
    card,
    resourceName,
    currentIndex,
    totalCount,
    flipped,
    animationState,
    imageFailed,
    onFlip,
    onYouGlishClick,
    onImageError,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
}) => {
    const stageRef = useRef<HTMLDivElement>(null);
    const ticketRef = useRef<HTMLDivElement>(null);
    const glareFrontRef = useRef<HTMLDivElement>(null);
    const glareBackRef = useRef<HTMLDivElement>(null);

    const flippedRef = useRef(flipped);
    const springsRef = useRef<{
        rx: SpringState;
        ry: SpringState;
        flip: SpringState;
        glare: SpringState;
        lift: SpringState;
    } | null>(null);

    // Keep spring target synced with React `flipped` state (handles clicks, Space key, and card navigation reset)
    useEffect(() => {
        const prevFlipped = flippedRef.current;
        flippedRef.current = flipped;
        const springs = springsRef.current;
        if (!springs) return;
        springs.flip.t = flipped ? 180 : 0;
        if (prevFlipped !== flipped) {
            springs.lift.v += 1.5;
        }
    }, [flipped]);

    useEffect(() => {
        const stage = stageRef.current;
        const ticket = ticketRef.current;
        if (!stage || !ticket) return;

        const reducedMotion =
            typeof window !== 'undefined' &&
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const springs = {
            rx: createSpring(0, TILT_STIFFNESS, TILT_DAMPING, reducedMotion),
            ry: createSpring(0, TILT_STIFFNESS, TILT_DAMPING, reducedMotion),
            flip: createSpring(flippedRef.current ? 180 : 0, FLIP_STIFFNESS, FLIP_DAMPING, reducedMotion),
            glare: createSpring(0, GLARE_STIFFNESS, GLARE_DAMPING, reducedMotion),
            lift: createSpring(1, LIFT_STIFFNESS, LIFT_DAMPING, reducedMotion),
        };
        springsRef.current = springs;

        const layers = Array.from(ticket.querySelectorAll<HTMLElement>('[data-depth]')).map((el) => ({
            el,
            depth: parseFloat(el.dataset.depth || '0'),
        }));

        let hover = false;
        let nx = 0;
        let ny = 0;
        let gx = 50;
        let gy = 30;
        let clock = 0;

        const handlePointerMove = (e: PointerEvent) => {
            if (reducedMotion || e.pointerType === 'touch') return;
            const rect = stage.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            nx = clamp(((e.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
            ny = clamp(((e.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
            gx = (nx + 1) * 50;
            gy = (ny + 1) * 50;
            hover = true;
        };

        const handlePointerLeave = () => {
            hover = false;
        };

        const handlePointerDown = () => {
            if (!reducedMotion) {
                springs.lift.t = 0.97;
            }
        };

        const handlePointerUp = () => {
            springs.lift.t = 1;
        };

        stage.addEventListener('pointermove', handlePointerMove);
        stage.addEventListener('pointerleave', handlePointerLeave);
        stage.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('pointerup', handlePointerUp);

        let rafId = 0;
        let last = performance.now();

        const loop = (now: number) => {
            const dt = Math.min((now - last) / 1000, 1 / 30);
            last = now;
            const sub = 4;
            const subDt = dt / sub;

            for (let i = 0; i < sub; i++) {
                clock += subDt;
                if (reducedMotion) {
                    springs.rx.t = 0;
                    springs.ry.t = 0;
                    springs.glare.t = 0;
                } else if (hover) {
                    springs.rx.t = -ny * TICKET_TILT;
                    springs.ry.t = nx * TICKET_TILT;
                    springs.glare.t = 1;
                } else {
                    springs.rx.t = Math.sin(clock * 0.9) * 3.5;
                    springs.ry.t = Math.cos(clock * 0.7) * 5.5;
                    springs.glare.t = 0.25;
                }

                stepSpring(springs.rx, subDt);
                stepSpring(springs.ry, subDt);
                stepSpring(springs.flip, subDt);
                stepSpring(springs.glare, subDt);
                stepSpring(springs.lift, subDt);
            }

            ticket.style.transform = `rotateX(${springs.rx.x.toFixed(3)}deg) rotateY(${(springs.ry.x + springs.flip.x).toFixed(3)}deg) scale(${springs.lift.x.toFixed(4)})`;

            const ox = springs.ry.x / TICKET_TILT;
            const oy = -springs.rx.x / TICKET_TILT;
            for (let i = 0; i < layers.length; i++) {
                const l = layers[i];
                const tx = (ox * TICKET_DEPTH * l.depth).toFixed(2);
                const ty = (oy * TICKET_DEPTH * l.depth).toFixed(2);
                l.el.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
            }

            const gOpacity = String(clamp(springs.glare.x, 0, 1));
            const gPosX = `${hover ? gx : 50 + ox * 30}%`;
            const gPosY = `${hover ? gy : 30 + oy * 30}%`;

            if (glareFrontRef.current) {
                glareFrontRef.current.style.setProperty('--g', gOpacity);
                glareFrontRef.current.style.setProperty('--gx', gPosX);
                glareFrontRef.current.style.setProperty('--gy', gPosY);
            }
            if (glareBackRef.current) {
                glareBackRef.current.style.setProperty('--g', gOpacity);
                glareBackRef.current.style.setProperty('--gx', `${100 - (hover ? gx : 50 + ox * 30)}%`);
                glareBackRef.current.style.setProperty('--gy', gPosY);
            }

            rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(rafId);
            stage.removeEventListener('pointermove', handlePointerMove);
            stage.removeEventListener('pointerleave', handlePointerLeave);
            stage.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('pointerup', handlePointerUp);
            springsRef.current = null;
        };
    }, []);

    const ticketNumber = `No. ${String(currentIndex + 1).padStart(4, '0')}`;
    const displayCollection = (resourceName || card.resourceName || 'Dictionary').replace(/_/g, ' ');
    const transcription = cleanTranscription(card.transcription);

    return (
        <div
            ref={stageRef}
            className={`${styles.cardWrapper} ${styles[animationState] || ''}`}
        >
            <div
                ref={ticketRef}
                className={`${styles.card} ${styles.cardInner} ${flipped ? styles.flipped : ''}`}
                onClick={onFlip}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                role="button"
                tabIndex={0}
                aria-pressed={flipped}
                aria-label={`Flashcard for ${card.highlightedText}. Side: ${flipped ? 'Definition' : 'Term'}. Click or press space to flip.`}
                onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        onFlip();
                    }
                }}
            >
                {/* FRONT SIDE */}
                <div className={styles.cardFront}>
                    <div className={styles.ticketBgLayer} data-depth="0.25" aria-hidden="true" />
                    <div className={styles.ticketShade} aria-hidden="true" />

                    <div className={styles.ticketMetaTop} data-depth="0.55">
                        <span className={styles.ticketCollectionName}>{displayCollection}</span>
                        <span className={styles.ticketNumber}>
                            {ticketNumber} · {totalCount}
                        </span>
                    </div>

                    <div className={styles.cardContent} data-depth="0.9">
                        <h2
                            className={styles.wordTitle}
                            onClick={(e) => {
                                e.stopPropagation();
                                onYouGlishClick(card.highlightedText);
                            }}
                            title="Click to go to YouGlish"
                        >
                            {card.highlightedText}
                        </h2>
                        {transcription && (
                            <span className={styles.transcription}>[{transcription}]</span>
                        )}
                        {card.context && (
                            <p
                                className={styles.contextFlashcard}
                                dangerouslySetInnerHTML={{
                                    __html: highlightContext(card.context, card.highlightedText, styles.highlight),
                                }}
                            />
                        )}
                    </div>

                    <div className={`${styles.flipHint} ${styles.desktopHint}`} data-depth="0.4">
                        Click to flip
                    </div>
                    <div className={`${styles.flipHint} ${styles.mobileHint}`} data-depth="0.4">
                        Tap to flip · Swipe to change
                    </div>

                    <div ref={glareFrontRef} className={styles.ticketGlare} aria-hidden="true" />
                </div>

                {/* BACK SIDE */}
                <div className={styles.cardBack}>
                    <div className={styles.ticketBgLayer} data-depth="0.25" aria-hidden="true" />

                    <div className={styles.ticketMetaTop} data-depth="0.45">
                        <span className={styles.ticketCollectionName}>{card.highlightedText}</span>
                        <span className={styles.ticketNumber}>{ticketNumber}</span>
                    </div>

                    <div className={styles.cardContent} data-depth="0.8">
                        {Boolean(card.imageUrl && card.imageUrl.trim() && !imageFailed) && (
                            <div className={styles.imageContainer}>
                                <img
                                    src={card.imageUrl}
                                    alt=""
                                    className={styles.cardImage}
                                    onError={onImageError}
                                />
                            </div>
                        )}
                        <div className={styles.definitionSection}>
                            <h3 className={styles.definitionText}>
                                {card.definition || card.translatedText}
                            </h3>
                            {card.definition && card.translatedText && (
                                <p className={styles.translationText}>{card.translatedText}</p>
                            )}
                            {card.note && card.note.trim() && (
                                <p className={styles.ticketNote}>{card.note}</p>
                            )}
                        </div>
                    </div>

                    <div className={styles.flipHint} data-depth="0.4">
                        Tap to flip back
                    </div>

                    <div ref={glareBackRef} className={styles.ticketGlare} aria-hidden="true" />
                </div>
            </div>
        </div>
    );
};
