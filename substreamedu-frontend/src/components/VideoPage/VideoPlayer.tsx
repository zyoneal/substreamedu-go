import React, { useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { SubtitleService, SubDLSubtitle } from '../../services/SubtitleService';
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
import {
    formatSubtitleForDisplay,
    renderHighlightedSubtitle,
} from './utils/subtitleHighlightUtils';
import { extractVideoNameFromUrl, formatSrtTimestamp } from './utils/subtitleSearchUtils';
import {
    detectGrammarInText,
    scanSubtitlesForGrammar,
    DetectedGrammarPoint
} from '../../utils/grammarDetector';
import { parseSRT } from '../../utils/srtParser';
import { cleanSubtitleText } from '../../utils/subtitleCleaner';
import { stitchSubtitleSentences } from '../../utils/subtitleSentenceStitcher';
import styles from "../../components/VideoPage/css/VideoPlayerPopover.module.css";
import { LanguageContext } from "../LanguageContext";
import { AuthContext } from "../../store/AuthContext";
import { useIntl, FormattedMessage } from "react-intl";

import Zap from 'lucide-react/dist/esm/icons/zap';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';

import { isMobile } from 'react-device-detect';
import { createPortal } from 'react-dom';
import MobileHint from '../shared/MobileHint';
import { MOBILE_HINT_STEPS } from '../shared/MobileHint.types';
import { useUserDictionaryItemsLight } from '../../hooks/useDictionary';
import { OnboardingGuideBar, OnboardingStep } from './components/OnboardingGuideBar';

import { debugLog, debugError } from '../../utils/debug';

import { useVideoPlayer } from './hooks/useVideoPlayer';

import {
    Subtitle as SubtitleType,
    DictionaryItem as DictionaryItemType,
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
}


type Subtitle = SubtitleType;
type DictionaryItem = DictionaryItemType;

declare global {
    interface Window {
        [key: string]: any;
    }
}


const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, subtitles, onSubtitleSelect, onSubtitleUpload, isExtractingSubtitles = false, onSelectAnotherVideo }) => {
    const { learningLanguage: contextLearningLanguage } = useContext(LanguageContext);
    const learningLanguage = contextLearningLanguage || 'en';
    const { fluentLanguage } = useContext(LanguageContext);
    const { authorities } = useContext(AuthContext);
    const isAdmin = authorities.includes('SYSTEM_ADMIN') || authorities.includes('ADMIN');

    const { data: userDictionaryItems } = useUserDictionaryItemsLight();

    const sanitizeSubtitles = useCallback((subs: Subtitle[] | any[] | null): Subtitle[] | null => {
        if (!subs || !Array.isArray(subs)) return null;
        const cleaned = subs.map(sub => ({
            ...sub,
            text: cleanSubtitleText(sub.text || '')
        }));
        return stitchSubtitleSentences(cleaned);
    }, []);

    const [subtitlesForVideo, setSubtitlesForVideo] = useState<Subtitle[] | null>(
        sessionStorage.getItem('subtitles') ? sanitizeSubtitles(JSON.parse(sessionStorage.getItem('subtitles')!)) : null
    );

    const isMountedRef = useRef(true);
    const [fileName, setFileName] = useState<string>('');
    const [videoFileName, setVideoFileName] = useState<string>('');
    const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
    const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);
    const [dictionaryItems, setDictionaryItems] = useState<DictionaryItem[]>([]);
    const [highlightedWords, setHighlightedWords] = useState<DictionaryItem[]>([]);
    const [notification, setNotification] = useState<string | null>(null);
    const intl = useIntl();
    const [delay, setDelay] = useState<number>(0);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const [showSubtitles, setShowSubtitles] = useState(true);
    const [blurSubtitles, setBlurSubtitles] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('substreamedu_subtitle_blur');
            return saved !== null ? saved === 'true' : true;
        } catch {
            return true;
        }
    });
    // isFullscreen now comes from useVideoPlayer hook
    const [showMobileHint, setShowMobileHint] = useState(true);

    const cardContainerRef = useRef<HTMLDivElement>(null);

    const [tooltipState, setTooltipState] = useState<{
        text: string;
        x: number;
        y: number;
    } | null>(null);

    // isPlaying, volume, isMuted, progress, duration, currentTime, showControls now come from useVideoPlayer hook
    const [showSubscribeButton] = useState(false);
    const [showLanguageOverlay, setShowLanguageOverlay] = useState(false);

    const [isReelModalOpen, setIsReelModalOpen] = useState(false);
    const [reelModalData, setReelModalData] = useState<{
        word: string;
        translation: string;
        transcription?: string;
        sentence: string;
        startSec: number;
        endSec: number;
    } | null>(null);
    const [isYoutubeSubsLoading, setIsYoutubeSubsLoading] = useState(false);

    const [selectedGrammarPoint, setSelectedGrammarPoint] = useState<DetectedGrammarPoint | null>(null);
    const [selectedGrammarSentence, setSelectedGrammarSentence] = useState<string>('');
    const [isGrammarModalOpen, setIsGrammarModalOpen] = useState(false);
    const [isGrammarIndexOpen, setIsGrammarIndexOpen] = useState(false);
    const [isLessonStudioOpen, setIsLessonStudioOpen] = useState(false);

    const activeGrammarPoint = useMemo(() => {
        return detectGrammarInText(currentSubtitle);
    }, [currentSubtitle]);

    const videoGrammarMatches = useMemo(() => {
        return scanSubtitlesForGrammar(subtitlesForVideo);
    }, [subtitlesForVideo]);



    // Interactive Onboarding State (Step 1 -> Step 2 -> Completed)
    const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
        try {
            return localStorage.getItem('substreamedu_onboarding_completed') === 'true';
        } catch {
            return false;
        }
    });
    const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(1);

    const handleDismissOnboarding = useCallback(() => {
        setOnboardingDismissed(true);
        try {
            localStorage.setItem('substreamedu_onboarding_completed', 'true');
        } catch {}
    }, []);

    useEffect(() => {
        if (isPopoverOpen && onboardingStep === 1) {
            setOnboardingStep(2);
        }
    }, [isPopoverOpen, onboardingStep]);

    useEffect(() => {
        const handleGuestSave = () => {
            setOnboardingStep('completed');
            try {
                localStorage.setItem('substreamedu_onboarding_completed', 'true');
            } catch {}
        };
        window.addEventListener('substreamedu:guest_save_reached', handleGuestSave);
        return () => window.removeEventListener('substreamedu:guest_save_reached', handleGuestSave);
    }, []);

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

    // Auto-hide controls after 3.5 seconds of inactivity when video is playing
    useEffect(() => {
        if (!showControls || !isPlaying) return;
        const timer = setTimeout(() => {
            setShowControls(false);
        }, 3500);
        return () => clearTimeout(timer);
    }, [showControls, isPlaying, setShowControls]);

    const handleTouchSeek = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
        const touch = (e.touches && e.touches.length > 0) ? e.touches[0] : (e.changedTouches && e.changedTouches.length > 0) ? e.changedTouches[0] : null;
        if (!touch || !duration) return;
        if (e.cancelable) {
            e.preventDefault();
        }
        const seekBar = e.currentTarget;
        const rect = seekBar.getBoundingClientRect();
        const pos = Math.max(0, Math.min(1, (touch.clientX - rect.left) / rect.width));
        seekTo(pos * duration);
    }, [seekTo, duration]);

    
    const handleYoutubePlay = useCallback(() => {
        setIsPlaying(true);
        if (youtubePlayerRef.current) {
            try {
                if (typeof youtubePlayerRef.current.unloadModule === 'function') {
                    youtubePlayerRef.current.unloadModule("captions");
                }
            } catch {
                
            }
        }
    }, [setIsPlaying, youtubePlayerRef]);

    const handleYoutubePause = useCallback(() => setIsPlaying(false), [setIsPlaying]);
    const handleYoutubeEnd = useCallback(() => setIsPlaying(false), [setIsPlaying]);

    const handleYoutubeStateChange = useCallback((event: { target: YouTubePlayer }) => {
        if (event.target) {
            try {
                if (typeof event.target.unloadModule === 'function') {
                    event.target.unloadModule("captions");
                }
            } catch {
                
            }
        }
    }, []);

    const youtubeOpts = useMemo(() => ({
        width: '100%', height: '100%',
        playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            iv_load_policy: 3,
            quality: 'hd1080',
            cc_load_policy: 3,
            cc_lang_pref: 'invalid'
        }
    }), []);

    
    // === DYNAMIC ZERO-SCROLL MAX FIT & THEATER MODE ===
    const DEFAULT_COMPACT_WIDTH = 1050;
    const [mediaAspectRatio, setMediaAspectRatio] = useState<number>(16 / 9);
    const [isMaxFit, setIsMaxFit] = useState<boolean>(true); // Default to max fit no scroll!

    const calculateMaxFitWidth = useCallback((ratio?: number): number => {
        const validRatio = (ratio && ratio > 0) ? ratio : (mediaAspectRatio > 0 ? mediaAspectRatio : 16 / 9);
        // Overhead: top header/padding (76px) + replace button (~52px) + bottom padding (24px) = 152px
        const verticalOverhead = 152;
        const availableHeight = Math.max(240, window.innerHeight - verticalOverhead);
        const maxWidthFromHeight = Math.floor(availableHeight * validRatio);
        const maxWidthFromWidth = Math.max(320, Math.floor(window.innerWidth - 48));
        const maxAllowed = Math.min(maxWidthFromHeight, maxWidthFromWidth);
        return Math.max(320, maxAllowed);
    }, [mediaAspectRatio]);

    const [playerWidth, setPlayerWidth] = useState<number>(() => calculateMaxFitWidth(16 / 9));

    // Recalculate max fit width whenever videoUrl or videoId changes (per video dynamic recalculation)
    useEffect(() => {
        setIsMaxFit(true);
        if (videoId) {
            setMediaAspectRatio(16 / 9);
            setPlayerWidth(calculateMaxFitWidth(16 / 9));
        } else if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
            const ratio = videoRef.current.videoWidth / videoRef.current.videoHeight;
            setMediaAspectRatio(ratio);
            setPlayerWidth(calculateMaxFitWidth(ratio));
        } else {
            setPlayerWidth(calculateMaxFitWidth(16 / 9));
        }
    }, [videoUrl, videoId, calculateMaxFitWidth, videoRef]);

    // Recalculate whenever HTML5 video metadata loads
    const handleVideoMetadataWithAspect = useCallback(() => {
        handleVideoMetadata();
        if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
            const ratio = videoRef.current.videoWidth / videoRef.current.videoHeight;
            setMediaAspectRatio(ratio);
            setIsMaxFit(true);
            setPlayerWidth(calculateMaxFitWidth(ratio));
        }
    }, [handleVideoMetadata, videoRef, calculateMaxFitWidth]);

    // Update on window resize
    useEffect(() => {
        const handleWindowResize = () => {
            const maxW = calculateMaxFitWidth(mediaAspectRatio);
            if (isMaxFit) {
                setPlayerWidth(maxW);
            } else {
                setPlayerWidth((prev) => Math.min(prev, maxW));
            }
        };
        window.addEventListener('resize', handleWindowResize);
        return () => window.removeEventListener('resize', handleWindowResize);
    }, [isMaxFit, mediaAspectRatio, calculateMaxFitWidth]);

    const toggleMaxFit = useCallback(() => {
        const maxW = calculateMaxFitWidth(mediaAspectRatio);
        if (isMaxFit) {
            setIsMaxFit(false);
            setPlayerWidth(Math.min(DEFAULT_COMPACT_WIDTH, maxW));
        } else {
            setIsMaxFit(true);
            setPlayerWidth(maxW);
        }
    }, [isMaxFit, mediaAspectRatio, calculateMaxFitWidth]);

    useEffect(() => {
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        if (Array.isArray(subtitles) && subtitles.length > 0) {
            sessionStorage.setItem('videoUrl', videoUrl);
        }

        if (videoId) {
            return;
        }
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            if (videoUrl && videoRef.current.src !== videoUrl) {
                videoRef.current.load();
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoUrl, videoId]);

    useEffect(() => {
        if (!videoId) {
            const storedTime = sessionStorage.getItem('videoCurrentTime');
            const storedVideoUrl = sessionStorage.getItem('videoUrl');

            if (storedTime && storedVideoUrl === videoUrl && videoRef.current) {
                const time = parseFloat(storedTime);
                videoRef.current.currentTime = time;
                setCurrentTime(time);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoUrl, videoId]);

    useEffect(() => {
        const videoElement = videoRef.current;

        const handleTimeUpdate = () => {
            if (videoElement) {
                const { currentTime, duration } = videoElement;
                setCurrentTime(currentTime);
                setProgress((currentTime / duration) * 100);
                sessionStorage.setItem('videoCurrentTime', currentTime.toString());
            }
        };

        if (videoElement) {
            videoElement.addEventListener('timeupdate', handleTimeUpdate);
            return () => {
                videoElement.removeEventListener('timeupdate', handleTimeUpdate);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoRef.current]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (videoId && youtubePlayerRef.current) {
            interval = setInterval(() => {
                
                try {
                    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.unloadModule === 'function') {
                        youtubePlayerRef.current.unloadModule("captions");
                    }
                } catch {
                    
                }

                const currentTime = youtubePlayerRef.current.getCurrentTime();
                const duration = youtubePlayerRef.current.getDuration();
                if (duration) {
                    setCurrentTime(currentTime);
                    setProgress((currentTime / duration) * 100);
                    sessionStorage.setItem('videoCurrentTime', currentTime.toString());
                }
            }, 100);
        }
        return () => {
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId, youtubePlayerRef.current]);

    
    useEffect(() => {
        if (videoId) {
            
            return;
        }

        
        let vName = sessionStorage.getItem('videoFileName');

        
        if (!vName && videoUrl) {
            vName = extractVideoNameFromUrl(videoUrl);
        }

        if (vName) {
            setVideoFileName(vName);
        }
    }, [videoUrl, videoId]);

    
    const showNotification = useCallback((message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    }, []);

    
    const getResourceName = (): string => {
        if (videoId) {
            
            return `yt:${videoId}`;
        }

        if (videoFileName) {
            
            const cleaned = videoFileName.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '.srt');
            return cleaned;
        }

        
        return fileName || '';
    };

    const handleSubtitleClick = async (subtitleName: string) => {
        try {
            sessionStorage.setItem('subtitleName', subtitleName);

            const data = await SubtitleService.fetchSubtitlesForVideo(subtitleName);
            const sanitized = sanitizeSubtitles(data);
            setSubtitlesForVideo(sanitized);

            sessionStorage.setItem('videoSubtitles', JSON.stringify(sanitized || data));

            if (Array.isArray(data) && data.length > 0) {
                setFileName(data[0].name);
            }

            setSelectedSubtitle(URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'text/vtt' })));

            await fetchDictionaryItemsForCards();

            if (onSubtitleSelect) {
                onSubtitleSelect();
            }

        } catch (error) {
            debugError('Error loading subtitles:', error);
        }
    };

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

    useEffect(() => {
        const fetchYoutubeSubtitles = async (id: string) => {
            try {
                setIsYoutubeSubsLoading(true);
                const data = await SubtitleService.fetchSubtitlesForYoutube(id);
                const sanitized = sanitizeSubtitles(data);
                setSubtitlesForVideo(sanitized);
                sessionStorage.setItem('videoSubtitles', JSON.stringify(sanitized || data));
                if (Array.isArray(data) && data.length > 0) {
                    setFileName(data[0].name || id);
                    sessionStorage.setItem('subtitleName', data[0].name || id);
                }
                await fetchDictionaryItemsForCards(id);
                if (onSubtitleSelect) {
                    onSubtitleSelect();
                }
            } catch (error) {
                debugError('Error loading YouTube subtitles:', error);
                showNotification('Failed to load YouTube subtitles.');
            } finally {
                setIsYoutubeSubsLoading(false);
            }
        };

        if (videoId) {
            const storedSubs = sessionStorage.getItem('videoSubtitles');
            const storedDictionaryItems = sessionStorage.getItem('dictionaryItems');
            const storedSubtitleName = sessionStorage.getItem('subtitleName');
            const storedVideoUrl = sessionStorage.getItem('videoUrl');

            const isSameVideo = storedVideoUrl === videoUrl;

            if (storedSubs && storedSubtitleName && isSameVideo) {
                const data = JSON.parse(storedSubs);
                setSubtitlesForVideo(sanitizeSubtitles(data));

                if (storedDictionaryItems) {
                    const parsedItems = JSON.parse(storedDictionaryItems) as DictionaryItem[];
                    setDictionaryItems(parsedItems);
                    setHighlightedWords(parsedItems);
                }

                if (Array.isArray(data) && data.length > 0) {
                    setFileName(data[0].name || videoId);
                    setSelectedSubtitle(URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'text/vtt' })));
                }

                if (onSubtitleSelect) {
                    onSubtitleSelect();
                }
            } else {
                fetchYoutubeSubtitles(videoId);
            }
        } else {
            const storedSubtitleName = sessionStorage.getItem('subtitleName');
            if (storedSubtitleName) {
                handleSubtitleClick(storedSubtitleName);
            }
            // No auto-search - user will click "Search Subtitles" button manually
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId]);

    // No auto-search on video load - user will manually click "Search Subtitles" button if needed
    // This prevents the modal from appearing when user already has subtitles or doesn't want to search

    useEffect(() => {
        const handleLocalSubtitlesLoaded = async (event: Event) => {
            const customEvent = event as CustomEvent<SubDLSubtitle[]>;
            const subtitles = customEvent.detail;
            if (subtitles && subtitles.length > 0) {
                // Auto-load the first track
                const firstSub = subtitles[0];
                try {
                    debugLog('Auto-loading embedded subtitle:', firstSub.name);
                    const text = await SubtitleService.fetchSubtitleFileContent(firstSub.url);
                    const parsed = parseSRT(text, firstSub.name);

                    setSubtitlesForVideo(sanitizeSubtitles(parsed));
                    setFileName(firstSub.name);
                    sessionStorage.setItem('subtitleName', firstSub.name);
                    // Store the parsed content for persistence
                    sessionStorage.setItem('videoSubtitles', JSON.stringify(parsed));

                    // Let's create a VTT blob from the parsed subtitles for compatibility
                    // Ensure formatSrtTimestamp is available in scope (it should be)
                    const vttContent = 'WEBVTT\n\n' + parsed.map((s, i) => {
                        return `${i + 1}\n${formatSrtTimestamp(s.startTimeMs)} --> ${formatSrtTimestamp(s.endTimeMs)}\n${s.text}\n`;
                    }).join('\n');

                    const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
                    setSelectedSubtitle(URL.createObjectURL(vttBlob));

                    debugLog(`Loaded embedded subtitles: ${firstSub.name}`);
                } catch (err) {
                    debugError('Failed to load embedded subtitle:', err);
                }
            }
        };

        window.addEventListener('localSubtitlesLoaded', handleLocalSubtitlesLoaded as EventListener);
        return () => window.removeEventListener('localSubtitlesLoaded', handleLocalSubtitlesLoaded as EventListener);
    }, []);

    const updateSubtitles = useCallback(async () => {
        let currentTime = 0;
        if (videoId && youtubePlayerRef.current) {
            currentTime = await youtubePlayerRef.current.getCurrentTime();
        } else if (videoRef.current) {
            currentTime = videoRef.current.currentTime;
        }

        if (Array.isArray(subtitlesForVideo) && subtitlesForVideo.length > 0) {
            const delayedTime = (currentTime + delay) * 1000;
            const subtitle = subtitlesForVideo.find(
                (sub) => delayedTime >= sub.startTimeMs && delayedTime <= sub.endTimeMs
            );
            setCurrentSubtitle(subtitle ? subtitle.text : null);
        }
    }, [videoId, youtubePlayerRef, videoRef, subtitlesForVideo, delay]);

    const handleDelayChange = (newDelay: number) => {
        setDelay(newDelay);
    };

    // Subtitle selection, sentence matching, and popover positioning are now handled by useSubtitleTranslation hook and subtitleTranslationUtils

    useEffect(() => {
        const decodeHtmlEntities = (str: string): string => {
            if (!str) return '';
            const textarea = document.createElement('textarea');
            textarea.innerHTML = str;
            return textarea.value;
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains(styles.dictionaryWord)) {
                const translationRaw = target.getAttribute('data-translation');

                const translation = translationRaw ? decodeHtmlEntities(translationRaw).trim() : '';

                const word = target.textContent;

                if (word && translation) {
                    const rect = target.getBoundingClientRect();
                    setTooltipState({
                        text: translation,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 30
                    });
                }
            }
        };

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains(styles.dictionaryWord)) {
                setTooltipState(null);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains(styles.dictionaryWord) && tooltipState) {
                const translationRaw = target.getAttribute('data-translation');

                const translation = translationRaw ? decodeHtmlEntities(translationRaw).trim() : '';
                const word = target.textContent;

                if (word && translation) {
                    const rect = target.getBoundingClientRect();
                    setTooltipState({
                        text: translation,
                        x: rect.left + rect.width / 2,
                        y: rect.top - 30
                    });
                }
            }
        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [dictionaryItems, highlightedWords, tooltipState]);

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const intervalId = setInterval(updateSubtitles, 100);
        return () => clearInterval(intervalId);
    }, [updateSubtitles]);


    useEffect(() => {
        if (userDictionaryItems) {
            const items = userDictionaryItems;
            const actualItems = Array.isArray(items) ? items : (items && (items as any).items ? (items as any).items : []);
            const normalizedItems = actualItems.map((item: any) => ({
                id: item.id,
                resourceName: item.resourceName || '',
                highlightedText: item.highlightedText || '',
                translatedText: item.translatedText,
                context: item.context || '',
                definition: item.definition,
            }));
            setHighlightedWords(normalizedItems);
            debugLog('Highlighting dictionary items loaded from cache:', normalizedItems.length);
        }
    }, [userDictionaryItems]);

    const lastFetchedResourceRef = useRef<string | null>(null);

    const fetchDictionaryItemsForCards = useCallback(async (resourceId?: string, force: boolean = false) => {
        if (!AuthService.getUserEmail()) {
            setDictionaryItems([]);
            return;
        }
        const name = resourceId || fileName;
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
    }, [fileName]);

    useEffect(() => {
        if (fileName || videoId) {
            fetchDictionaryItemsForCards(videoId || fileName);
        }
    }, [fileName, videoId, fetchDictionaryItemsForCards]);

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

    const handleFullscreenChange = useCallback(() => {
        
        const isCurrentlyFullscreen = !!(document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).webkitCurrentFullScreenElement);

        setIsFullscreen(isCurrentlyFullscreen);
    }, [setIsFullscreen]);

    useEffect(() => {
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
    }, [handleFullscreenChange]);

    useEffect(() => {
        if (cardContainerRef.current && dictionaryItems.length > 0) {
            const lastCard = cardContainerRef.current.lastElementChild as HTMLElement;
            if (lastCard) {
                cardContainerRef.current.scrollTo({
                    left: cardContainerRef.current.scrollWidth,
                    behavior: 'smooth'
                });
            }
        }
    }, [dictionaryItems]);

    // Subtitle translation, selection, popover state and dictionary save are now handled by useSubtitleTranslation hook

    // NOTE: The following functions are now provided by useVideoPlayer hook:
    // pauseVideo, playVideo, pauseVideoFromClick, playVideoFromClick, togglePlayPause,
    // seek, seekTo, handleVolumeChange, toggleMute, handleSeek, handleSeekRelative,
    // formatTime, handlePlayerReady, handleVideoMetadata, handleVideoClick


    const subtitleInputRef = useRef<HTMLInputElement>(null);

    const handleSubtitleUploadEvent = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onSubtitleUpload(file);
            if (subtitleInputRef.current) {
                subtitleInputRef.current.value = '';
            }
        }
    };

    return (
        <>
            <div className={styles.container} style={{ position: 'relative' }}>
                {}
                {isTemporarySubtitles && temporarySubtitleInfo && (
                    <div
                        className={styles.syncCheckBanner}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '1', minWidth: '300px' }}>
                            <Zap className="w-5 h-5" style={{ color: '#EAB308', flexShrink: 0 }} />
                            <div>
                                <p style={{ color: 'white', fontWeight: '600', margin: 0, fontSize: '14px' }}>
                                    Testing: {temporarySubtitleInfo.releaseName || temporarySubtitleInfo.name}
                                </p>
                                <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0, fontSize: '12px' }}>
                                    Watch video to check sync. Keep if good or discard to try another.
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                            <button
                                onClick={handleKeepTemporarySubtitles}
                                aria-label="Keep temporary subtitles"
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#22C55E',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#16A34A'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#22C55E'}
                            >
                                Keep
                            </button>
                            <button
                                onClick={handleDiscardTemporarySubtitles}
                                aria-label="Discard and try another subtitle"
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#EF4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    transition: 'background-color 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#DC2626'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#EF4444'}
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
                            backgroundColor: 'black'
                        } : {
                            marginTop: '0',
                            maxWidth: `${playerWidth}px`,
                            width: '100%',
                            transition: 'max-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                            ['--player-custom-width' as any]: `${playerWidth}px`
                        }}
                    >
                        {!isFullscreen && onSelectAnotherVideo && (
                            <button
                                onClick={onSelectAnotherVideo}
                                className={styles.backButton}
                                aria-label={intl.formatMessage({ id: 'videoPage.selectAnotherVideo', defaultMessage: 'Select another video' })}
                            >
                                <ArrowLeft size={18} strokeWidth={2.5} />
                                <span>
                                    <FormattedMessage id="videoPage.selectAnotherVideo" defaultMessage="Select another video" />
                                </span>
                            </button>
                        )}

                        <div
                            className={`${styles.videoWithSubtitles} ${isFullscreen ? styles.fullscreenContainer : ''} ${videoId ? styles.hasYoutube : ''}`}
                            style={isFullscreen ? {
                                position: 'relative',
                                width: '100%',
                                height: '100%',
                                display: 'block'
                            } : undefined}
                        >
                            <div
                                className={styles.videoPlayerContainer}
                                onClick={handleVideoClick}
                                onMouseMove={() => {
                                    if (!showControls) {
                                        setShowControls(true);
                                    }
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
                                    alignItems: 'center'
                                } : undefined}
                            >
                                {videoId ? (
                                    <div
                                        className={`${styles.youtubePlayerWrapper}`}
                                        onClick={handleVideoClick}
                                    >
                                        <YouTube
                                            videoId={videoId || ''}
                                            onReady={handlePlayerReady}
                                            onPlay={handleYoutubePlay}
                                            onPause={handleYoutubePause}
                                            onEnd={handleYoutubeEnd}
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
                                            objectFit: 'contain'
                                        } : undefined}
                                    >
                                        Your browser does not support the video tag.
                                    </video>
                                )}

                                {playbackError && (
                                    <div className={styles.playbackErrorOverlay}>
                                        <div className={styles.playbackErrorContent}>
                                            <div className={styles.playbackErrorIcon}><AlertTriangle size={36} className="text-red-400 mx-auto" /></div>
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
                                            <button
                                                className={styles.minimalistButton}
                                                onClick={() => window.location.reload()}
                                            >
                                                Reload Page
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <VideoControlsOverlay
                                    showControls={showControls}
                                    currentTime={currentTime}
                                    duration={duration}
                                    progress={progress}
                                    volume={volume}
                                    isMuted={isMuted}
                                    isFullscreen={isFullscreen}
                                    isMobile={isMobile}
                                    showSubtitles={showSubtitles}
                                    blurSubtitles={blurSubtitles}
                                    delay={delay}
                                    formatTime={formatTime}
                                    onVideoClick={handleVideoClick}
                                    onOpenGrammarIndex={() => {
                                        pauseVideo();
                                        setIsGrammarIndexOpen(true);
                                    }}
                                    onOpenLessonStudio={() => {
                                        pauseVideo();
                                        setIsLessonStudioOpen(true);
                                    }}
                                    onToggleSubtitles={() => setShowSubtitles(!showSubtitles)}
                                    onToggleBlur={() => {
                                        const next = !blurSubtitles;
                                        setBlurSubtitles(next);
                                        try {
                                            localStorage.setItem('substreamedu_subtitle_blur', String(next));
                                        } catch {}
                                    }}
                                    onDelayChange={handleDelayChange}
                                    onRepeatCurrentSubtitle={handleRepeatCurrentSubtitle}
                                    onToggleMute={toggleMute}
                                    onVolumeChange={handleVolumeChange}
                                    onSeek={handleSeek}
                                    onTouchSeek={handleTouchSeek}
                                    onToggleFullscreen={toggleFullscreen}
                                />
                            </div>
                            {
                                (selectedSubtitle || videoId) && (
                                    <SubtitleOverlay
                                        isFullscreen={isFullscreen}
                                        showSubtitles={showSubtitles}
                                        currentSubtitle={currentSubtitle}
                                        isLoadingSubtitles={isYoutubeSubsLoading || isSearchingSubtitles}
                                        hasNoSubtitlesForVideo={Boolean(videoId && (!subtitlesForVideo || subtitlesForVideo.length === 0))}
                                        activeGrammarPoint={activeGrammarPoint}
                                        blurSubtitles={blurSubtitles}
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
                                        renderedSubtitle={renderHighlightedSubtitle(formatSubtitleForDisplay(currentSubtitle || ''), highlightedWords)}
                                    />
                                )
                            }
                            {
                                isExtractingSubtitles && (
                                    <div className={styles.subtitleContainer}>
                                        <div className={styles.innerSubtitlesContainer}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
                                                <div className={styles.loadingPulse}></div>
                                                <span style={{ color: '#ffffff', fontSize: '16px' }}>Extracting internal subtitles...</span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }
                            {
                                !selectedSubtitle && !videoId && !isExtractingSubtitles && (
                                    <SubtitleSelectionBar
                                        subtitles={subtitles}
                                        fileName={fileName || ''}
                                        isSearchingSubtitles={isSearchingSubtitles}
                                        subtitleInputRef={subtitleInputRef}
                                        onSelectSubtitle={handleSubtitleClick}
                                        onSearchSubtitles={() => searchSubtitlesForVideo()}
                                        onUploadSubtitles={handleSubtitleUploadEvent}
                                    />
                                )
                            }
                        </div>
                        {/* Onboarding Guide Bar - sits cleanly below the video player */}
                        {!onboardingDismissed && !isFullscreen && (selectedSubtitle || videoId) && (
                            <div className={styles.onboardingGuideWrapper}>
                                <OnboardingGuideBar
                                    step={onboardingStep}
                                    onDismiss={handleDismissOnboarding}
                                />
                            </div>
                        )}
                    </div>
                    {notification && <div className={styles.notification}>{notification}</div>}
                </div>

                <VideoTranslationPopover
                    selectionPosition={selectionPosition}
                    isPopoverOpen={isPopoverOpen}
                    isLoading={isLoading}
                    isMobile={isMobile}
                    selectedText={selectedText}
                    selectedSentence={selectedSentence}
                    translationData={translationData}
                    translationOptions={translationOptions}
                    isSaving={isSaving}
                    isAdmin={isAdmin}
                    showSubmitButton={showSubmitButton}
                    showSubscribeButton={showSubscribeButton}
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
                        const curSub = subtitlesForVideo?.find(s => currentTime >= s.startTimeMs / 1000 - 0.5 && currentTime <= s.endTimeMs / 1000 + 0.5);
                        const startSec = curSub ? curSub.startTimeMs / 1000 : Math.max(0, currentTime - 2);
                        const endSec = curSub ? curSub.endTimeMs / 1000 : currentTime + 3;
                        const sentence = curSub ? curSub.text : selectedSentence || selectedText;

                        setReelModalData({
                            word: selectedText,
                            translation: translationData.translation || '',
                            transcription: translationData.transcription || undefined,
                            sentence: sentence,
                            startSec,
                            endSec,
                        });
                        setIsReelModalOpen(true);
                    }}
                    onClose={() => {
                        setIsPopoverOpen(false);
                        resetPopoverState();
                    }}
                    onMouseEnter={() => {
                        pauseVideo();
                    }}
                    onRemoveImage={() => {
                        setTranslationData(prev => ({ ...prev, showImage: false }));
                    }}
                />

                {
                    showLanguageOverlay && createPortal(
                        <div
                            onClick={() => setShowLanguageOverlay(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0,0,0,0.35)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 3000,
                                padding: '16px'
                            }}
                        >
                            <div
                                style={{
                                    background: 'rgba(20,20,20,0.85)',
                                    border: '1px solid rgba(0, 69, 230, 0.4)',
                                    color: '#EAEAEA',
                                    borderRadius: '12px',
                                    padding: '18px 20px',
                                    maxWidth: '520px',
                                    width: '100%',
                                    textAlign: 'center',
                                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                                }}
                                onClick={(e) => e.stopPropagation()}
                                role="dialog"
                                aria-live="assertive"
                            >
                                <div style={{ margin: '6px 0 14px' }}>
                                    {intl.formatMessage({ id: 'selectLanguageToTranslate', defaultMessage: 'Select a language in the header to translate' })}
                                </div>
                                <button
                                    onClick={() => setShowLanguageOverlay(false)}
                                    style={{
                                        marginTop: '4px',
                                        background: '#000000',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '8px 14px',
                                        fontWeight: 700,
                                        cursor: 'pointer'
                                    }}
                                >
                                    OK
                                </button>
                            </div>
                        </div>,
                        document.fullscreenElement || document.body
                    )
                }

                <MobileHint
                    isVisible={isMobile && showMobileHint}
                    onClose={() => setShowMobileHint(false)}
                    steps={MOBILE_HINT_STEPS.VIDEO_PLAYER}
                />
                {
                    tooltipState && createPortal(
                        <div
                            className={styles.wordTooltip}
                            style={{
                                left: tooltipState.x,
                                top: tooltipState.y
                            }}
                        >
                            {tooltipState.text}
                        </div>,
                        document.fullscreenElement || document.body
                    )
                }

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
                    videoTitle={selectedSubtitle || videoId || "English Video Lesson"}
                    mediaSource={videoId ? "youtube" : "upload"}
                    youtubeId={videoId || ""}
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
        </>
    );
};

export default VideoPlayer;