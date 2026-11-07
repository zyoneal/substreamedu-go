import { useEffect, useCallback, useRef } from 'react';

export interface SubtitleTiming {
    text: string;
    startTimeMs: number;
    endTimeMs: number;
}

export interface UseVideoKeyboardShortcutsParams {
    videoId: string | null;
    youtubePlayerRef: React.RefObject<any>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    playVideo: () => void;
    pauseVideo: () => void;
    safePlay: () => void;
    resetPopoverState: () => void;
    toggleMaxFit: () => void;
    subtitlesForVideo: SubtitleTiming[] | null;
    currentSubtitle: string | null;
    disabled?: boolean;
}

export interface UseVideoKeyboardShortcutsResult {
    handleRepeatCurrentSubtitle: () => Promise<void>;
    seekRelative: (seconds: number) => void;
    togglePlayPause: () => void;
}

/**
 * Encapsulates global keyboard navigation, phrase-level seeking (+/-4s),
 * play/pause toggling, and 3x subtitle loop repeat for YouTube and HTML5 video.
 */
export const useVideoKeyboardShortcuts = ({
    videoId,
    youtubePlayerRef,
    videoRef,
    playVideo,
    pauseVideo,
    safePlay,
    resetPopoverState,
    toggleMaxFit,
    subtitlesForVideo,
    currentSubtitle,
    disabled = false,
}: UseVideoKeyboardShortcutsParams): UseVideoKeyboardShortcutsResult => {
    const repeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const clearRepeatTimers = useCallback(() => {
        if (repeatIntervalRef.current) {
            clearInterval(repeatIntervalRef.current);
            repeatIntervalRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.ontimeupdate = null;
        }
    }, [videoRef]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearRepeatTimers();
        };
    }, [clearRepeatTimers]);

    const seekRelative = useCallback((seconds: number) => {
        if (videoId && youtubePlayerRef.current) {
            try {
                const currentTime = youtubePlayerRef.current.getCurrentTime();
                youtubePlayerRef.current.seekTo(currentTime + seconds, true);
            } catch {
                // Ignore player errors during rapid seeking
            }
        } else if (videoRef.current) {
            videoRef.current.currentTime += seconds;
        }
    }, [videoId, youtubePlayerRef, videoRef]);

    const togglePlayPause = useCallback(() => {
        if (videoId && youtubePlayerRef.current) {
            try {
                const state = youtubePlayerRef.current.getPlayerState();
                if (state === 1) {
                    youtubePlayerRef.current.pauseVideo();
                } else {
                    youtubePlayerRef.current.playVideo();
                }
            } catch {
                // Ignore errors
            }
        } else if (videoRef.current) {
            if (videoRef.current.paused) {
                playVideo();
            } else {
                pauseVideo();
            }
        }
    }, [videoId, youtubePlayerRef, videoRef, playVideo, pauseVideo]);

    const repeatSubtitle = useCallback((subtitle: { startTimeMs: number; endTimeMs: number }) => {
        clearRepeatTimers();
        const { startTimeMs, endTimeMs } = subtitle;
        const repeatCount = 3;
        let currentRepeat = 0;

        if (videoId && youtubePlayerRef.current) {
            const repeatLoop = () => {
                if (youtubePlayerRef.current && currentRepeat < repeatCount) {
                    youtubePlayerRef.current.seekTo(startTimeMs / 1000, true);
                    youtubePlayerRef.current.playVideo();

                    repeatIntervalRef.current = setInterval(async () => {
                        if (youtubePlayerRef.current) {
                            try {
                                const currentTime = await youtubePlayerRef.current.getCurrentTime();
                                if (currentTime >= endTimeMs / 1000) {
                                    currentRepeat++;
                                    if (currentRepeat < repeatCount) {
                                        youtubePlayerRef.current.seekTo(startTimeMs / 1000);
                                    } else {
                                        clearRepeatTimers();
                                    }
                                }
                            } catch {
                                clearRepeatTimers();
                            }
                        }
                    }, 100);
                }
            };
            repeatLoop();
        } else if (videoRef.current) {
            const repeatLoop = () => {
                if (videoRef.current && currentRepeat < repeatCount) {
                    videoRef.current.currentTime = startTimeMs / 1000;
                    safePlay();

                    videoRef.current.ontimeupdate = () => {
                        if (videoRef.current && videoRef.current.currentTime >= endTimeMs / 1000) {
                            currentRepeat++;
                            if (currentRepeat < repeatCount) {
                                videoRef.current.currentTime = startTimeMs / 1000;
                            } else {
                                clearRepeatTimers();
                            }
                        }
                    };
                }
            };
            repeatLoop();
        }
    }, [videoId, youtubePlayerRef, videoRef, safePlay, clearRepeatTimers]);

    const handleRepeatCurrentSubtitle = useCallback(async () => {
        if (!subtitlesForVideo || subtitlesForVideo.length === 0) return;

        let subtitle = currentSubtitle
            ? subtitlesForVideo.find((sub) => sub.text === currentSubtitle)
            : undefined;

        if (!subtitle) {
            let curSec = 0;
            if (videoId && youtubePlayerRef.current) {
                try {
                    curSec = await youtubePlayerRef.current.getCurrentTime();
                } catch {
                    curSec = 0;
                }
            } else if (videoRef.current) {
                curSec = videoRef.current.currentTime;
            }

            const curTimeMs = curSec * 1000;
            if (curTimeMs > 0) {
                subtitle = subtitlesForVideo.find(
                    (sub) => curTimeMs >= sub.startTimeMs && curTimeMs <= sub.endTimeMs + 1500
                );
            }
        }

        if (subtitle) {
            repeatSubtitle(subtitle);
        }
    }, [subtitlesForVideo, currentSubtitle, videoId, youtubePlayerRef, videoRef, repeatSubtitle]);

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        if (disabled) return;

        const activeElement = document.activeElement as HTMLElement | null;
        if (activeElement && (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT')) {
            return;
        }

        if (event.code === 'Escape') {
            resetPopoverState();
        } else if (event.code === 'ArrowRight') {
            seekRelative(4);
        } else if (event.code === 'ArrowLeft') {
            seekRelative(-4);
        } else if (event.code === 'KeyT') {
            event.preventDefault();
            toggleMaxFit();
        } else if (event.code === 'Space') {
            event.preventDefault();
            togglePlayPause();
        }
    }, [disabled, resetPopoverState, seekRelative, toggleMaxFit, togglePlayPause]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    return {
        handleRepeatCurrentSubtitle,
        seekRelative,
        togglePlayPause,
    };
};
