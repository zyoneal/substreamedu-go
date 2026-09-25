import React from 'react';
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
import styles from '../css/VideoPlayerPopover.module.css';

export interface VideoControlsOverlayProps {
    showControls: boolean;
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
    onToggleFullscreen: () => void;
}

const defaultFormatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const VideoControlsOverlay: React.FC<VideoControlsOverlayProps> = ({
    showControls,
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
    onToggleFullscreen,
}) => {
    return (
        <div
            className={`${styles.controlsOverlay} ${showControls ? styles.visible : ''}`}
            onClick={onVideoClick}
        >
            {/* 1. TOP CONTROLS */}
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

            {/* 3. BOTTOM CONTROLS */}
            <div className={styles.bottomControls} onClick={(e) => e.stopPropagation()}>
                {!isMobile && (
                    <div className={`${styles.volumeControl} ${styles.desktopOnlyControl}`}>
                        <button
                            type="button"
                            className={styles.controlButton}
                            onClick={onToggleMute}
                            aria-label={isMuted ? "Unmute" : "Mute"}
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <VolumeX size={18} /> : volume > 0.5 ? <Volume2 size={18} /> : <Volume1 size={18} />}
                        </button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={onVolumeChange}
                            className={styles.volumeSlider}
                            aria-label="Volume slider"
                        />
                    </div>
                )}
                <div className={styles.timeCurrent}>
                    {formatTime(currentTime)}
                </div>
                <div
                    className={styles.seekBarWrapper}
                    onClick={onSeek}
                    onTouchStart={onTouchSeek}
                    onTouchMove={onTouchSeek}
                    onTouchEnd={onTouchSeek}
                >
                    <div className={styles.seekBar}>
                        <div className={styles.seekBarProgress} style={{ width: `${progress}%` }}></div>
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
