import React, { useState, useRef, useEffect } from 'react';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Volume1 from 'lucide-react/dist/esm/icons/volume-1';
import Volume2 from 'lucide-react/dist/esm/icons/volume-2';
import VolumeX from 'lucide-react/dist/esm/icons/volume-x';
import Maximize from 'lucide-react/dist/esm/icons/maximize';
import Minimize from 'lucide-react/dist/esm/icons/minimize';
import Play from 'lucide-react/dist/esm/icons/play';
import Pause from 'lucide-react/dist/esm/icons/pause';
import styles from '../css/VideoPlayerPopover.module.css';

export interface VideoControlsOverlayProps {
    showControls: boolean;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    progress: number;
    volume: number;
    isMuted: boolean;
    isFullscreen: boolean;
    isMobile: boolean;
    showSubtitles: boolean;
    blurSubtitles: boolean;
    delay: number;
    formatTime?: (seconds: number) => string;
    onVideoClick: () => void;
    onTogglePlayPause: () => void;
    onOpenGrammarIndex: () => void;
    onOpenLessonStudio: () => void;
    onToggleSubtitles: () => void;
    onToggleBlur: () => void;
    onDelayChange: (delaySeconds: number) => void;
    onRepeatCurrentSubtitle: () => void;
    onToggleMute: () => void;
    onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
    onTouchSeek: (e: React.TouchEvent<HTMLDivElement>) => void;
    onSeekTo?: (seconds: number) => void;
    onToggleFullscreen: () => void;
    hideTopControls?: boolean;
}

const defaultFormatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const VideoControlsOverlay: React.FC<VideoControlsOverlayProps> = ({
    showControls,
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    isMuted,
    isFullscreen,
    isMobile,
    showSubtitles,
    blurSubtitles,
    delay,
    formatTime = defaultFormatTime,
    onVideoClick,
    onTogglePlayPause,
    onOpenGrammarIndex,
    onOpenLessonStudio,
    onToggleSubtitles,
    onToggleBlur,
    onDelayChange,
    onRepeatCurrentSubtitle,
    onToggleMute,
    onVolumeChange,
    onSeek,
    onTouchSeek,
    onSeekTo,
    onToggleFullscreen,
    hideTopControls = false,
}) => {
    const [isVolumeOpen, setIsVolumeOpen] = useState(false);
    const volumeControlRef = useRef<HTMLDivElement>(null);

    // 1:1 Apple-style Scrubber Direct Manipulation
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubPercent, setScrubPercent] = useState(0);
    const [scrubTime, setScrubTime] = useState(0);
    const seekBarWrapperRef = useRef<HTMLDivElement>(null);

    const getClientX = (e: React.PointerEvent<HTMLDivElement>): number => {
        if (typeof e.clientX === 'number' && !isNaN(e.clientX)) return e.clientX;
        if (e.nativeEvent && typeof (e.nativeEvent as any).clientX === 'number') return (e.nativeEvent as any).clientX;
        if (typeof (e as any).pageX === 'number') return (e as any).pageX;
        return 0;
    };

    const calculateSeekPos = (clientX?: number, targetEl?: HTMLElement | null): { time: number; percent: number } => {
        const el = targetEl || seekBarWrapperRef.current;
        if (!el || !duration) return { time: 0, percent: 0 };
        const rect = el.getBoundingClientRect();
        const width = rect.width || el.clientWidth || 1;
        const x = typeof clientX === 'number' ? clientX : 0;
        const pos = Math.max(0, Math.min(1, (x - rect.left) / width));
        const percent = pos * 100;
        const time = pos * duration;
        return { time, percent };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        if (typeof e.currentTarget.setPointerCapture === 'function') {
            try {
                e.currentTarget.setPointerCapture(e.pointerId);
            } catch {}
        }
        const { percent, time } = calculateSeekPos(getClientX(e), e.currentTarget);
        setIsScrubbing(true);
        setScrubPercent(percent);
        setScrubTime(time);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isScrubbing) return;
        const { percent, time } = calculateSeekPos(getClientX(e), e.currentTarget);
        setScrubPercent(percent);
        setScrubTime(time);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isScrubbing) return;
        if (typeof e.currentTarget.releasePointerCapture === 'function') {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
        }
        const { time } = calculateSeekPos(getClientX(e), e.currentTarget);
        setIsScrubbing(false);
        if (onSeekTo) {
            onSeekTo(time);
        }
    };

    const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isScrubbing) return;
        if (typeof e.currentTarget.releasePointerCapture === 'function') {
            try {
                e.currentTarget.releasePointerCapture(e.pointerId);
            } catch {}
        }
        setIsScrubbing(false);
    };

    useEffect(() => {
        if (!isVolumeOpen) return;
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            if (volumeControlRef.current && !volumeControlRef.current.contains(e.target as Node)) {
                setIsVolumeOpen(false);
            }
        };
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsVolumeOpen(false);
            }
        };
        document.addEventListener('pointerdown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isVolumeOpen]);
    return (
        <div
            className={`${styles.controlsOverlay} ${showControls ? styles.visible : ''}`}
            onClick={onVideoClick}
        >
            {/* 1. TOP CONTROLS */}
            {!hideTopControls && (
                <div className={styles.topControls} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.topControlsLeft}>
                        {/* Space for title or replace button */}
                    </div>
                    <div className={styles.topControlsRight}>
                        <button
                            type="button"
                            className={styles.controlButton}
                            onClick={onOpenGrammarIndex}
                            title="Grammar in this Video"
                            aria-label="Grammar in this Video"
                        >
                            <Sparkles size={20} />
                        </button>
                        {!isMobile && (
                            <button
                                type="button"
                                className={`${styles.controlButton} ${styles.desktopOnlyControl}`}
                                onClick={onOpenLessonStudio}
                                title="Teacher Studio / Lesson Builder"
                                aria-label="Teacher Studio / Lesson Builder"
                            >
                                <GraduationCap size={20} />
                            </button>
                        )}
                        <button
                            type="button"
                            className={styles.controlButton}
                            onClick={onToggleSubtitles}
                            aria-label={showSubtitles ? "Hide subtitles" : "Show subtitles"}
                            title={showSubtitles ? "Hide subtitles" : "Show subtitles"}
                        >
                            {showSubtitles ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                        {/* 1. Subtitle Blur Toggle */}
                        <button
                            type="button"
                            className={`${styles.quickPillButton} ${blurSubtitles ? styles.activePill : ''}`}
                            onClick={onToggleBlur}
                            title={blurSubtitles ? "Subtitles blurred (Listening practice active) — click to show plain" : "Blur subtitles (Listening practice)"}
                            aria-label="Toggle blur subtitles"
                        >
                            Blur
                        </button>

                        {/* 2. Subtitle Delay Toggle */}
                        <button
                            type="button"
                            className={`${styles.quickPillButton} ${delay === -2 ? styles.activePill : ''}`}
                            onClick={() => onDelayChange(delay === -2 ? 0 : -2)}
                            title={delay === -2 ? "Subtitle delay: -2s active — click for 0s" : "Delay subtitles by 2s (Listening practice)"}
                            aria-label="Toggle subtitle delay -2s"
                        >
                            {delay === -2 ? "-2s" : "Delay"}
                        </button>

                        {/* 3. Repeat Subtitle 3x */}
                        <button
                            type="button"
                            className={styles.quickPillButton}
                            onClick={onRepeatCurrentSubtitle}
                            title="Repeat current subtitle 3 times"
                            aria-label="Repeat subtitle 3 times"
                        >
                            <RotateCcw size={12} />
                            <span>3x</span>
                        </button>
                    </div>
                </div>
            )}

            {/* 3. BOTTOM CONTROLS */}
            <div className={styles.bottomControls} onClick={(e) => e.stopPropagation()}>
                {/* Play / Pause Toggle Button */}
                <button
                    type="button"
                    className={styles.controlButton}
                    onClick={onTogglePlayPause}
                    aria-label={isPlaying ? "Pause" : "Play"}
                    title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                >
                    {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                </button>

                {!isMobile && (
                    <div
                        className={`${styles.volumeControl} ${styles.desktopOnlyControl}`}
                        ref={volumeControlRef}
                    >
                        <button
                            type="button"
                            className={`${styles.controlButton} ${isVolumeOpen ? styles.activeControlButton : ''}`}
                            onClick={() => setIsVolumeOpen((prev) => !prev)}
                            aria-label={isMuted ? "Unmute" : "Volume"}
                            title={isMuted ? "Unmute" : "Volume"}
                        >
                            {isMuted || volume === 0 ? (
                                <VolumeX size={18} />
                            ) : volume > 0.5 ? (
                                <Volume2 size={18} />
                            ) : (
                                <Volume1 size={18} />
                            )}
                        </button>

                        {isVolumeOpen && (
                            <div
                                className={styles.verticalVolumePopup}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <span className={styles.volumePercentageText}>
                                    {isMuted || volume === 0 ? '0%' : `${Math.round(volume * 100)}%`}
                                </span>
                                <div className={styles.verticalVolumeTrackWrapper}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={isMuted ? 0 : volume}
                                        onChange={onVolumeChange}
                                        className={styles.verticalVolumeSlider}
                                        aria-label="Volume slider"
                                    />
                                </div>
                                <button
                                    type="button"
                                    className={styles.volumeMuteMiniButton}
                                    onClick={onToggleMute}
                                    aria-label={isMuted ? "Unmute" : "Mute"}
                                    title={isMuted ? "Unmute" : "Mute"}
                                >
                                    {isMuted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
                                </button>
                            </div>
                        )}
                    </div>
                )}
                <div className={styles.timeCurrent}>
                    {formatTime(currentTime)}
                </div>
                <div
                    ref={seekBarWrapperRef}
                    className={`${styles.seekBarWrapper} ${isScrubbing ? styles.scrubbing : ''}`}
                    role="slider"
                    tabIndex={0}
                    aria-label="Seek video timeline"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(duration || 100)}
                    aria-valuenow={Math.round(currentTime || 0)}
                    onKeyDown={(e) => {
                        if (!onSeekTo || !duration) return;
                        if (e.key === 'ArrowRight') {
                            e.preventDefault();
                            onSeekTo(Math.min(duration, (currentTime || 0) + 5));
                        } else if (e.key === 'ArrowLeft') {
                            e.preventDefault();
                            onSeekTo(Math.max(0, (currentTime || 0) - 5));
                        }
                    }}
                    onClick={onSeek}
                    onTouchStart={onTouchSeek}
                    onTouchMove={onTouchSeek}
                    onTouchEnd={onTouchSeek}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                >
                    {isScrubbing && (
                        <div
                            className={styles.scrubBadge}
                            style={{ left: `${scrubPercent}%` }}
                        >
                            {formatTime(scrubTime)}
                        </div>
                    )}
                    <div className={styles.seekBar}>
                        <div
                            className={styles.seekBarProgress}
                            style={{ width: `${isScrubbing ? scrubPercent : progress}%` }}
                        />
                    </div>
                </div>
                <div className={styles.timeDuration}>
                    {formatTime(duration)}
                </div>
                <button
                    type="button"
                    className={styles.controlButton}
                    onClick={onToggleFullscreen}
                    aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                    title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                >
                    {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
            </div>
        </div>
    );
};
