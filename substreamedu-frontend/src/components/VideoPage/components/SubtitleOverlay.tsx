import React, { useState, useRef, useEffect } from 'react';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import { DetectedGrammarPoint } from '../../../utils/grammarDetector';
import styles from '../css/VideoPlayerPopover.module.css';

export interface SubtitleOverlayProps {
    isFullscreen: boolean;
    showSubtitles: boolean;
    currentSubtitle: string | null;
    isLoadingSubtitles: boolean;
    hasNoSubtitlesForVideo: boolean;
    activeGrammarPoint: DetectedGrammarPoint | null;
    blurSubtitles: boolean;
    isMobile: boolean;
    isPopoverOpen: boolean;
    isLoadingTranslation: boolean;
    containerRef?: React.Ref<HTMLDivElement>;
    onTextSelection: () => void;
    onExploreGrammar: (point: DetectedGrammarPoint, sentence: string) => void;
    onPauseVideo: () => void;
    onPlayVideo: () => void;
    renderedSubtitle: React.ReactNode;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
    isFullscreen,
    showSubtitles,
    currentSubtitle,
    isLoadingSubtitles,
    hasNoSubtitlesForVideo,
    activeGrammarPoint,
    blurSubtitles,
    isMobile,
    isPopoverOpen,
    isLoadingTranslation,
    containerRef,
    onTextSelection,
    onExploreGrammar,
    onPauseVideo,
    onPlayVideo,
    renderedSubtitle,
}) => {
    const [isTouchRevealed, setIsTouchRevealed] = useState<boolean>(false);
    const touchRevealTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setIsTouchRevealed(false);
        if (touchRevealTimeoutRef.current) {
            clearTimeout(touchRevealTimeoutRef.current);
        }
    }, [currentSubtitle]);

    useEffect(() => {
        return () => {
            if (touchRevealTimeoutRef.current) {
                clearTimeout(touchRevealTimeoutRef.current);
            }
        };
    }, []);

    const handleTouchStart = () => {
        if (blurSubtitles) {
            setIsTouchRevealed(true);
        }
    };

    const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        e.stopPropagation();
        onTextSelection();
        if (blurSubtitles) {
            const selection = window.getSelection();
            if (!selection || selection.toString().trim().length < 2) {
                setIsTouchRevealed(true);
                if (touchRevealTimeoutRef.current) clearTimeout(touchRevealTimeoutRef.current);
                touchRevealTimeoutRef.current = setTimeout(() => {
                    setIsTouchRevealed(false);
                }, 3500);
            }
        }
    };

    const handleSubtitleClick = () => {
        if (isMobile && blurSubtitles) {
            setIsTouchRevealed(true);
            if (touchRevealTimeoutRef.current) clearTimeout(touchRevealTimeoutRef.current);
            touchRevealTimeoutRef.current = setTimeout(() => {
                setIsTouchRevealed(false);
            }, 3500);
        }
    };

    const handleMouseLeave = () => {
        const selection = window.getSelection();
        if (!isPopoverOpen && !isLoadingTranslation && (!selection || selection.toString().trim().length === 0)) {
            onPlayVideo();
        }
    };

    return (
        <div
            className={`${styles.innerSubtitlesContainer} ${isFullscreen ? styles.fullscreenSubtitles : ''} ${!showSubtitles ? styles.hiddenSubtitles : ''}`}
            style={!isFullscreen ? {
                padding: '0 20px',
                boxSizing: 'border-box',
                overflow: 'visible',
            } : undefined}
        >
            <div
                className={`${styles.currentSubtitleContainer} ${isLoadingSubtitles ? styles.loading : ''} ${!currentSubtitle ? styles.isEmpty : styles.hasContent}`}
                ref={containerRef}
                onMouseUp={(e) => {
                    e.stopPropagation();
                    onTextSelection();
                }}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {isLoadingSubtitles ? (
                    <div className={styles.youtubeLoadingPremium}>
                        <div className={styles.loadingPulse}></div>
                        <span>Loading subtitles...</span>
                    </div>
                ) : hasNoSubtitlesForVideo ? (
                    <span className={styles.youtubeLoading}>No subtitles found for this video.</span>
                ) : currentSubtitle && (
                    <>
                        {activeGrammarPoint && (
                            <div className={styles.grammarBadgeContainer}>
                                <button
                                    type="button"
                                    className={styles.grammarBadge}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onPauseVideo();
                                        onExploreGrammar(activeGrammarPoint, currentSubtitle || '');
                                    }}
                                    title={`Explore grammar: ${activeGrammarPoint.name} (${activeGrammarPoint.cefrLevel})`}
                                    aria-label={`Explore grammar: ${activeGrammarPoint.name} (${activeGrammarPoint.cefrLevel})`}
                                >
                                    <span className={styles.grammarBadgeIconWrapper}>
                                        <Sparkles size={11} className={styles.grammarBadgeIcon} />
                                    </span>
                                    <span className={styles.grammarBadgeLabel}>
                                        {activeGrammarPoint.shortLabel || activeGrammarPoint.name}
                                    </span>
                                    <span className={styles.grammarBadgeCefr}>
                                        {activeGrammarPoint.cefrLevel}
                                    </span>
                                </button>
                            </div>
                        )}
                        <p
                            className={`${styles.currentSubtitle} ${blurSubtitles ? styles.isBlurred : ''} ${isTouchRevealed ? styles.isRevealed : ''}`}
                            onContextMenu={(e) => {
                                const isAndroid = /Android/i.test(navigator.userAgent);
                                if (!isAndroid) {
                                    e.preventDefault();
                                }
                            }}
                            onMouseEnter={onPauseVideo}
                            onMouseLeave={handleMouseLeave}
                            onClick={handleSubtitleClick}
                        >
                            {renderedSubtitle}
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};
