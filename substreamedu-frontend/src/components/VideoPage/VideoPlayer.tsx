import React, { useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { DictionaryService } from '../../services/DictionaryService';
import { AuthService } from '../../services/AuthService';
import { VideoPlayerModals } from './components/VideoPlayerModals';
import { SubtitleSelectionBar } from './components/SubtitleSelectionBar';
import { VideoTranslationPopover } from './components/VideoTranslationPopover';
import { VideoControlsOverlay } from './components/VideoControlsOverlay';
import { SubtitleOverlay } from './components/SubtitleOverlay';
import { useSubtitleSearch } from './hooks/useSubtitleSearch';
import { useVideoKeyboardShortcuts } from './hooks/useVideoKeyboardShortcuts';
import { useSubtitleTranslation } from './hooks/useSubtitleTranslation';
import { useVideoDimensions } from './hooks/useVideoDimensions';
import { useVideoPlayer } from './hooks/useVideoPlayer';
import { useWordTooltip } from './hooks/useWordTooltip';
import { useVideoOnboarding } from './hooks/useVideoOnboarding';
import { useVideoModalsState } from './hooks/useVideoModalsState';
import { useVideoSubtitles } from './hooks/useVideoSubtitles';
import {
    formatSubtitleForDisplay,
    renderHighlightedSubtitle,
} from './utils/subtitleHighlightUtils';
import styles from './css/VideoPlayerPopover.module.css';
import { LanguageContext } from '../LanguageContext';
import { AuthContext } from '../../store/AuthContext';
import { useIntl, FormattedMessage } from 'react-intl';
import { Zap, ArrowLeft, ArrowRight, AlertTriangle, Play } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { isMobile } from 'react-device-detect';
import { createPortal } from 'react-dom';
import MobileHint from '../shared/MobileHint';
import { Modal } from '../ui/modal';
import { MOBILE_HINT_STEPS } from '../shared/MobileHint.types';
import { useUserDictionaryItemsLight } from '../../hooks/useDictionary';
import { debugLog, debugError } from '../../utils/debug';
import {
    Subtitle,
    DictionaryItem,
} from './types';

interface VideoPlayerProps {
    videoUrl: string;
    mimeType: string;
    subtitles: { name: string }[];
    onSubtitleSelect?: () => void;
    fetchSubtitles: () => void;
    onSubtitleUpload: (file: File) => void;
    isExtractingSubtitles?: boolean;
    onSelectAnotherVideo?: () => void;
    isOnboarding?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
    videoUrl,
    subtitles,
    onSubtitleSelect,
    onSubtitleUpload,
    isExtractingSubtitles = false,
    onSelectAnotherVideo,
    isOnboarding = false,
}) => {
    const { learningLanguage: contextLearningLanguage, fluentLanguage, setIsPlayerActive } = useContext(LanguageContext);
    const learningLanguage = contextLearningLanguage || 'en';
    const { authorities, isLoggedIn } = useContext(AuthContext);
    const isAdmin = authorities.includes('SYSTEM_ADMIN') || authorities.includes('ADMIN');
    const intl = useIntl();
    const isMountedRef = useRef(true);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);
    const [dictionaryItems, setDictionaryItems] = useState<DictionaryItem[]>([]);
    const [highlightedWords, setHighlightedWords] = useState<DictionaryItem[]>([]);
    const [showMobileHint, setShowMobileHint] = useState(true);
    const cardContainerRef = useRef<HTMLDivElement>(null);
    const lastFetchedResourceRef = useRef<string | null>(null);

    useEffect(() => {
        setIsPlayerActive?.(true);
        return () => {
            setIsPlayerActive?.(false);
            isMountedRef.current = false;
        };
    }, [setIsPlayerActive]);

    const { data: userDictionaryItems } = useUserDictionaryItemsLight();

    const showNotification = useCallback((message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    }, []);

    // 1. Core video playback hook
    const videoPlayer = useVideoPlayer({
        videoUrl,
        isPopoverOpen,
    });

    const {
        videoRef,
        videoContainerRef,
        videoWrapperRef,
        youtubePlayerRef,
        videoId,
        isPlaying,
        volume,
        isMuted,
        progress,
        duration,
        currentTime,
        isFullscreen,
        showControls,
        playbackError,
        safePlay,
        togglePlayPause,
        pauseVideo,
        playVideo,
        seekTo,
        handleSeek,
        handleVolumeChange,
        toggleMute,
        toggleFullscreen,
        formatTime,
        handlePlayerReady,
        handleVideoMetadata,
        handleVideoError,
        handleVideoClick,
        setCurrentTime,
        setProgress,
        setIsPlaying,
        setIsFullscreen,
        setShowControls,
    } = videoPlayer;

    // 2. Onboarding state hook
    const {
        onboardingDismissed,
        setOnboardingStep,
        isGuestDemoMode,
        isOnboardingActive,
        isOnboardingMode,
        handleDismissOnboarding,
        onboardingUnderlineWords,
    } = useVideoOnboarding({
        videoUrl,
        videoId,
        isLoggedIn,
        isPopoverOpen,
        isOnboardingProp: isOnboarding,
    });

    // 3. Dictionary items loading for cards
    const fetchDictionaryItemsForCards = useCallback(async (resourceId?: string, force: boolean = false) => {
        if (!AuthService.getUserEmail()) {
            setDictionaryItems([]);
            return;
        }
        const name = resourceId || '';
        if (!name) {
            debugLog('No fileName available for cards dictionary fetch');
            return;
        }
        if (!force && lastFetchedResourceRef.current === name) {
            debugLog('Skipping duplicate cards dictionary fetch for:', name);
            return;
        }
        lastFetchedResourceRef.current = name;
        try {
            const items = await DictionaryService.fetchDictionaryItemsByResourceName(name);
            setDictionaryItems(items);
            debugLog('Cards dictionary items loaded successfully:', items.length);
        } catch (err) {
            debugError('Failed to fetch cards dictionary items:', err);
            setDictionaryItems([]);
        }
    }, []);

    // 4. Subtitles synchronization and lifecycle hook
    const {
        subtitlesForVideo,
        setSubtitlesForVideo,
        currentSubtitle,
        selectedSubtitle,
        setSelectedSubtitle,
        fileName,
        setFileName,
        delay,
        handleDelayChange,
        showSubtitles,
        setShowSubtitles,
        blurSubtitles,
        setBlurSubtitles,
        effectiveBlur,
        effectiveDelay,
        isYoutubeSubsLoading,
        sanitizeSubtitles,
        getResourceName,
        handleSubtitleClick,
        subtitleInputRef,
        handleSubtitleUploadEvent,
    } = useVideoSubtitles({
        videoUrl,
        videoId,
        videoRef,
        youtubePlayerRef,
        duration,
        setCurrentTime,
        setProgress,
        isOnboardingMode,
        onSubtitleSelect,
        onSubtitleUpload,
        showNotification,
        fetchDictionaryItemsForCards,
    });

    // 5. Video Modals state hook
    const {
        isReelModalOpen,
        setIsReelModalOpen,
        reelModalData,
        selectedGrammarPoint,
        setSelectedGrammarPoint,
        selectedGrammarSentence,
        setSelectedGrammarSentence,
        isGrammarModalOpen,
        setIsGrammarModalOpen,
        isGrammarIndexOpen,
        setIsGrammarIndexOpen,
        isLessonStudioOpen,
        setIsLessonStudioOpen,
        showLanguageOverlay,
        setShowLanguageOverlay,
        activeGrammarPoint,
        videoGrammarMatches,
        openReelModal,
    } = useVideoModalsState({
        currentSubtitle,
        subtitlesForVideo,
    });

    // 6. Word Tooltip DOM hover hook
    const { tooltipState } = useWordTooltip();

    // 7. Video Dimensions hook
    const { playerWidth, toggleMaxFit, handleVideoMetadataWithAspect } = useVideoDimensions({
        videoUrl,
        videoId,
        videoRef,
        handleVideoMetadata,
    });

    // 8. Subtitle Search hook
    const {
        isSearchingSubtitles,
        showSubtitleSearchModal,
        setShowSubtitleSearchModal,
        showFilmSelection,
        setShowFilmSelection,
        availableSubtitles,
        availableFilms,
        searchQueryForFilms,
        isTemporarySubtitles,
        temporarySubtitleInfo,
        searchSubtitlesForVideo,
        handleSelectFilmForSubtitles,
        handleQuickTest,
        handleKeepTemporarySubtitles,
        handleDiscardTemporarySubtitles,
        handleSelectSubtitleFromSearch,
    } = useSubtitleSearch({
        videoId,
        videoUrl,
        learningLanguage,
        videoRef,
        duration,
        subtitlesForVideo,
        setSubtitlesForVideo,
        setFileName,
        setSelectedSubtitle,
        sanitizeSubtitles,
        onSubtitleUpload,
        showNotification,
    });

    // 9. Subtitle Translation & Dictionary hook
    const {
        translationData,
        setTranslationData,
        selectedText,
        setSelectedText,
        selectedSentence,
        isLoading,
        showSubmitButton,
        selectionPosition,
        translationOptions,
        handleSelectOption,
        handleTextSelection,
        fetchTranslation,
        resetPopoverState,
        saveToDict,
        isSaving,
    } = useSubtitleTranslation({
        currentSubtitle,
        subtitlesForVideo,
        fluentLanguage,
        learningLanguage,
        getResourceName,
        isMobile,
        pauseVideo,
        playVideo,
        showNotification,
        isMountedRef,
        dictionaryItems,
        setDictionaryItems,
        setHighlightedWords,
        setOnboardingStep,
        onRequireLanguageSelection: () => setShowLanguageOverlay(true),
        isPopoverOpen,
        setIsPopoverOpen,
    });

    // 10. Video Keyboard Shortcuts hook
    const { handleRepeatCurrentSubtitle } = useVideoKeyboardShortcuts({
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
    });

    // Subtitle card loading on filename/videoId change
    useEffect(() => {
        if (fileName || videoId) {
            fetchDictionaryItemsForCards(videoId || fileName);
        }
    }, [fileName, videoId, fetchDictionaryItemsForCards]);

    // Cached dictionary items sync
    useEffect(() => {
        if (userDictionaryItems) {
            const actualItems = Array.isArray(userDictionaryItems)
                ? userDictionaryItems
                : ((userDictionaryItems as any).items || []);
            const normalizedItems = actualItems.map((item: any) => ({
                id: item.id,
                resourceName: item.resourceName || '',
                highlightedText: item.highlightedText || '',
                translatedText: item.translatedText,
                context: item.context || '',
                definition: item.definition,
            }));
            setHighlightedWords(normalizedItems);
        }
    }, [userDictionaryItems]);

    // Fullscreen event listener sync
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(
                document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).webkitCurrentFullScreenElement
            );
            setIsFullscreen(isCurrentlyFullscreen);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, [setIsFullscreen]);

    // Context menu prevention on video container
    useEffect(() => {
        const preventContextMenu = (e: Event) => {
            if (videoWrapperRef.current?.contains(e.target as Node)) {
                e.preventDefault();
                return false;
            }
        };

        document.addEventListener('contextmenu', preventContextMenu);
        return () => {
            document.removeEventListener('contextmenu', preventContextMenu);
        };
    }, [videoWrapperRef]);

    // Touch seek handler
    const handleTouchSeek = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : null;
        if (!touch || !duration) return;
        if (e.cancelable) e.preventDefault();
        const seekBar = e.currentTarget;
        const rect = seekBar.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        seekTo(pos * duration);
    }, [seekTo, duration]);

    // Auto-hide controls after 3.5s of playback
    useEffect(() => {
        if (!showControls || !isPlaying) return;
        const timer = setTimeout(() => {
            setShowControls(false);
        }, 3500);
        return () => clearTimeout(timer);
    }, [showControls, isPlaying, setShowControls]);

    const handleYoutubePlay = useCallback(() => {
        setIsPlaying(true);
        if (youtubePlayerRef.current?.unloadModule) {
            try { youtubePlayerRef.current.unloadModule('captions'); } catch {}
        }
    }, [setIsPlaying, youtubePlayerRef]);

    const handleYoutubeStateChange = useCallback((event: { target: YouTubePlayer }) => {
        if (event.target?.unloadModule) {
            try { event.target.unloadModule('captions'); } catch {}
        }
    }, []);

    const youtubeOpts = useMemo(() => ({
        width: '100%',
        height: '100%',
        playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            quality: 'hd1080',
            cc_load_policy: 3,
            cc_lang_pref: 'invalid',
        },
    }), []);

    return (
        <div className={styles.container} style={{ position: 'relative' }}>
            {isTemporarySubtitles && temporarySubtitleInfo && (
                <div className={styles.syncCheckBanner}>
                    <div className={styles.syncCheckBannerContent}>
                        <div className={styles.syncCheckBannerIconWrapper}>
                            <Zap className="w-4 h-4" style={{ color: '#EAB308', flexShrink: 0 }} />
                        </div>
                        <div>
                            <p className={styles.syncCheckBannerTitle}>
                                Testing: {temporarySubtitleInfo.releaseName || temporarySubtitleInfo.name}
                            </p>
                            <p className={styles.syncCheckBannerSubtext}>
                                Watch video to check sync. Keep if good or discard to try another.
                            </p>
                        </div>
                    </div>
                    <div className={styles.syncCheckBannerActions}>
                        <button
                            onClick={handleKeepTemporarySubtitles}
                            aria-label="Keep temporary subtitles"
                            className={styles.syncCheckKeepButton}
                        >
                            Keep
                        </button>
                        <button
                            onClick={handleDiscardTemporarySubtitles}
                            aria-label="Discard and try another subtitle"
                            className={styles.syncCheckDiscardButton}
                        >
                            Try Another
                        </button>
                    </div>
                </div>
            )}

            <div className={styles.expandedVideo}>
                <div
                    className={styles.videoWrapper}
                    ref={videoContainerRef}
                    style={isFullscreen ? {
                        width: '100%',
                        height: '100%',
                        maxWidth: '100%',
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        backgroundColor: '#0d0c0b',
                    } : {
                        marginTop: '0',
                        maxWidth: `${playerWidth}px`,
                        width: '100%',
                        transition: 'max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        ['--player-custom-width' as any]: `${playerWidth}px`,
                    }}
                >
                    {!isFullscreen && (
                        isGuestDemoMode ? (
                            <div className={styles.demoPlayerHeader} data-testid="demo-player-header">
                                <Link
                                    to="/"
                                    onClick={handleDismissOnboarding}
                                    className={styles.demoBackHomeButton}
                                    aria-label={intl.formatMessage({ id: 'videoPage.backToHome', defaultMessage: 'Back to Home' })}
                                >
                                    <ArrowLeft size={16} strokeWidth={2.5} />
                                    <span>
                                        <FormattedMessage id="videoPage.backToHome" defaultMessage="Back to Home" />
                                    </span>
                                </Link>

                                <Link to="/login" className={styles.demoCtaButton}>
                                    <span>
                                        <FormattedMessage id="videoPage.startFreeCta" defaultMessage="Start Free" />
                                    </span>
                                    <ArrowRight size={13} strokeWidth={2.5} />
                                </Link>
                            </div>
                        ) : (
                            <div className={styles.registeredPlayerHeader}>
                                {isOnboardingActive ? (
                                    <Link
                                        to={isLoggedIn ? '/dashboard' : '/'}
                                        onClick={handleDismissOnboarding}
                                        className={styles.backButton}
                                        aria-label={intl.formatMessage({ id: 'exit', defaultMessage: 'Exit' })}
                                    >
                                        <ArrowLeft size={18} strokeWidth={2.5} />
                                        <span>
                                            <FormattedMessage id="exit" defaultMessage="Exit" />
                                        </span>
                                    </Link>
                                ) : (
                                    onSelectAnotherVideo && (
                                        <button
                                            onClick={onSelectAnotherVideo}
                                            className={styles.backButton}
                                            aria-label={intl.formatMessage({ id: 'videoPage.selectAnotherVideo', defaultMessage: 'Replace' })}
                                        >
                                            <ArrowLeft size={18} strokeWidth={2.5} />
                                            <span>
                                                <FormattedMessage id="videoPage.selectAnotherVideo" defaultMessage="Replace" />
                                            </span>
                                        </button>
                                    )
                                )}
                            </div>
                        )
                    )}

                    <div
                        className={`${styles.videoWithSubtitles} ${isFullscreen ? styles.fullscreenContainer : ''} ${videoId ? styles.hasYoutube : ''}`}
                        style={isFullscreen ? {
                            position: 'relative',
                            width: '100%',
                            height: '100%',
                            display: 'block',
                        } : undefined}
                    >
                        <div
                            className={styles.videoPlayerContainer}
                            onClick={handleVideoClick}
                            onMouseMove={() => {
                                if (!showControls) setShowControls(true);
                            }}
                            style={isFullscreen ? {
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                width: '100%',
                                height: '100%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            } : undefined}
                        >
                            {videoId ? (
                                <div className={styles.youtubePlayerWrapper} onClick={handleVideoClick}>
                                    <YouTube
                                        videoId={videoId}
                                        onReady={handlePlayerReady}
                                        onPlay={handleYoutubePlay}
                                        onPause={() => setIsPlaying(false)}
                                        onEnd={() => setIsPlaying(false)}
                                        onStateChange={handleYoutubeStateChange}
                                        className={styles.videoPlayer}
                                        opts={youtubeOpts}
                                    />
                                </div>
                            ) : (
                                <video
                                    ref={videoRef}
                                    src={videoUrl}
                                    className={`${styles.videoPlayer} ${isFullscreen ? styles.fullscreenVideoMode : ''}`}
                                    playsInline
                                    autoPlay
                                    onClick={togglePlayPause}
                                    onLoadedMetadata={handleVideoMetadataWithAspect}
                                    onCanPlay={handleVideoMetadataWithAspect}
                                    onError={handleVideoError}
                                    onPlay={() => setIsPlaying(true)}
                                    onPause={() => setIsPlaying(false)}
                                    {...({ 'webkit-playsinline': 'true' } as any)}
                                    {...({ 'x-webkit-airplay': 'allow' } as any)}
                                    style={isFullscreen ? {
                                        width: '100%',
                                        height: '100%',
                                        maxWidth: '100%',
                                        maxHeight: '100%',
                                        objectFit: 'contain',
                                    } : undefined}
                                >
                                    Your browser does not support the video tag.
                                </video>
                            )}

                            {playbackError && (
                                <div className={styles.playbackErrorOverlay}>
                                    <div className={styles.playbackErrorContent}>
                                        <div className={styles.playbackErrorIcon}>
                                            <AlertTriangle size={36} className="text-red-400 mx-auto" />
                                        </div>
                                        <h3>
                                            {playbackError === 'codec_unsupported'
                                                ? 'Video Codec Unsupported'
                                                : (sessionStorage.getItem('videoSource') === 'googledrive' || (videoUrl && videoUrl.includes('drive.google.com')))
                                                    ? 'Google Drive Video Playback Error'
                                                    : 'Playback Error'}
                                        </h3>
                                        <p>
                                            {playbackError === 'codec_unsupported'
                                                ? 'Your device (likely Chromebook) cannot decode this specific MP4/MKV video track. Only audio is playing.'
                                                : (sessionStorage.getItem('videoSource') === 'googledrive' || (videoUrl && videoUrl.includes('drive.google.com')))
                                                    ? 'The video could not be streamed from Google Drive. Ensure the file sharing is set to "Anyone with the link can view", the file is an MP4/WebM video, and daily download limits are not exceeded.'
                                                    : 'An error occurred while trying to play this video.'}
                                        </p>
                                        <div className={styles.playbackErrorAdvice}>
                                            <strong>Tip:</strong>{' '}
                                            {(sessionStorage.getItem('videoSource') === 'googledrive' || (videoUrl && videoUrl.includes('drive.google.com')))
                                                ? 'Check Google Drive sharing settings (Right click file → Share → "Anyone with the link").'
                                                : 'Try converting the file to MP4 (H.264) or WebM for better compatibility.'}
                                        </div>
                                        <button className={styles.minimalistButton} onClick={() => window.location.reload()}>
                                            Reload Page
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!isPlaying && (
                                <button
                                    type="button"
                                    className={styles.centerBigPlayButton}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playVideo();
                                    }}
                                    aria-label="Play video"
                                    data-testid="center-big-play-button"
                                >
                                    <Play size={40} fill="currentColor" />
                                </button>
                            )}

                            <VideoControlsOverlay
                                showControls={showControls}
                                isPlaying={isPlaying}
                                currentTime={currentTime}
                                duration={duration}
                                progress={progress}
                                volume={volume}
                                isMuted={isMuted}
                                isFullscreen={isFullscreen}
                                isMobile={isMobile}
                                showSubtitles={showSubtitles}
                                blurSubtitles={effectiveBlur}
                                delay={effectiveDelay}
                                hideTopControls={isOnboardingMode}
                                formatTime={formatTime}
                                onVideoClick={handleVideoClick}
                                onTogglePlayPause={togglePlayPause}
                                onOpenGrammarIndex={() => {
                                    pauseVideo();
                                    setIsGrammarIndexOpen(true);
                                }}
                                onOpenLessonStudio={() => {
                                    pauseVideo();
                                    setIsLessonStudioOpen(true);
                                }}
                                onToggleSubtitles={() => setShowSubtitles(!showSubtitles)}
                                onToggleBlur={() => setBlurSubtitles(prev => !prev)}
                                onDelayChange={handleDelayChange}
                                onRepeatCurrentSubtitle={handleRepeatCurrentSubtitle}
                                onToggleMute={toggleMute}
                                onVolumeChange={handleVolumeChange}
                                onSeek={handleSeek}
                                onTouchSeek={handleTouchSeek}
                                onSeekTo={seekTo}
                                onToggleFullscreen={toggleFullscreen}
                            />
                        </div>

                        {(selectedSubtitle || videoId) && (
                            <SubtitleOverlay
                                isFullscreen={isFullscreen}
                                showSubtitles={showSubtitles}
                                currentSubtitle={currentSubtitle}
                                isLoadingSubtitles={isYoutubeSubsLoading || isSearchingSubtitles}
                                hasNoSubtitlesForVideo={Boolean(videoId && (!subtitlesForVideo || subtitlesForVideo.length === 0))}
                                activeGrammarPoint={activeGrammarPoint}
                                blurSubtitles={effectiveBlur}
                                isMobile={isMobile}
                                isPopoverOpen={isPopoverOpen}
                                isLoadingTranslation={isLoading}
                                containerRef={videoWrapperRef}
                                onTextSelection={handleTextSelection}
                                onExploreGrammar={(point, sentence) => {
                                    pauseVideo();
                                    setSelectedGrammarPoint(point);
                                    setSelectedGrammarSentence(sentence);
                                    setIsGrammarModalOpen(true);
                                }}
                                onPauseVideo={pauseVideo}
                                onPlayVideo={playVideo}
                                renderedSubtitle={renderHighlightedSubtitle(
                                    formatSubtitleForDisplay(currentSubtitle || ''),
                                    highlightedWords,
                                    undefined,
                                    onboardingUnderlineWords
                                )}
                                showOnboardingPointer={false}
                                isOnboardingMode={isOnboardingMode}
                                hasSelectedText={isPopoverOpen}
                            />
                        )}

                        {isExtractingSubtitles && (
                            <div className={styles.subtitleContainer}>
                                <div className={styles.innerSubtitlesContainer}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
                                        <div className={styles.loadingPulse}></div>
                                        <span style={{ color: '#ffffff', fontSize: '16px' }}>Extracting internal subtitles...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {!selectedSubtitle && !videoId && !isExtractingSubtitles && (
                            <SubtitleSelectionBar
                                subtitles={subtitles}
                                fileName={fileName || ''}
                                isSearchingSubtitles={isSearchingSubtitles}
                                subtitleInputRef={subtitleInputRef}
                                onSelectSubtitle={handleSubtitleClick}
                                onSearchSubtitles={() => searchSubtitlesForVideo()}
                                onUploadSubtitles={handleSubtitleUploadEvent}
                            />
                        )}
                    </div>
                </div>
                {notification && <div className={styles.notification}>{notification}</div>}
            </div>

            <VideoTranslationPopover
                selectionPosition={selectionPosition}
                isPopoverOpen={isPopoverOpen}
                isLoading={isLoading}
                isMobile={isMobile}
                isOnboarding={isOnboardingMode}
                selectedText={selectedText}
                selectedSentence={selectedSentence}
                translationData={translationData}
                translationOptions={translationOptions}
                isSaving={isSaving}
                isAdmin={isAdmin}
                showSubmitButton={showSubmitButton}
                showSubscribeButton={false}
                onSelectOption={handleSelectOption}
                onChunkClick={(chunk) => {
                    if (selectedSentence) {
                        setSelectedText(chunk);
                        fetchTranslation(chunk, selectedSentence, false);
                    }
                }}
                onSaveToDict={saveToDict}
                onOpenReelModal={() => {
                    if (!selectedText) return;
                    const exactSub = subtitlesForVideo?.find(s => s.text === selectedSentence);
                    const timeSub = subtitlesForVideo?.find(s => currentTime >= s.startTimeMs / 1000 - 0.5 && currentTime <= s.endTimeMs / 1000 + 0.5);
                    const curSub = exactSub || timeSub;

                    const startSec = curSub ? curSub.startTimeMs / 1000 : Math.max(0, currentTime - 2);
                    const endSec = curSub ? curSub.endTimeMs / 1000 : currentTime + 3;
                    const sentence = curSub ? curSub.text : selectedSentence || selectedText;

                    openReelModal({
                        word: selectedText,
                        translation: translationData.translation || '',
                        transcription: translationData.transcription || undefined,
                        sentence,
                        startSec,
                        endSec,
                    });
                }}
                onClose={() => {
                    setIsPopoverOpen(false);
                    resetPopoverState();
                }}
                onMouseEnter={pauseVideo}
                onRemoveImage={() => {
                    setTranslationData(prev => ({ ...prev, showImage: false }));
                }}
            />

            <Modal isOpen={showLanguageOverlay} onClose={() => setShowLanguageOverlay(false)} size="sm">
                <Modal.Body style={{ textAlign: 'center', padding: '28px 24px 20px' }}>
                    <p style={{ margin: '0 0 20px', color: 'var(--color-ink, #ede8e0)', fontSize: '15px' }}>
                        {intl.formatMessage({ id: 'selectLanguageToTranslate', defaultMessage: 'Select a language in the header to translate' })}
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowLanguageOverlay(false)}
                        style={{
                            marginTop: '4px',
                            background: '#0d0c0b',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 24px',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        OK
                    </button>
                </Modal.Body>
            </Modal>

            <MobileHint
                isVisible={isMobile && showMobileHint}
                onClose={() => setShowMobileHint(false)}
                steps={MOBILE_HINT_STEPS.VIDEO_PLAYER}
            />

            {tooltipState && createPortal(
                <div
                    className={styles.wordTooltip}
                    style={{
                        left: tooltipState.x,
                        top: tooltipState.y,
                    }}
                >
                    {tooltipState.text}
                </div>,
                document.fullscreenElement || document.body
            )}

            <VideoPlayerModals
                showSubtitleSearchModal={showSubtitleSearchModal}
                availableSubtitles={availableSubtitles}
                isSearchingSubtitles={isSearchingSubtitles}
                onCloseSubtitleSearch={() => setShowSubtitleSearchModal(false)}
                onSelectSubtitleFromSearch={handleSelectSubtitleFromSearch}
                onQuickTest={handleQuickTest}
                onSearchDifferentTitle={() => {
                    setShowSubtitleSearchModal(false);
                    setShowFilmSelection(true);
                }}
                showFilmSelection={showFilmSelection}
                availableFilms={availableFilms}
                searchQueryForFilms={searchQueryForFilms}
                onCloseFilmSelection={() => setShowFilmSelection(false)}
                onSelectFilm={handleSelectFilmForSubtitles}
                onSearchAgain={searchSubtitlesForVideo}
                isReelModalOpen={isReelModalOpen}
                reelModalData={reelModalData}
                videoSource={videoId ? null : (videoRef.current?.src || (videoUrl && !videoUrl.includes('youtube') && !videoUrl.includes('youtu.be') ? videoUrl : null))}
                youtubeVideoId={videoId || (videoUrl?.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null)}
                movieTitle={getResourceName().replace(/^yt:/, '')}
                onCloseReelModal={() => setIsReelModalOpen(false)}
                isGrammarModalOpen={isGrammarModalOpen}
                selectedGrammarPoint={selectedGrammarPoint}
                selectedGrammarSentence={selectedGrammarSentence || currentSubtitle || ''}
                learningLanguage={learningLanguage}
                fluentLanguage={fluentLanguage || undefined}
                onCloseGrammarModal={() => {
                    setIsGrammarModalOpen(false);
                    setSelectedGrammarSentence('');
                }}
                isGrammarIndexOpen={isGrammarIndexOpen}
                videoGrammarMatches={videoGrammarMatches}
                onCloseGrammarIndex={() => setIsGrammarIndexOpen(false)}
                onSelectGrammarCue={(match) => {
                    if (videoRef.current) {
                        videoRef.current.currentTime = Math.max(0, match.timestampSeconds);
                    }
                    if (youtubePlayerRef.current) {
                        youtubePlayerRef.current.seekTo(Math.max(0, match.timestampSeconds), true);
                    }
                    setSelectedGrammarPoint(match.grammar);
                    setSelectedGrammarSentence(match.text);
                    setIsGrammarModalOpen(true);
                }}
                isLessonStudioOpen={isLessonStudioOpen}
                isMobile={isMobile}
                videoTitle={selectedSubtitle || videoId || 'English Video Lesson'}
                mediaSource={videoId ? 'youtube' : 'upload'}
                youtubeId={videoId || ''}
                lessonSubtitles={Array.isArray(subtitlesForVideo) ? subtitlesForVideo.map(s => ({
                    start: s.startTimeMs / 1000,
                    end: s.endTimeMs / 1000,
                    text: s.text,
                })) : []}
                onCloseLessonStudio={() => setIsLessonStudioOpen(false)}
                onSeekToTime={(timeSec) => {
                    if (videoRef.current) {
                        videoRef.current.currentTime = Math.max(0, timeSec);
                    }
                    if (youtubePlayerRef.current) {
                        youtubePlayerRef.current.seekTo(Math.max(0, timeSec), true);
                    }
                }}
            />
        </div>
    );
};

export default VideoPlayer;