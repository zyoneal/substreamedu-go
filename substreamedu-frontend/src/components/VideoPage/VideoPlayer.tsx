import React, { useContext, useEffect, useRef, useState, useMemo, useCallback } from 'react';
import YouTube, { YouTubePlayer } from 'react-youtube';
import { SubtitleService, SubDLSubtitle, SubDLSearchResult, SubtitleWithScore, calculateSyncScore } from '../../services/SubtitleService';
import { DictionaryService } from '../../services/DictionaryService';
import { AuthService } from '../../services/AuthService';
import { SubtitleSearchModal } from './components/SubtitleSearchModal';
import { FilmSelectionModal } from './components/FilmSelectionModal';
import { ReelGeneratorModal } from './components/ReelGeneratorModal';
import { GrammarSpotlightModal } from './components/GrammarSpotlightModal';
import { VideoGrammarIndexModal } from './components/VideoGrammarIndexModal';
import { LessonStudioModal } from './components/LessonStudioModal';
import {
    detectGrammarInText,
    scanSubtitlesForGrammar,
    DetectedGrammarPoint
} from '../../utils/grammarDetector';
import { parseSRT } from '../../utils/srtParser';
import { extractMovieYear } from '../../utils/videoNameUtils';
import { cleanSubtitleText, cleanSubtitleSelection } from '../../utils/subtitleCleaner';
import { stitchSubtitleSentences } from '../../utils/subtitleSentenceStitcher';
import styles from "../../components/VideoPage/css/VideoPlayerPopover.module.css";
import { LanguageContext } from "../LanguageContext";
import { AuthContext } from "../../store/AuthContext";
import { useIntl, FormattedMessage } from "react-intl";

import Zap from 'lucide-react/dist/esm/icons/zap';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Maximize from 'lucide-react/dist/esm/icons/maximize';
import Minimize from 'lucide-react/dist/esm/icons/minimize';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import Volume1 from 'lucide-react/dist/esm/icons/volume-1';
import Volume2 from 'lucide-react/dist/esm/icons/volume-2';
import VolumeX from 'lucide-react/dist/esm/icons/volume-x';
import X from 'lucide-react/dist/esm/icons/x';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import GraduationCap from 'lucide-react/dist/esm/icons/graduation-cap';

import { isMobile } from 'react-device-detect';
import { createPortal } from 'react-dom';
import MobileHint from '../shared/MobileHint';
import { MOBILE_HINT_STEPS } from '../shared/MobileHint.types';
import { useSaveWord, SaveWordData, SaveWordContext, useUserDictionaryItemsLight } from '../../hooks/useDictionary';
import { useQueryClient } from '@tanstack/react-query';
import { SearchableSelect } from '../shared/SearchableSelect';
import { OnboardingGuideBar, OnboardingStep } from './components/OnboardingGuideBar';

import { AxiosError } from 'axios';

import { debugLog, debugError } from '../../utils/debug';

import { useVideoPlayer } from './hooks/useVideoPlayer';

import {
    Subtitle as SubtitleType,
    DictionaryItem as DictionaryItemType,
    TranslationData as TranslationDataType,
    SelectionPosition as SelectionPositionType,
    ErrorResponse
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
type TranslationData = TranslationDataType;
type SelectionPosition = SelectionPositionType;

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
    const [selectedText, setSelectedText] = useState<string | null>(null);
    const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
    const [translationData, setTranslationData] = useState<TranslationData>({
        translation: null,
        definition: null,
        imageUrl: null,
        showImage: true,
        transcription: null,
        hint: null,
        examples: null,
        synonyms: null,
        style: null,
        partOfSpeech: null,
        otherMeanings: null,
        collocations: null,
        recommendedSelections: null,
        minimalUnit: null,
        register: null,
        usageNote: null,
        alternatives: null,
        chunks: null,
        typicalContexts: null,
    });

    const [dictionaryItems, setDictionaryItems] = useState<DictionaryItem[]>([]);

    const [notification, setNotification] = useState<string | null>(null);
    // videoRef, videoWrapperRef, videoContainerRef now come from useVideoPlayer hook
    const [isLoading, setIsLoading] = useState(false);
    const [note, setNote] = useState("");
    const intl = useIntl();
    const [delay, setDelay] = useState<number>(0);

    const [selectionPosition, setSelectionPosition] = useState<SelectionPosition | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [highlightedWords, setHighlightedWords] = useState<DictionaryItem[]>([]);
    const [activeSelection, setActiveSelection] = useState<{ text: string, range: Range } | null>(null);

    const [showSubtitles, setShowSubtitles] = useState(true);
    const [blurSubtitles, setBlurSubtitles] = useState<boolean>(() => {
        try {
            const saved = localStorage.getItem('substreamedu_subtitle_blur');
            return saved !== null ? saved === 'true' : true;
        } catch {
            return true;
        }
    });
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
    // isFullscreen now comes from useVideoPlayer hook
    const [showMobileHint, setShowMobileHint] = useState(true);

    const cardContainerRef = useRef<HTMLDivElement>(null);

    const [tooltipState, setTooltipState] = useState<{
        text: string;
        x: number;
        y: number;
    } | null>(null);

    // isPlaying, volume, isMuted, progress, duration, currentTime, showControls now come from useVideoPlayer hook
    const [showSubmitButton, setShowSubmitButton] = useState<boolean>(false);
    const [showSubscribeButton] = useState(false);
    const [showLanguageOverlay, setShowLanguageOverlay] = useState(false);

    const [showSubtitleSearchModal, setShowSubtitleSearchModal] = useState(false);
    const [isReelModalOpen, setIsReelModalOpen] = useState(false);
    const [reelModalData, setReelModalData] = useState<{
        word: string;
        translation: string;
        transcription?: string;
        sentence: string;
        startSec: number;
        endSec: number;
    } | null>(null);
    const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleWithScore[]>([]);
    const [isSearchingSubtitles, setIsSearchingSubtitles] = useState(false);
    const [isYoutubeSubsLoading, setIsYoutubeSubsLoading] = useState(false);
    const [isTemporarySubtitles, setIsTemporarySubtitles] = useState(false);
    const [temporarySubtitleInfo, setTemporarySubtitleInfo] = useState<SubtitleWithScore | null>(null);

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

    // Film selection state for 2-step subtitle search
    const [availableFilms, setAvailableFilms] = useState<SubDLSearchResult[]>([]);
    const [showFilmSelection, setShowFilmSelection] = useState(false);
    const [searchQueryForFilms, setSearchQueryForFilms] = useState('');
    const [currentSearchParams, setCurrentSearchParams] = useState<{
        languages: string;
        type: 'movie' | 'tv';
        seasonNumber?: number;
        episodeNumber?: number;
    } | null>(null);

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

    const extractVideoNameFromUrl = (url: string): string => {
        if (!url) return '';

        debugLog('Extracting name from URL:', url);

        // Handle blob URLs - try to get from sessionStorage first
        if (url.startsWith('blob:')) {
            const videoFileName = sessionStorage.getItem('videoFileName');
            if (videoFileName) {
                debugLog('Got filename from sessionStorage for blob URL:', videoFileName);
                return videoFileName;
            }
            debugLog('Blob URL detected - cannot extract name from blob');
            return '';
        }

        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        debugLog('Filename from URL:', filename);

        // Decode URI components
        const decodedFilename = decodeURIComponent(filename);
        debugLog('Decoded filename:', decodedFilename);

        const nameWithoutExtension = decodedFilename.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '');
        debugLog('Name without extension:', nameWithoutExtension);

        const cleanName = nameWithoutExtension
            .replace(/[._-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        debugLog('Clean name:', cleanName);
        return cleanName;
    };

    const searchSubtitlesForVideo = async (customQuery?: string | React.MouseEvent) => {
        if (videoId) {
            debugLog('Skipping search - YouTube video detected');
            return;
        }

        const queryStr = typeof customQuery === 'string' ? customQuery.trim() : undefined;
        let videoName = queryStr || sessionStorage.getItem('videoFileName');
        debugLog('Video file name for subtitle search:', videoName);

        if (!videoName) {
            videoName = extractVideoNameFromUrl(videoUrl);
            debugLog('Extracted video name from URL:', videoName);
        }

        debugLog('Original video URL:', videoUrl);

        // If videoName is unknown, empty, or generic "Google Drive Video" and user didn't supply a custom query
        if ((!videoName || videoName.toLowerCase() === 'google drive video') && !queryStr) {
            debugLog('Generic or missing video title, opening film search modal');
            setSearchQueryForFilms('');
            setAvailableFilms([]);
            setShowFilmSelection(true);
            showNotification('Please enter the movie or series title to find subtitles.');
            return;
        }

        if (!videoName) {
            debugLog('Could not extract video name');
            showNotification('Please click "Select another video" and upload the video again to enable automatic subtitle search.');
            return;
        }

        if (queryStr) {
            sessionStorage.setItem('videoFileName', queryStr);
        }

        videoName = videoName
            .replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '')
            .replace(/[._-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        // Remove quality/codec info after episode number for better search
        // Match pattern: "Show Name S01E02 720p" -> "Show Name S01E02"
        videoName = videoName.replace(/(\s+s\d{1,2}e\d{1,2})\s+.*$/i, '$1');

        debugLog('Cleaned video name for search:', videoName);

        setIsSearchingSubtitles(true);
        try {
            
            const languageSet = new Set<string>(['EN']);

            
            if (learningLanguage && learningLanguage.toUpperCase() !== 'EN') {
                languageSet.add(learningLanguage.toUpperCase());
            }

            

            const languages = Array.from(languageSet).join(',');

            // Extract 4-digit release year (e.g. 1900-2099)
            const movieYearInfo = extractMovieYear(videoName);
            const extractedYear = movieYearInfo.year;
            const cleanTitleWithoutYear = movieYearInfo.hasYear ? movieYearInfo.cleanTitle : videoName;

            let seasonNumber: number | undefined;
            let episodeNumber: number | undefined;
            let seriesName = cleanTitleWithoutYear;

            const episodeMatch = videoName.match(/\bs(\d{1,2})e(\d{1,2})\b/i);
            if (episodeMatch) {
                seasonNumber = parseInt(episodeMatch[1]);
                episodeNumber = parseInt(episodeMatch[2]);
                seriesName = videoName.replace(/\s+s\d{1,2}e\d{1,2}.*$/i, '').trim();
                debugLog('Detected TV series:', { seriesName, seasonNumber, episodeNumber });
            }

            const targetTitle = seriesName || cleanTitleWithoutYear || videoName;
            debugLog('Searching with:', { videoName, targetTitle, extractedYear, seasonNumber, episodeNumber, languages });

            setCurrentSearchParams({
                languages,
                type: episodeMatch ? 'tv' : 'movie',
                seasonNumber,
                episodeNumber
            });
            setSearchQueryForFilms(targetTitle);

            let response = await SubtitleService.searchSubtitlesSubDL(
                targetTitle,
                languages,
                episodeMatch ? 'tv' : 'movie',
                seasonNumber,
                episodeNumber,
                undefined,
                undefined,
                undefined,
                extractedYear
            );

            // If target year was provided, check if SubDL returned a matching year result
            if (response.results && response.results.length > 0 && extractedYear) {
                const yearMatchResult = response.results.find(r => r.year === extractedYear);
                if (yearMatchResult) {
                    debugLog(`Found exact year match (${extractedYear}) in SubDL:`, yearMatchResult);
                    if (response.results[0]?.sdId !== yearMatchResult.sdId) {
                        debugLog(`Re-fetching subtitles for matching year sdId=${yearMatchResult.sdId}`);
                        const yearResponse = await SubtitleService.searchSubtitlesSubDL(
                            yearMatchResult.name,
                            languages,
                            episodeMatch ? 'tv' : 'movie',
                            seasonNumber,
                            episodeNumber,
                            yearMatchResult.imdbId || undefined,
                            yearMatchResult.tmdbId ? String(yearMatchResult.tmdbId) : undefined,
                            yearMatchResult.sdId,
                            extractedYear
                        );
                        if (yearResponse.subtitles && yearResponse.subtitles.length > 0) {
                            response.subtitles = yearResponse.subtitles;
                        }
                    }
                    response.results = [
                        yearMatchResult,
                        ...response.results.filter(r => r.sdId !== yearMatchResult.sdId)
                    ];
                }
            }

            if (response.results && response.results.length > 1) {
                const firstResult = response.results[0];
                const searchLower = targetTitle.toLowerCase();
                const firstNameLower = firstResult.name.toLowerCase();

                // Exact match requires year to match if year was present in filename!
                const isYearMatch = !extractedYear || firstResult.year === extractedYear;
                const isNameMatch = firstNameLower === searchLower || firstNameLower === videoName.toLowerCase();
                const isExactMatch = isYearMatch && isNameMatch;

                if (!isExactMatch) {
                    debugLog('Multiple films found, showing selection modal:', response.results);
                    setAvailableFilms(response.results);
                    setShowSubtitleSearchModal(false);
                    setShowFilmSelection(true);
                    setIsSearchingSubtitles(false);
                    showNotification(`Found ${response.results.length} matching titles. Please select the correct one.`);
                    return;
                }
            }

            debugLog('SubDL API response:', response);
            debugLog('Found subtitles count:', response.subtitles?.length || 0);

            
            if ((!response.subtitles || response.subtitles.length === 0) && episodeMatch) {
                debugLog('No results found. Trying fallback search without episode filter');
                showNotification(`No exact match. Searching all "${seriesName}" subtitles...`);

                response = await SubtitleService.searchSubtitlesSubDL(seriesName, languages, 'tv');
                debugLog('Fallback search results:', response.subtitles?.length || 0);
            }

            
            if ((!response.subtitles || response.subtitles.length === 0) && !episodeMatch) {
                
                const nameWithoutYear = seriesName.replace(/\s+\d{4}\s*$/i, '').trim();
                if (nameWithoutYear !== seriesName && nameWithoutYear.length > 0) {
                    debugLog('No results found. Trying fallback search without year:', nameWithoutYear);
                    showNotification(`Searching for "${nameWithoutYear}" (without year)...`);

                    response = await SubtitleService.searchSubtitlesSubDL(nameWithoutYear, languages, 'movie');
                    debugLog('Fallback search (no year) results:', response.subtitles?.length || 0);
                }
            }

            if (Array.isArray(response.subtitles) && response.subtitles.length > 0) {
                
                let videoDuration = videoRef.current?.duration || duration || 0;
                const videoFileName = sessionStorage.getItem('videoFileName') || videoName;

                
                let videoFps: number | undefined;
                try {
                    const videoElement = videoRef.current;
                    if (videoElement && (videoElement as any).requestVideoFrameCallback) {
                        
                        videoFps = undefined; 
                    }
                } catch (e) {
                    debugLog('Could not extract FPS:', e);
                }

                debugLog('Video info for sync check:', { videoDuration, videoFileName, videoFps });

                
                if (videoDuration === 0 && videoRef.current) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    videoDuration = videoRef.current?.duration || 0;
                    debugLog('Video duration after wait:', videoDuration);
                }

                
                
                const allSubtitles = response.subtitles.map(sub => {
                    const { score, reason } = calculateSyncScore(sub, videoDuration, videoFps, videoFileName);
                    return {
                        ...sub,
                        syncScore: score,
                        syncReason: reason
                    } as SubtitleWithScore;
                });

                
                allSubtitles.sort((a, b) => b.syncScore - a.syncScore);

                const bestScore = allSubtitles[0]?.syncScore || 0;

                debugLog('Subtitles found (sorted by ratings/votes/trusted):', allSubtitles.map(s => ({
                    name: s.releaseName,
                    score: s.syncScore,
                    ratings: s.ratings,
                    votes: s.votes,
                    trusted: s.fromTrusted
                })));

                if (bestScore >= 40) {
                    showNotification(`Found ${allSubtitles.length} subtitles. Use Quick Test to check sync.`);
                } else {
                    showNotification(`Found ${allSubtitles.length} subtitles. Sorted by ratings. Test manually.`);
                }

                setShowFilmSelection(false);
                setAvailableSubtitles(allSubtitles);
                setShowSubtitleSearchModal(true);
            } else {
                
                const looksLikeSeries = /\b(season|series|episode|s\d{1,2}|e\d{1,2})\b/i.test(videoName);
                const hasEpisodeInfo = /s\d{1,2}e\d{1,2}/i.test(videoName);

                if (!hasEpisodeInfo && looksLikeSeries) {
                    showNotification(`No subtitles found for "${videoName}". For TV series, rename file to include S01E01 format (e.g., "Show.Name.S01E01.720p.mkv")`);
                } else {
                    showNotification(`No subtitles found for "${videoName}". Try searching with another title.`);
                }

                // Open film selection modal so user can re-search with another query
                setShowSubtitleSearchModal(false);
                setSearchQueryForFilms(targetTitle);
                setAvailableFilms(response.results || []);
                setShowFilmSelection(true);
            }
        } catch (error) {
            debugError('Error searching subtitles:', error);
            showNotification('Failed to search for subtitles');
        } finally {
            setIsSearchingSubtitles(false);
        }
    };

    const handleSelectFilmForSubtitles = async (film: SubDLSearchResult) => {
        debugLog('=== handleSelectFilmForSubtitles ===');
        debugLog('Full film object:', JSON.stringify(film, null, 2));
        debugLog('film.imdbId:', film.imdbId, 'type:', typeof film.imdbId);
        debugLog('film.tmdbId:', film.tmdbId, 'type:', typeof film.tmdbId);
        debugLog('film.sdId:', film.sdId, 'type:', typeof film.sdId);

        setShowFilmSelection(false);
        setIsSearchingSubtitles(true);

        try {
            sessionStorage.setItem('videoFileName', film.name);
            
            debugLog('Calling SubtitleService.searchSubtitlesSubDL with:');
            debugLog('  filmName:', film.name);
            debugLog('  imdbId:', film.imdbId || undefined);
            debugLog('  tmdbId:', film.tmdbId ? String(film.tmdbId) : undefined);
            debugLog('  sdId:', film.sdId);

            const response = await SubtitleService.searchSubtitlesSubDL(
                film.name,
                currentSearchParams?.languages || 'EN',
                currentSearchParams?.type || 'movie',
                currentSearchParams?.seasonNumber,
                currentSearchParams?.episodeNumber,
                film.imdbId || undefined,
                film.tmdbId ? String(film.tmdbId) : undefined,
                film.sdId,
                film.year
            );

            if (response.subtitles && response.subtitles.length > 0) {
                
                let videoDuration = videoRef.current?.duration || duration || 0;
                const videoFileName = sessionStorage.getItem('videoFileName') || film.name;

                
                let videoFps: number | undefined;
                try {
                    const videoElement = videoRef.current;
                    if (videoElement && (videoElement as any).requestVideoFrameCallback) {
                        videoFps = undefined;
                    }
                } catch (e) {
                    debugLog('Could not extract FPS:', e);
                }

                
                if (videoDuration === 0 && videoRef.current) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    videoDuration = videoRef.current?.duration || 0;
                }

                const allSubtitles = response.subtitles.map(sub => {
                    const { score, reason } = calculateSyncScore(sub, videoDuration, videoFps, videoFileName);
                    return {
                        ...sub,
                        syncScore: score,
                        syncReason: reason
                    } as SubtitleWithScore;
                });

                allSubtitles.sort((a, b) => b.syncScore - a.syncScore);

                const bestScore = allSubtitles[0]?.syncScore || 0;

                debugLog(`Found ${allSubtitles.length} subtitles for "${film.name}"`);

                if (bestScore >= 40) {
                    showNotification(`Found ${allSubtitles.length} subtitles for "${film.name}".`);
                } else {
                    showNotification(`Found ${allSubtitles.length} subtitles. Sorted by ratings.`);
                }

                setAvailableSubtitles(allSubtitles);
                setShowSubtitleSearchModal(true);
            } else {
                showNotification(`No subtitles found for "${film.name}". Try uploading manually.`);
                setAvailableSubtitles([]);
            }
        } catch (error) {
            debugError('Error searching subtitles for selected film:', error);
            showNotification('Failed to search for subtitles');
            setAvailableSubtitles([]);
        } finally {
            setIsSearchingSubtitles(false);
        }
    };

    const handleQuickTest = async (subtitle: SubtitleWithScore) => {
        try {
            debugLog('Quick testing subtitle:', subtitle);

            
            setShowSubtitleSearchModal(false);

            showNotification('Downloading subtitle for test...');

            const subtitleContent = await SubtitleService.downloadSubtitleFromSubDL(subtitle);

            
            const parsedSubtitles = parseSRT(subtitleContent, subtitle.name);
            debugLog('Parsed subtitles:', parsedSubtitles.length, 'items');

            
            setSubtitlesForVideo(sanitizeSubtitles(parsedSubtitles));
            setFileName(subtitle.releaseName || subtitle.name);

            
            setSelectedSubtitle('quick-test');

            setIsTemporarySubtitles(true);
            setTemporarySubtitleInfo(subtitle);

            
            setTimeout(() => {
                showNotification('');
            }, 1500);
        } catch (error) {
            debugError('Error quick testing subtitle:', error);
            showNotification('Failed to test subtitles');
            setIsTemporarySubtitles(false);
            setTemporarySubtitleInfo(null);
        }
    };

    const handleKeepTemporarySubtitles = async () => {
        if (!temporarySubtitleInfo || !subtitlesForVideo) return;

        try {
            showNotification('Saving subtitles...');

            
            const srtContent = (Array.isArray(subtitlesForVideo) ? subtitlesForVideo : []).map((sub, index) => {
                const startTime = formatSrtTimestamp(sub.startTimeMs);
                const endTime = formatSrtTimestamp(sub.endTimeMs);
                return `${index + 1}\n${startTime} --> ${endTime}\n${sub.text}\n`;
            }).join('\n');

            
            let cleanFileName = sessionStorage.getItem('videoFileName') || temporarySubtitleInfo.name;

            
            cleanFileName = cleanFileName.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '');

            // Clean special characters
            cleanFileName = cleanFileName
                .replace(/[^a-zA-Z0-9._-]/g, '_')
                .replace(/_{2,}/g, '_')
                .replace(/^_+|_+$/g, '');

            const maxLength = 46;
            if (cleanFileName.length > maxLength) {
                cleanFileName = cleanFileName.substring(0, maxLength);
            }
            cleanFileName = cleanFileName + '.srt';

            debugLog('Saving subtitle with video-based filename:', cleanFileName);

            
            const blob = new Blob([srtContent], { type: 'text/plain' });
            const file = new File([blob], cleanFileName, { type: 'text/plain' });

            await onSubtitleUpload(file);

            setIsTemporarySubtitles(false);
            setTemporarySubtitleInfo(null);

            showNotification('Subtitles saved!');
        } catch (error) {
            debugError('Error keeping subtitles:', error);
            showNotification('Failed to save subtitles');
        }
    };

    const handleDiscardTemporarySubtitles = () => {
        setSubtitlesForVideo(null);
        setSelectedSubtitle(null);
        setIsTemporarySubtitles(false);
        setTemporarySubtitleInfo(null);
        setFileName('');
        showNotification('Subtitles discarded. Trying another...');

        // Reopen modal to try another option
        setTimeout(() => {
            setShowSubtitleSearchModal(true);
        }, 500);
    };

    const formatSrtTimestamp = (ms: number): string => {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        const seconds = Math.floor((ms % 60000) / 1000);
        const milliseconds = ms % 1000;

        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
    };

    const handleSelectSubtitleFromSearch = async (subtitle: SubDLSubtitle) => {
        try {
            debugLog('Selected subtitle:', subtitle);
            debugLog('Subtitle URL:', subtitle.url);
            debugLog('Subtitle full object:', JSON.stringify(subtitle, null, 2));

            setShowSubtitleSearchModal(false);
            showNotification('Downloading subtitles...');

            const subtitleContent = await SubtitleService.downloadSubtitleFromSubDL(subtitle);

            // Use VIDEO name as base, not subtitle name (prevents overwrites for series)
            let cleanFileName = sessionStorage.getItem('videoFileName') || subtitle.name;

            // Remove extension if present
            cleanFileName = cleanFileName.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '');

            // Clean filename: remove spaces and special characters
            cleanFileName = cleanFileName
                .replace(/[^a-zA-Z0-9._-]/g, '_')  // Replace invalid chars with underscore
                .replace(/_{2,}/g, '_')             // Replace multiple underscores with single
                .replace(/^_+|_+$/g, '');           // Remove leading/trailing underscores

            // Limit filename to 46 chars (+ 4 for ".srt" = 50 total)
            const maxLength = 46;
            if (cleanFileName.length > maxLength) {
                cleanFileName = cleanFileName.substring(0, maxLength);
            }

            cleanFileName = cleanFileName + '.srt';

            debugLog('Saving subtitle with video-based filename:', cleanFileName, `(${cleanFileName.length} chars)`);

            const blob = new Blob([subtitleContent], { type: 'text/plain' });
            const file = new File([blob], cleanFileName, { type: 'text/plain' });

            await onSubtitleUpload(file);

            showNotification('Subtitles loaded successfully');
        } catch (error) {
            debugError('Error loading subtitle:', error);
            showNotification('Failed to load subtitles');
        }
    };

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
                    const response = await fetch(firstSub.url);
                    const text = await response.text();
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

    const cleanTextForSelection = (text: string): string => {
        return cleanSubtitleSelection(text);
    };

        const findSentenceForSubtitle = (selected: string | null): string | null => {
        if (!selected || !currentSubtitle) {
            debugLog('No selected text or current subtitle');
            return null;
        }

        try {
            
            const fullExtendedContext = getExtendedSubtitleContext();
            const cleanedContext = cleanTextForSelection(fullExtendedContext);

            
            const escapedSelection = selected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

            
            const selectionIndex = cleanedContext.toLowerCase().indexOf(selected.toLowerCase());
            if (selectionIndex === -1) {
                console.warn('Selected text not found in context, using current subtitle');
                return cleanTextForSelection(currentSubtitle);
            }

            

            
            const sentenceRegex = new RegExp(
                `[^.!?]*\\b${escapedSelection}\\b[^.!?]*[.!?]+`,
                'gi'
            );
            const sentenceMatches = cleanedContext.match(sentenceRegex);

            if (Array.isArray(sentenceMatches) && sentenceMatches.length > 0) {
                const sentence = cleanTextForSelection(sentenceMatches[0]);
                debugLog('✅ Found sentence with punctuation:', sentence);
                setSelectedSentence(sentence);
                return sentence;
            }

            
            const logicalBoundaryRegex = new RegExp(
                `(?:^|[.!?]\\s+)([^.!?]*\\b${escapedSelection}\\b[^.!?]*)(?:[.!?]|$)`,
                'gi'
            );
            const logicalMatches = cleanedContext.match(logicalBoundaryRegex);

            if (Array.isArray(logicalMatches) && logicalMatches.length > 0) {
                const sentence = cleanTextForSelection(logicalMatches[0].replace(/^[.!?]\s+/, ''));
                debugLog('✅ Found sentence with logical boundaries:', sentence);
                setSelectedSentence(sentence);
                return sentence;
            }

            // Strategy 3: Extract surrounding context (N words before/after)
            const words = cleanedContext.split(/\s+/);
            const selectedWords = selected.split(/\s+/);
            const selectedStartIndex = words.findIndex((word, idx) => {
                const phrase = words.slice(idx, idx + selectedWords.length).join(' ');
                return phrase.toLowerCase() === selected.toLowerCase();
            });

            if (selectedStartIndex !== -1) {
                const contextWindowSize = 10; // words before/after
                const startIdx = Math.max(0, selectedStartIndex - contextWindowSize);
                const endIdx = Math.min(words.length, selectedStartIndex + selectedWords.length + contextWindowSize);
                const contextSentence = words.slice(startIdx, endIdx).join(' ');

                debugLog('✅ Found contextual window:', contextSentence);
                setSelectedSentence(contextSentence);
                return contextSentence;
            }

            // Fallback: Use extended context or current subtitle
            const fallback = fullExtendedContext.length > currentSubtitle.length
                ? cleanedContext
                : cleanTextForSelection(currentSubtitle);

            debugLog('⚠️ Using fallback context:', fallback);
            setSelectedSentence(fallback);
            return fallback;

        } catch (error) {
            debugError('Error in findSentenceForSubtitle:', error);
            const fallback = cleanTextForSelection(currentSubtitle);
            setSelectedSentence(fallback);
            return fallback;
        }
    };

    /**
     * Gets extended subtitle context by combining previous, current, and next subtitles.
     * This provides better context for sentence boundary detection.
     */
    const getExtendedSubtitleContext = (): string => {
        if (!Array.isArray(subtitlesForVideo) || !currentSubtitle) {
            return cleanSubtitleSelection(currentSubtitle || '');
        }

        // Find current subtitle index
        const currentIndex = subtitlesForVideo.findIndex(sub => sub.text === currentSubtitle);

        if (currentIndex === -1) {
            return cleanSubtitleSelection(currentSubtitle);
        }

        // Collect context: previous + current + next
        const contextParts: string[] = [];

        // Add previous subtitle (if exists)
        if (currentIndex > 0) {
            contextParts.push(cleanSubtitleText(subtitlesForVideo[currentIndex - 1].text));
        }

        // Add current subtitle
        contextParts.push(cleanSubtitleText(currentSubtitle));

        // Add next subtitle (if exists)
        if (currentIndex < subtitlesForVideo.length - 1) {
            contextParts.push(cleanSubtitleText(subtitlesForVideo[currentIndex + 1].text));
        }

        return cleanSubtitleSelection(contextParts.join(' '));
    };

    const showSelectionTooltip = (range: Range) => {
        try {
            const rect = range.getBoundingClientRect();

            if (!rect || rect.width === 0) return;

            const portalParent = (document.fullscreenElement || document.body) as HTMLElement;
            const parentRect = portalParent.getBoundingClientRect();

            // Find container rect if range is inside currentSubtitleContainer
            const node = range.commonAncestorContainer;
            const element = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
            const subtitleContainerEl = element?.closest(`.${styles.currentSubtitleContainer}`) as HTMLElement | null;
            const containerRect = subtitleContainerEl?.getBoundingClientRect();

            // Estimated popover height for small screens (14" diagonal ≈ 768px height)
            const estimatedPopoverHeight = 350;
            const minPopoverHeight = 150; // Minimum usable height for popover
            const minPopoverWidth = 160; // Half of max-width 320px for centering

            let showBelow = false;
            let isConstrained = false;
            let maxHeight: number | undefined = undefined;

            // Anchor directly to container boundary if present, otherwise to selected text
            const topBoundary = containerRect ? containerRect.top : rect.top;
            const bottomBoundary = containerRect ? containerRect.bottom : rect.bottom;

            // Calculate available space above and below the anchor in viewport
            const spaceAbove = topBoundary;
            const spaceBelow = window.innerHeight - bottomBoundary;

            const GAP = 8; // Clean gap right above/below subtitle block

            // Calculate X relative to portalParent
            let x = rect.left - parentRect.left + (rect.width / 2);

            // Constrain X position within viewport bounds relative to portalParent
            const minX = -parentRect.left + minPopoverWidth;
            const maxX = -parentRect.left + window.innerWidth - minPopoverWidth;
            if (x < minX) x = minX;
            if (x > maxX) x = maxX;

            // Calculate Y relative to portalParent so popover moves seamlessly with page scroll
            let y: number;
            if (spaceAbove >= estimatedPopoverHeight) {
                y = topBoundary - parentRect.top - GAP;
                showBelow = false;
            } else if (spaceBelow >= estimatedPopoverHeight) {
                showBelow = true;
                y = bottomBoundary - parentRect.top + GAP;
            } else if (spaceBelow > spaceAbove) {
                showBelow = true;
                isConstrained = true;
                y = bottomBoundary - parentRect.top + GAP;
                maxHeight = Math.max(spaceBelow - 20, minPopoverHeight);
            } else {
                showBelow = false;
                isConstrained = true;
                y = topBoundary - parentRect.top - GAP;
                maxHeight = Math.max(spaceAbove - 20, minPopoverHeight);
            }

            setSelectionPosition({
                x,
                y,
                showBelow,
                isConstrained,
                maxHeight
            });

            setIsPopoverOpen(true);
        } catch (err) {
            debugError('Error showing selection tooltip:', err);
        }
    };

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length < 2) {
            setIsPopoverOpen(false);
            return;
        }

        const selectedText = selection.toString().trim();
        const range = selection.getRangeAt(0);

        debugLog('handleTextSelection called:', { selectedText, isMobile });

        if (isMobile) {
            setTimeout(() => {
                processSelection(selectedText, range);
            }, 300);
        } else {
            processSelection(selectedText, range);
        }
    };

    const processSelection = (selectedText: string, range: Range) => {
        if (!selectedText) {
            debugError('processSelection called with null/undefined selectedText');
            return;
        }

        setActiveSelection({ text: selectedText, range });

        const wordCount = selectedText.split(/\s+/).length;
        const isSingleWord = wordCount === 1;

        setTranslationData({
            translation: null,
            definition: null,
            imageUrl: null,
            showImage: true,
            transcription: null,
            hint: null,
            examples: null,
            synonyms: null,
            style: null,
            partOfSpeech: null,
            otherMeanings: null,
            collocations: null,
            recommendedSelections: null,
            minimalUnit: null,
            register: null,
            usageNote: null,
            alternatives: null,
            chunks: null,
            typicalContexts: null,
        });
        setNote('');
        setIsLoading(true);

        setSelectedText(selectedText);

        pauseVideo();

        showSelectionTooltip(range);
        const sentence = findSentenceForSubtitle(selectedText);
        debugLog('Found sentence:', sentence);
        if (sentence) {
            setSelectedSentence(sentence);
            // Get extended context for backend
            const extendedCtx = getExtendedSubtitleContext();
            fetchTranslation(selectedText, sentence, isSingleWord, extendedCtx);
        }
    };

    const formatSubtitleForDisplay = (text: string): string => {
        if (!text) return '';

        // 1. Sanitize ASS/SSA tags, HTML markup, and convert \N into \n
        let formatted = cleanSubtitleText(text);

        // 2. Collapse non-dialogue newlines into a single space
        formatted = formatted.replace(/\n(?![ \t]*[-–—])/g, ' ');

        // 3. Ensure dialogue lines start on fresh lines with '- '
        formatted = formatted.replace(/([^\n])\s+[-–—]\s+/g, '$1\n- ');
        formatted = formatted.replace(/\s+[-–—]\s+/g, '\n- ');

        // 4. Collapse duplicate horizontal spaces and trim
        return formatted.replace(/[ \t]{2,}/g, ' ').trim();
    };

    const renderHighlightedText = (text: string) => {
        if (!text) return null;

        const wordMap = new Map<string, { translations: string[], definitions: string[] }>();

        for (const item of highlightedWords) {
            const searchTerm = item.highlightedText.trim().toLowerCase();
            if (!searchTerm) continue;

            if (!wordMap.has(searchTerm)) {
                wordMap.set(searchTerm, { translations: [], definitions: [] });
            }

            const entry = wordMap.get(searchTerm)!;

            const translation = item.translatedText && item.translatedText.trim()
                ? item.translatedText.trim()
                : item.definition && item.definition.trim()
                    ? item.definition.trim()
                    : null;

            if (translation) {
                entry.translations.push(translation);
            }
        }

        const sortedSearchTerms = Array.from(wordMap.keys()).sort((a, b) => b.length - a.length);

        const allMatches: Array<{
            start: number;
            end: number;
            translation: string;
            definition: string;
            originalText: string;
        }> = [];

        for (const searchTerm of sortedSearchTerms) {
            const entry = wordMap.get(searchTerm)!;

            const filteredTranslations = (Array.isArray(entry.translations) ? entry.translations : []).filter(t => t && t.trim().length > 0);
            const uniqueTranslations = Array.from(new Set(filteredTranslations));

            const translations = uniqueTranslations.join(', ');

            const isPhrase = searchTerm.includes(' ');
            let searchIndex = 0;

            while (searchIndex < text.length) {
                const matchResult = isPhrase
                    ? findPhraseMatch(text, searchTerm, searchIndex)
                    : findWordMatch(text, searchTerm, searchIndex);

                if (!matchResult.found) break;

                if (matchResult.isValid && !isRangeOverlapping(matchResult.start, matchResult.end, allMatches)) {
                    const originalWord = text.slice(matchResult.start, matchResult.end);
                    allMatches.push({
                        start: matchResult.start,
                        end: matchResult.end,
                        translation: translations,
                        definition: '',
                        originalText: originalWord
                    });
                }

                searchIndex = matchResult.nextSearchIndex;
            }
        }

        allMatches.sort((a, b) => b.start - a.start);

        const escapeHtmlAttribute = (str: string) => {
            if (!str) return '';
            return str
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        };

        let result = text;
        for (const match of allMatches) {
            const escapedTranslation = escapeHtmlAttribute(match.translation);
            const escapedDefinition = escapeHtmlAttribute(match.definition);
            const escapedOriginalText = match.originalText
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            const spanHtml = `<span class="${styles.dictionaryWord}" data-translation="${escapedTranslation}" data-definition="${escapedDefinition}">${escapedOriginalText}</span>`;
            result = result.slice(0, match.start) + spanHtml + result.slice(match.end);
        }

        
        
        result = result.replace(/\n/g, '<br>');

        return <span key={highlightedWords.length} dangerouslySetInnerHTML={{ __html: result }} />;
    };

    function findPhraseMatch(text: string, searchPhrase: string, startIndex: number) {
        const foundIndex = text.toLowerCase().indexOf(searchPhrase.toLowerCase(), startIndex);

        if (foundIndex === -1) {
            return { found: false, nextSearchIndex: text.length };
        }

        const isWordStart = foundIndex === 0 || !/[a-zA-Z]/.test(text[foundIndex - 1]);

        if (!isWordStart) {
            return {
                found: true,
                isValid: false,
                start: foundIndex,
                end: foundIndex + searchPhrase.length,
                nextSearchIndex: foundIndex + 1
            };
        }

        let endIndex = foundIndex + searchPhrase.length;
        const remainingText = text.slice(endIndex);

        let punctuationLength = 0;
        let hasValidEnd = false;

        if (remainingText.length === 0) {
            hasValidEnd = true;
        } else {
            for (let i = 0; i < remainingText.length; i++) {
                const char = remainingText[i];
                if (/[.,!?;:"']/.test(char)) {
                    punctuationLength++;
                } else if (/\s/.test(char)) {
                    hasValidEnd = true;
                    break;
                } else if (/[a-zA-Z]/.test(char)) {
                    break;
                } else {
                    hasValidEnd = true;
                    break;
                }
            }

            if (punctuationLength > 0 && punctuationLength === remainingText.length) {
                hasValidEnd = true;
            }
        }

        return {
            found: true,
            isValid: hasValidEnd,
            start: foundIndex,
            end: endIndex + punctuationLength,
            nextSearchIndex: foundIndex + 1
        };
    }

    function findWordMatch(text: string, searchTerm: string, startIndex: number) {
        const VALID_ENDINGS = [
            "s", "es", "’s", "ed", "d", "ing",
            "er", "r", "est",

            "ly",

            "ness", "ment", "ion", "tion", "sion", "ity",
            "or", "ist", "ship", "hood", "dom",

            "able", "ible", "ous", "ful", "less", "al", "ic", "ish", "y",

            "ize", "ise", "en", "ify",

            "ward", "wards", "wise"
        ];

        const foundIndex = text.toLowerCase().indexOf(searchTerm.toLowerCase(), startIndex);

        if (foundIndex === -1) {
            return { found: false, nextSearchIndex: text.length };
        }

        const isWordStart = foundIndex === 0 || !/[a-zA-Z]/.test(text[foundIndex - 1]);

        if (!isWordStart) {
            return {
                found: true,
                isValid: false,
                start: foundIndex,
                end: foundIndex + searchTerm.length,
                nextSearchIndex: foundIndex + 1
            };
        }

        const remainingText = text.slice(foundIndex + searchTerm.length);

        if (remainingText.length === 0 || !/[a-zA-Z]/.test(remainingText[0])) {
            return {
                found: true,
                isValid: true,
                start: foundIndex,
                end: foundIndex + searchTerm.length,
                nextSearchIndex: foundIndex + 1
            };
        }

        for (const ending of VALID_ENDINGS) {
            if (remainingText.toLowerCase().startsWith(ending)) {
                const afterEnding = remainingText.slice(ending.length);

                if (afterEnding.length === 0 || !/[a-zA-Z]/.test(afterEnding[0])) {
                    return {
                        found: true,
                        isValid: true,
                        start: foundIndex,
                        end: foundIndex + searchTerm.length,
                        nextSearchIndex: foundIndex + searchTerm.length + ending.length
                    };
                }
            }
        }

        return {
            found: true,
            isValid: false,
            start: foundIndex,
            end: foundIndex + searchTerm.length,
            nextSearchIndex: foundIndex + 1
        };
    }

    function isRangeOverlapping(
        start: number,
        end: number,
        existingRanges: Array<{ start: number, end: number }>
    ): boolean {
        return existingRanges.some(range =>
            start < range.end && end > range.start
        );
    }



    useEffect(() => {
        const handleScroll = () => {
            if (activeSelection) {
                showSelectionTooltip(activeSelection.range);
            }
        };

        if (isPopoverOpen) {
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('touchmove', handleScroll, { passive: true, capture: true } as AddEventListenerOptions);
            window.addEventListener('resize', handleScroll);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('touchmove', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isPopoverOpen, activeSelection, isFullscreen]);

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

    const fetchTranslation = async (text: string, sentence: string, isSingleWord: boolean, extended?: string) => {
        if (!isMountedRef.current) return;

        setIsLoading(true);
        setShowSubmitButton(false);

        pauseVideo();

        if (!fluentLanguage) {
            showNotification(intl.formatMessage({ id: 'selectLanguageToTranslate', defaultMessage: 'Select a language in the header to translate' }));
            setShowLanguageOverlay(true);
            setIsLoading(false);
            return;
        }

        const originalPromise = SubtitleService.getTranslationProd({
            resourceName: getResourceName(),
            highlightedText: text,
            context: sentence,
            extendedContext: extended,
            learningLanguage: learningLanguage,
            fluentLanguage: fluentLanguage,
        }).catch(error => {
            if (error?.message === 'GUEST_LIMIT_REACHED') {
                setIsLoading(false);
                setIsPopoverOpen(false);
                return null;
            }
            debugError('Error in original translation:', error);
            const axiosError = error as AxiosError;
            if (axiosError.response?.status === 404) {
                setTranslationData(prev => ({ ...prev, translation: 'Try selecting a nearby phrase — we could not translate the selected word.' }));
            } else {
                setTranslationData(prev => ({ ...prev, translation: 'Error fetching translation.' }));
            }
            return null;
        });

        try {
            const originalResult = await originalPromise;

            if (!isMountedRef.current) return;

            if (originalResult) {
                debugLog('Original translation result:', originalResult);
                setTranslationData(prev => ({
                    ...prev,
                    translation: originalResult.translation || ' ',
                    definition: originalResult.definition,
                    transcription: originalResult.transcription,
                    imageUrl: originalResult.imageUrl,
                    showImage: true,
                    hint: originalResult.hint || null,
                    examples: originalResult.examples || null,
                    synonyms: originalResult.synonyms || null,
                    style: originalResult.style || null,
                    partOfSpeech: originalResult.partOfSpeech || null,
                    otherMeanings: originalResult.other_meanings || null,
                    collocations: originalResult.context_analysis?.collocations || null,
                    recommendedSelections: originalResult.recommended_selections || null,
                    minimalUnit: originalResult.context_analysis?.minimal_unit || null,
                    register: originalResult.register || originalResult.style || null,
                    usageNote: originalResult.usage_note || null,
                    alternatives: originalResult.alternatives?.map(a => ({ text: a.text, register: a.register, usageNote: a.usage_note })) || null,
                    chunks: originalResult.chunks || null,
                    typicalContexts: originalResult.typical_contexts || null,
                }));
            }

            const hasValidOriginal = originalResult &&
                originalResult.translation &&
                originalResult.translation.trim() !== "" &&
                !originalResult.translation.startsWith("You have reached");

            const hasValidDefinition = originalResult &&
                originalResult.definition !== null &&
                originalResult.definition !== undefined &&
                String(originalResult.definition).trim() !== "";

            if (hasValidOriginal || hasValidDefinition) {
                setShowSubmitButton(true);
            } else {
                setShowSubmitButton(false);
            }
        } catch (error) {
            debugError('Error in fetchTranslation:', error);
            setShowSubmitButton(false);
        } finally {
            setIsLoading(false);
        }
    };

    const resetPopoverState = useCallback(() => {
        setSelectedText(null);
        setSelectedSentence(null);
        setTranslationData({
            translation: null,
            definition: null,
            imageUrl: null,
            showImage: true,
            transcription: null,
            hint: null,
            examples: null,
            synonyms: null,
            style: null,
            partOfSpeech: null,
            otherMeanings: null,
            collocations: null,
            recommendedSelections: null,
            minimalUnit: null,
            register: null,
            usageNote: null,
            alternatives: null,
            chunks: null,
            typicalContexts: null,
        });
        setNote('');
        setIsLoading(false);
        setShowSubmitButton(false);
        setSelectionPosition(null);
        setActiveSelection(null);
        setNotification(null);
        setIsPopoverOpen(false);
    }, []);


    useEffect(() => {
        if (isPopoverOpen || isLoading) {
            pauseVideo();
        } else {
            playVideo();
        }
    }, [isPopoverOpen, isLoading, pauseVideo, playVideo]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const popover = document.getElementById("popover-id");
            const loadingPopover = document.getElementById("popover-loading");
            const target = event.target as HTMLElement;

            const isClickInsidePopover = popover?.contains(target);
            const isClickInsideLoadingPopover = loadingPopover?.contains(target);

            if (!isClickInsidePopover && !isClickInsideLoadingPopover) {
                if (isPopoverOpen) {
                    resetPopoverState();
                    if (window.getSelection) {
                        window.getSelection()?.removeAllRanges();
                    }

                    playVideo();

                    event.stopPropagation();
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPopoverOpen, playVideo, resetPopoverState]);

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
        if (!isPopoverOpen) {
            setShowSubmitButton(false);
        }
    }, [isPopoverOpen]);

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

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        const activeElement = document.activeElement as HTMLElement;

        if (activeElement.tagName === 'TEXTAREA' || activeElement.tagName === 'INPUT') {
            return;
        }

        if (event.code === 'Escape') {
            resetPopoverState();
        }

        if (event.code === 'ArrowRight') {
            if (videoId && youtubePlayerRef.current) {
                const currentTime = youtubePlayerRef.current.getCurrentTime();
                youtubePlayerRef.current.seekTo(currentTime + 4, true);
            } else if (videoRef.current) {
                videoRef.current.currentTime += 4;
            }
        }

        if (event.code === 'ArrowLeft') {
            if (videoId && youtubePlayerRef.current) {
                const currentTime = youtubePlayerRef.current.getCurrentTime();
                youtubePlayerRef.current.seekTo(currentTime - 4, true);
            } else if (videoRef.current) {
                videoRef.current.currentTime -= 4;
            }
        }

        if (event.code === 'KeyT') {
            event.preventDefault();
            toggleMaxFit();
        }

        if (event.code === 'Space') {
            event.preventDefault();
            if (videoId && youtubePlayerRef.current) {
                const state = youtubePlayerRef.current.getPlayerState();
                if (state === 1) {
                    youtubePlayerRef.current.pauseVideo();
                } else {
                    youtubePlayerRef.current.playVideo();
                }
            }
            else if (videoRef.current) {
                if (videoRef.current.paused) {
                    playVideo();
                } else {
                    pauseVideo();
                }
            }
        }
    }, [videoId, youtubePlayerRef, videoRef, playVideo, pauseVideo, resetPopoverState, toggleMaxFit]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleKeyDown]);

    const repeatSubtitle = (subtitle: { startTimeMs: number, endTimeMs: number }) => {
        if (videoId && youtubePlayerRef.current) {
            const { startTimeMs, endTimeMs } = subtitle;
            const repeatCount = 3;
            let currentRepeat = 0;

            const repeatLoop = () => {
                if (youtubePlayerRef.current && currentRepeat < repeatCount) {
                    youtubePlayerRef.current.seekTo(startTimeMs / 1000, true);
                    youtubePlayerRef.current.playVideo();

                    const checkTime = setInterval(async () => {
                        if (youtubePlayerRef.current) {
                            const currentTime = await youtubePlayerRef.current.getCurrentTime();
                            if (currentTime >= endTimeMs / 1000) {
                                currentRepeat++;
                                if (currentRepeat < repeatCount) {
                                    youtubePlayerRef.current.seekTo(startTimeMs / 1000);
                                } else {
                                    clearInterval(checkTime);
                                }
                            }
                        }
                    }, 100);
                }
            };
            repeatLoop();

        } else if (videoRef.current) {
            const { startTimeMs, endTimeMs } = subtitle;
            const repeatCount = 3;
            let currentRepeat = 0;

            const repeatLoop = () => {
                if (videoRef.current && currentRepeat < repeatCount) {
                    videoRef.current.currentTime = startTimeMs / 1000;
                    safePlay();

                    videoRef.current.ontimeupdate = () => {
                        if (videoRef.current && videoRef.current?.currentTime >= endTimeMs / 1000) {
                            currentRepeat++;
                            if (currentRepeat < repeatCount) {
                                videoRef.current.currentTime = startTimeMs / 1000;
                            } else {
                                videoRef.current.ontimeupdate = null;
                            }
                        }
                    };
                }
            };

            repeatLoop();
        }
    };

    const handleRepeatCurrentSubtitle = async () => {
        if (!subtitlesForVideo || subtitlesForVideo.length === 0) return;
        let subtitle = subtitlesForVideo.find(
            (sub) => sub.text === currentSubtitle
        );
        if (!subtitle) {
            let curSec = 0;
            if (youtubePlayerRef.current) {
                try {
                    curSec = await youtubePlayerRef.current.getCurrentTime();
                } catch {}
            } else if (videoRef.current) {
                curSec = videoRef.current.currentTime;
            }
            const curTimeMs = curSec * 1000;
            if (curTimeMs > 0) {
                subtitle = subtitlesForVideo.find(
                    (sub) => curTimeMs >= sub.startTimeMs && curTimeMs <= (sub.endTimeMs + 1500)
                );
            }
        }
        if (subtitle) {
            repeatSubtitle(subtitle);
        }
    };

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

    const queryClient = useQueryClient();

    const saveWordMutation = useSaveWord({
        onMutate: async (newData: SaveWordData) => {
            await queryClient.cancelQueries({ queryKey: ['dictionaryItems', 'user'] });

            setOnboardingStep('completed');
            try {
                localStorage.setItem('substreamedu_onboarding_completed', 'true');
            } catch {}

            const previousItems = dictionaryItems;

            const optimisticItem: DictionaryItem = {
                id: Date.now(),
                resourceName: newData.resourceName,
                highlightedText: newData.highlightedText,
                translatedText: newData.translation || '',
                context: newData.context,
                definition: newData.definition || ''
            };

            setDictionaryItems(prev => [...prev, optimisticItem]);
            setHighlightedWords(prev => [...prev, optimisticItem]);

            showNotification('The word has been added to the dictionary');
            setShowSubmitButton(false);
            setIsPopoverOpen(false);
            resetPopoverState();

            return { previousItems };
        },
        onError: (err: any, _variables: SaveWordData, context: SaveWordContext | undefined) => {
            if (context?.previousItems) {
                setDictionaryItems(context.previousItems);
                setHighlightedWords(context.previousItems);
            }
            const errorResponse = err as ErrorResponse;
            const status = err?.status || err?.response?.status;
            const message = (err?.message || err?.response?.data?.message || '').toLowerCase();

            if (status === 403 || message.includes('save limit') || message.includes('word save')) {
                window.dispatchEvent(new CustomEvent('substreamedu:premium_limit_reached', { detail: { type: 'save' } }));
            } else if (errorResponse?.status === 503 && errorResponse?.message) {
                setTranslationData(prev => ({ ...prev, translation: errorResponse.message }));
                setShowSubmitButton(false);
            } else {
                showNotification('Failed to save word. Please try again.');
            }
            debugError("Mutation failed", err);
        }
    });

    const saveToDict = () => {
        if (!selectedText || !selectedSentence || !isMountedRef.current) return;

        const translationDataToSave = {
            translation: translationData.translation,
            definition: translationData.definition,
            transcription: translationData.transcription,
            imageUrl: translationData.showImage ? translationData.imageUrl : null
        };

        
        const extendedCtx = getExtendedSubtitleContext();

        saveWordMutation.mutate({
            resourceName: getResourceName(),
            highlightedText: selectedText,
            context: selectedSentence,
            extendedContext: extendedCtx || undefined,
            translation: translationDataToSave.translation || '',
            note: note,
            transcription: translationDataToSave.transcription || '',
            definition: translationDataToSave.definition || '',
            imageUrl: translationDataToSave.imageUrl || ''
        });
    };

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

                                <div
                                    className={`${styles.controlsOverlay} ${showControls ? styles.visible : ''}`}
                                    onClick={handleVideoClick}
                                >
                                    {/* 1. TOP CONTROLS */}
                                    <div className={styles.topControls} onClick={(e) => e.stopPropagation()}>
                                        <div className={styles.topControlsLeft}>
                                            {/* Space for title or replace button */}
                                        </div>
                                        <div className={styles.topControlsRight}>
                                            <button
                                                className={styles.controlButton}
                                                onClick={() => {
                                                    pauseVideo();
                                                    setIsGrammarIndexOpen(true);
                                                }}
                                                title="Grammar in this Video"
                                                aria-label="Grammar in this Video"
                                            >
                                                <Sparkles size={20} />
                                            </button>
                                            {!isMobile && (
                                                <button
                                                    className={`${styles.controlButton} ${styles.desktopOnlyControl}`}
                                                    onClick={() => {
                                                        pauseVideo();
                                                        setIsLessonStudioOpen(true);
                                                    }}
                                                    title="Teacher Studio / Lesson Builder"
                                                    aria-label="Teacher Studio / Lesson Builder"
                                                >
                                                    <GraduationCap size={20} />
                                                </button>
                                            )}
                                            <button
                                                className={styles.controlButton}
                                                onClick={() => setShowSubtitles(!showSubtitles)}
                                                aria-label={showSubtitles ? "Hide subtitles" : "Show subtitles"}
                                                title={showSubtitles ? "Hide subtitles" : "Show subtitles"}
                                            >
                                                {showSubtitles ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                            {/* 1. Subtitle Blur Toggle */}
                                            <button
                                                type="button"
                                                className={`${styles.quickPillButton} ${blurSubtitles ? styles.activePill : ''}`}
                                                onClick={() => {
                                                    const next = !blurSubtitles;
                                                    setBlurSubtitles(next);
                                                    try {
                                                        localStorage.setItem('substreamedu_subtitle_blur', String(next));
                                                    } catch {}
                                                }}
                                                title={blurSubtitles ? "Subtitles blurred (Listening practice active) — click to show plain" : "Blur subtitles (Listening practice)"}
                                                aria-label="Toggle blur subtitles"
                                            >
                                                Blur
                                            </button>

                                            {/* 2. Subtitle Delay Toggle */}
                                            <button
                                                type="button"
                                                className={`${styles.quickPillButton} ${delay === -2 ? styles.activePill : ''}`}
                                                onClick={() => handleDelayChange(delay === -2 ? 0 : -2)}
                                                title={delay === -2 ? "Subtitle delay: -2s active — click for 0s" : "Delay subtitles by 2s (Listening practice)"}
                                                aria-label="Toggle subtitle delay -2s"
                                            >
                                                {delay === -2 ? "-2s" : "Delay"}
                                            </button>

                                            {/* 3. Repeat Subtitle 3x */}
                                            <button
                                                type="button"
                                                className={styles.quickPillButton}
                                                onClick={handleRepeatCurrentSubtitle}
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
                                                    className={styles.controlButton}
                                                    onClick={toggleMute}
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
                                                    onChange={handleVolumeChange}
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
                                            onClick={handleSeek}
                                            onTouchStart={handleTouchSeek}
                                            onTouchMove={handleTouchSeek}
                                            onTouchEnd={handleTouchSeek}
                                        >
                                            <div className={styles.seekBar}>
                                                <div className={styles.seekBarProgress} style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>
                                        <div className={styles.timeDuration}>
                                            {formatTime(duration)}
                                        </div>
                                        <button
                                            className={styles.controlButton}
                                            onClick={toggleFullscreen}
                                            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                                            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                                        >
                                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {
                                (selectedSubtitle || videoId) && isFullscreen && (
                                    <div
                                        className={`${styles.innerSubtitlesContainer} ${styles.fullscreenSubtitles} ${!showSubtitles ? styles.hiddenSubtitles : ''}`}
                                    >
                                        <div
                                            className={`${styles.currentSubtitleContainer} ${(isYoutubeSubsLoading || isSearchingSubtitles) ? styles.loading : ''} ${!currentSubtitle ? styles.isEmpty : styles.hasContent}`}
                                            ref={videoWrapperRef}
                                            onMouseUp={(e) => {
                                                e.stopPropagation();
                                                handleTextSelection();
                                            }}
                                            onTouchStart={() => {
                                                if (blurSubtitles) {
                                                    setIsTouchRevealed(true);
                                                }
                                            }}
                                            onTouchEnd={(e) => {
                                                e.stopPropagation();
                                                handleTextSelection();
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
                                            }}
                                        >
                                            {(isYoutubeSubsLoading || isSearchingSubtitles) ? (
                                                <div className={styles.youtubeLoadingPremium}>
                                                    <div className={styles.loadingPulse}></div>
                                                    <span>Loading subtitles...</span>
                                                </div>
                                            ) : (videoId && (!subtitlesForVideo || subtitlesForVideo.length === 0)) ? (
                                                <span className={styles.youtubeLoading}>No subtitles found for this video.</span>
                                            ) : currentSubtitle && (
                                            <>
                                                {activeGrammarPoint && (
                                                    <div className={styles.grammarBadgeContainer}>
                                                        <button
                                                            className={styles.grammarBadge}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                pauseVideo();
                                                                setSelectedGrammarPoint(activeGrammarPoint);
                                                                setSelectedGrammarSentence(currentSubtitle || '');
                                                                setIsGrammarModalOpen(true);
                                                            }}
                                                            title={`Explore grammar: ${activeGrammarPoint.name} (${activeGrammarPoint.cefrLevel})`}
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
                                                    onMouseEnter={() => {
                                                        pauseVideo();
                                                    }}
                                                    onMouseLeave={() => {
                                                        
                                                        const selection = window.getSelection();
                                                        if (!isPopoverOpen && !isLoading && (!selection || selection.toString().trim().length === 0)) {
                                                            playVideo();
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        if (isMobile && blurSubtitles) {
                                                            setIsTouchRevealed(true);
                                                            if (touchRevealTimeoutRef.current) clearTimeout(touchRevealTimeoutRef.current);
                                                            touchRevealTimeoutRef.current = setTimeout(() => {
                                                                setIsTouchRevealed(false);
                                                            }, 3500);
                                                        }
                                                    }}
                                                >
                                                    {renderHighlightedText(formatSubtitleForDisplay(currentSubtitle))}
                                                </p>
                                            </>
                                            )}
                                        </div>
                                    </div>
                                )
                            }
                            {
                                (selectedSubtitle || videoId) && !isFullscreen && (
                                    <div
                                        className={`${styles.innerSubtitlesContainer} ${!showSubtitles ? styles.hiddenSubtitles : ''}`}
                                        style={{
                                            padding: '0 20px',
                                            boxSizing: 'border-box',
                                            overflow: 'visible'
                                        }}
                                    >
                                        <div
                                            className={`${styles.currentSubtitleContainer} ${(isYoutubeSubsLoading || isSearchingSubtitles) ? styles.loading : ''} ${!currentSubtitle ? styles.isEmpty : styles.hasContent}`}
                                            ref={videoWrapperRef}
                                            onMouseUp={(e) => {
                                                e.stopPropagation();
                                                handleTextSelection();
                                            }}
                                            onTouchStart={() => {
                                                if (blurSubtitles) {
                                                    setIsTouchRevealed(true);
                                                }
                                            }}
                                            onTouchEnd={(e) => {
                                                e.stopPropagation();
                                                handleTextSelection();
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
                                            }}
                                        >
                                            {(isYoutubeSubsLoading || isSearchingSubtitles) ? (
                                                <div className={styles.youtubeLoadingPremium}>
                                                    <div className={styles.loadingPulse}></div>
                                                    <span>Loading subtitles...</span>
                                                </div>
                                            ) : (videoId && (!subtitlesForVideo || subtitlesForVideo.length === 0)) ? (
                                                <span className={styles.youtubeLoading}>No subtitles found for this video.</span>
                                            ) : currentSubtitle && (
                                            <>
                                                {activeGrammarPoint && (
                                                    <div className={styles.grammarBadgeContainer}>
                                                        <button
                                                            className={styles.grammarBadge}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                pauseVideo();
                                                                setSelectedGrammarPoint(activeGrammarPoint);
                                                                setSelectedGrammarSentence(currentSubtitle || '');
                                                                setIsGrammarModalOpen(true);
                                                            }}
                                                            title={`Explore grammar: ${activeGrammarPoint.name} (${activeGrammarPoint.cefrLevel})`}
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
                                                    onMouseEnter={() => {
                                                        pauseVideo();
                                                    }}
                                                    onMouseLeave={() => {
                                                        const selection = window.getSelection();
                                                        if (!isPopoverOpen && !isLoading && (!selection || selection.toString().trim().length === 0)) {
                                                            playVideo();
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        if (isMobile && blurSubtitles) {
                                                            setIsTouchRevealed(true);
                                                            if (touchRevealTimeoutRef.current) clearTimeout(touchRevealTimeoutRef.current);
                                                            touchRevealTimeoutRef.current = setTimeout(() => {
                                                                setIsTouchRevealed(false);
                                                            }, 3500);
                                                        }
                                                    }}
                                                >
                                                    {renderHighlightedText(formatSubtitleForDisplay(currentSubtitle))}
                                                </p>
                                            </>
                                            )}
                                        </div>
                                    </div>
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
                                    <div className={styles.subtitleContainer}>
                                        <div className={styles.innerSubtitlesContainer}>
                                            <div className={styles.subtitleSelectionRow}>
                                                {subtitles && subtitles.length > 0 && (
                                                    <div style={{ flexShrink: 0, minWidth: '250px', maxWidth: '350px', width: '100%' }}>
                                                        <SearchableSelect
                                                            options={subtitles}
                                                            value={fileName || ''}
                                                            onChange={(value) => handleSubtitleClick(value)}
                                                            placeholder={intl.formatMessage({ id: 'videoPlayer.selectSubtitles' })}
                                                            noOptionsMessage={intl.formatMessage({ id: 'noSubtitlesFound', defaultMessage: 'No subtitles found' })}
                                                        />
                                                    </div>
                                                )}
                                                <p className={styles.subtitleSectionDescription}>
                                                    {subtitles && subtitles.length > 0
                                                        ? "If you haven't selected subtitles for this video yet, you can search for suitable ones or upload your own."
                                                        : "Automatic subtitle search available! Click 'Search Subtitles' or upload your own .srt file."
                                                    }
                                                </p>
                                                <button
                                                    onClick={() => searchSubtitlesForVideo()}
                                                    className={styles.minimalistButton}
                                                    disabled={isSearchingSubtitles}
                                                >
                                                    {isSearchingSubtitles ? 'Searching...' : 'Search Subtitles'}
                                                </button>
                                                <label htmlFor="subtitle-upload-player" className={styles.minimalistButton}>
                                                    Upload Subtitles
                                                </label>
                                                <input
                                                    id="subtitle-upload-player"
                                                    ref={subtitleInputRef}
                                                    type="file"
                                                    accept=".srt,.vtt"
                                                    onChange={handleSubtitleUploadEvent}
                                                    className="sr-only"
                                                />
                                            </div>
                                        </div>
                                    </div>
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

                {
                    selectionPosition && isPopoverOpen && (translationData.translation || isLoading) && createPortal(
                        <div
                            id="popover-id"
                            className={`${styles.popover} ${styles.glass3d} ${selectionPosition?.showBelow ? styles.popoverBelow : ''} ${selectionPosition?.isConstrained ? styles.popoverConstrained : ''}`}
                            style={{
                                position: 'absolute',
                                left: 0,
                                top: 0,
                                transform: selectionPosition?.showBelow
                                    ? `translate(${isMobile ? window.innerWidth / 2 : selectionPosition!.x}px, ${selectionPosition!.y}px) translate(-50%, 0)`
                                    : `translate(${isMobile ? window.innerWidth / 2 : selectionPosition!.x}px, ${selectionPosition!.y}px) translate(-50%, -100%)`,

                                ...(typeof CSS !== 'undefined' && CSS.supports && CSS.supports('backdrop-filter', 'blur(25px)')
                                    ? {
                                        backdropFilter: 'blur(25px)',
                                        WebkitBackdropFilter: 'blur(25px)'
                                    }
                                    : {
                                        background: 'rgba(22, 22, 28, 0.6)'
                                    }),
                                zIndex: 1001,
                                ...(selectionPosition?.maxHeight ? { maxHeight: `${selectionPosition.maxHeight}px` } : {})
                            }}
                            onMouseEnter={() => {
                                pauseVideo();
                            }}
                        >
                            <div className={styles.popoverArrow}></div>
                            <div className={styles.popoverContent}>
                                <div className={styles.selectedTextRow}>
                                    <h3 className={styles.selectedText}>{selectedText}</h3>
                                    {(() => {
                                        const currentTranscription = translationData.transcription;
                                        if (currentTranscription) {
                                            return <span className={styles.transcription}>[/{currentTranscription}/]</span>;
                                        }
                                        return null;
                                    })()}
                                </div>

                                {isLoading && (
                                    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                                        <div className={styles.loader}>
                                            <p className={styles['loader-text']}>Loading</p>
                                            <div className={styles.load}></div>
                                        </div>
                                    </div>
                                )}

                                <div className={styles.popoverBody}>
                                    <div className={styles.popoverBodyText}>
                                        {translationData.definition ? (
                                            <div className={styles.definitionRow}>
                                                <span
                                                    className={`${styles.translationText} ${(translationData.translation?.includes('could not translate') || translationData.translation?.includes('Error fetching translation')) ? styles.errorText : ''}`}>
                                                    {translationData.definition}
                                                    {translationData.translation?.trim() && (
                                                        <span style={{ opacity: 0.5, fontSize: '0.9em' }}><br/>({translationData.translation})</span>
                                                    )}
                                                </span>
                                            </div>
                                        ) : (
                                            translationData.translation?.trim() && (
                                                <div className={styles.translationRow}>
                                                    <span
                                                        className={`${styles.translationText} ${(translationData.translation?.includes('could not translate') || translationData.translation?.includes('Error fetching translation')) ? styles.errorText : ''}`}>{translationData.translation}</span>
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {translationData.imageUrl && translationData.showImage && (
                                        <div className={styles.popoverBodyImage} style={{ position: 'relative' }}>
                                            <img
                                                src={translationData.imageUrl}
                                                alt="Visual reference"
                                                className={styles.translationImage}
                                            />
                                            <button
                                                className={styles.imageCloseButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setTranslationData(prev => ({ ...prev, showImage: false }));
                                                }}
                                                title="Remove image"
                                                aria-label="Remove image"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {(() => {
                                    const data = {
                                        translation: translationData.translation,
                                        hint: translationData.hint,
                                        examples: translationData.examples,
                                        synonyms: translationData.synonyms,
                                        otherMeanings: translationData.otherMeanings,
                                        collocations: translationData.collocations,
                                        recommendedSelections: translationData.recommendedSelections,
                                        register: translationData.register,
                                        usageNote: translationData.usageNote,
                                        alternatives: translationData.alternatives,
                                        chunks: translationData.chunks,
                                        typicalContexts: translationData.typicalContexts,
                                    };

                                    const matchingSelections = (data.recommendedSelections || []).filter(
                                        rec => selectedSentence?.toLowerCase().includes(rec.toLowerCase())
                                    );
                                    const bestMatch = matchingSelections.sort((a, b) => b.length - a.length)[0];

                                    return (
                                        <>
                                            {/* Register badge + Part of Speech */}
                                            {(data.register || translationData.partOfSpeech) && (
                                                <div className={styles.registerRow}>
                                                    {translationData.partOfSpeech && (
                                                        <span className={styles.posTag}>{translationData.partOfSpeech}</span>
                                                    )}
                                                    {data.register && (
                                                        <span className={`${styles.registerBadge} ${styles[`register_${data.register}`] || ''}`}>
                                                            {data.register}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Usage Note — WHY this word is used here */}
                                            {data.usageNote && (
                                                <div className={styles.usageNoteSection}>
                                                    <MessageCircle size={13} className={styles.usageNoteIcon} />
                                                    <span className={styles.usageNoteText}>{data.usageNote}</span>
                                                </div>
                                            )}

                                            {bestMatch && (
                                                <div className={styles.aiHintBox}>
                                                    <span className={styles.aiHintIcon}><Lightbulb size={16} className="text-primary" /></span>
                                                    <span className={styles.aiHintText}>{bestMatch}</span>
                                                </div>
                                            )}

                                            {data.examples && data.examples.length > 0 && (
                                                <div className={styles.exampleContainer}>
                                                    <div className={styles.exampleLabel}>Examples</div>
                                                    <div className={styles.exampleList}>
                                                        {data.examples.slice(0, 2).map((example, idx) => (
                                                            <div key={idx} className={styles.exampleItem}>
                                                                {example}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Chunks — multi-word units (collocations, phrasal verbs, idioms) */}
                                            {data.chunks && data.chunks.length > 0 && (
                                                <div className={styles.chunksSection}>
                                                    <div className={styles.sectionHeader}>
                                                        <Layers size={13} className={styles.sectionHeaderIcon} />
                                                        <span>Chunks</span>
                                                    </div>
                                                    <div className={styles.chunksList}>
                                                        {data.chunks.slice(0, 4).map((chunk, idx) => (
                                                            <span
                                                                key={idx}
                                                                className={`${styles.tagChip} ${styles.chunkChip}`}
                                                                onClick={() => {
                                                                    // Re-translate the full chunk
                                                                    if (selectedSentence) {
                                                                        setSelectedText(chunk);
                                                                        setIsLoading(true);
                                                                        const extendedCtx = getExtendedSubtitleContext();
                                                                        fetchTranslation(chunk, selectedSentence, false, extendedCtx);
                                                                    }
                                                                }}
                                                                title={`Translate "${chunk}" as a unit`}
                                                            >
                                                                {chunk}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Alternatives — synonyms with register labels */}
                                            {data.alternatives && data.alternatives.length > 0 && (
                                                <div className={styles.alternativesSection}>
                                                    <div className={styles.sectionHeader}>
                                                        <BookOpen size={13} className={styles.sectionHeaderIcon} />
                                                        <span>Alternatives</span>
                                                    </div>
                                                    <div className={styles.alternativesList}>
                                                        {data.alternatives.slice(0, 3).map((alt, idx) => (
                                                            <div key={idx} className={styles.alternativeItem}>
                                                                <span className={styles.alternativeText}>{alt.text}</span>
                                                                {alt.register && (
                                                                    <span className={`${styles.registerBadgeSm} ${styles[`register_${alt.register}`] || ''}`}>
                                                                        {alt.register}
                                                                    </span>
                                                                )}
                                                                {alt.usageNote && (
                                                                    <span className={styles.alternativeNote}>{alt.usageNote}</span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className={styles.tagGroup}>
                                                {data.synonyms && data.synonyms.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                        <span className={styles.tagLabel}>Syn:</span>
                                                        {data.synonyms.slice(0, 3).map((syn, idx) => (
                                                            <span key={idx} className={styles.tagChip}>{syn}</span>
                                                        ))}
                                                    </div>
                                                )}

                                                {data.otherMeanings && data.otherMeanings.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                        <span className={styles.tagLabel}>Also:</span>
                                                        {data.otherMeanings.slice(0, 3).map((meaning, idx) => (
                                                            <span
                                                                key={idx}
                                                                className={`${styles.tagChip} ${styles.tagChipContrast} ${styles.tagChipInteractive}`}
                                                                onClick={() => setTranslationData(prev => ({ ...prev, translation: meaning }))}
                                                            >
                                                                {meaning}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {data.collocations && data.collocations.length > 0 && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                        <span className={styles.tagLabel}>Use with:</span>
                                                        {data.collocations.slice(0, 3).map((collocation, idx) => (
                                                            <span key={idx} className={`${styles.tagChip} ${styles.tagChipContrast}`}>{collocation}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Typical Contexts — where this word is commonly used */}
                                            {data.typicalContexts && data.typicalContexts.length > 0 && (
                                                <div className={styles.typicalContextsSection}>
                                                    <span className={styles.typicalContextsLabel}>Common in:</span>
                                                    {data.typicalContexts.slice(0, 3).map((ctx, idx) => (
                                                        <span key={idx} className={styles.typicalContextTag}>{ctx}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}

                                <div className={styles.popoverActions}>
                                    <div className={styles.actionButtons}>
                                        {showSubmitButton &&
                                            !(translationData.translation && translationData.translation.includes('You have reached your free limit of 100 translations')) && (
                                                <button
                                                    onClick={saveToDict}
                                                    className={styles.saveButton}
                                                    title="Add to dictionary"
                                                >
                                                    <span>SAVE</span>
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                        <polyline points="7 3 7 8 15 8"></polyline>
                                                    </svg>
                                                </button>
                                            )}
                                        {isAdmin && selectedText && (
                                            <button
                                                onClick={() => {
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
                                                className={styles.reelButton}
                                                title="Generate 9:16 Reel / TikTok"
                                            >
                                                <span className="flex items-center gap-1.5"><Smartphone size={14} /> REEL</span>
                                            </button>
                                        )}
                                        {
                                            (showSubscribeButton || translationData.translation?.startsWith("You have reached")) && (
                                                <button
                                                    className={styles.iconButton}
                                                    style={{ color: '#D4AF37', background: 'rgba(255, 215, 0, 0.1)' }}
                                                    onClick={() => {
                                                        window.location.href = "/subscribe";
                                                    }}
                                                    aria-label={intl.formatMessage({
                                                        id: "subscribeNow",
                                                        defaultMessage: "Subscribe"
                                                    })}
                                                    title={intl.formatMessage({
                                                        id: "subscribeNow",
                                                        defaultMessage: "Subscribe"
                                                    })}
                                                >
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                                    </svg>
                                                </button>
                                            )
                                        }
                                        <button
                                            className={styles.closeButton}
                                            onClick={() => {
                                                setIsPopoverOpen(false);
                                                resetPopoverState();
                                            }}
                                            aria-label="Close translation"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        ,
                        document.fullscreenElement || document.body
                    )
                }

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

                <SubtitleSearchModal
                    isOpen={showSubtitleSearchModal}
                    onClose={() => setShowSubtitleSearchModal(false)}
                    subtitles={availableSubtitles}
                    onSelectSubtitle={handleSelectSubtitleFromSearch}
                    onQuickTest={handleQuickTest}
                    isLoading={isSearchingSubtitles}
                    onSearchDifferentTitle={() => {
                        setShowSubtitleSearchModal(false);
                        setShowFilmSelection(true);
                    }}
                />

                <FilmSelectionModal
                    isOpen={showFilmSelection}
                    onClose={() => setShowFilmSelection(false)}
                    films={availableFilms}
                    onSelectFilm={handleSelectFilmForSubtitles}
                    isLoading={isSearchingSubtitles}
                    searchQuery={searchQueryForFilms}
                    onSearchAgain={searchSubtitlesForVideo}
                />

                {isReelModalOpen && reelModalData && (
                    <ReelGeneratorModal
                        isOpen={isReelModalOpen}
                        onClose={() => setIsReelModalOpen(false)}
                        word={reelModalData.word}
                        translation={reelModalData.translation}
                        transcription={reelModalData.transcription}
                        sentence={reelModalData.sentence}
                        startSec={reelModalData.startSec}
                        endSec={reelModalData.endSec}
                        videoSource={videoId ? null : (videoRef.current?.src || (videoUrl && !videoUrl.includes('youtube') && !videoUrl.includes('youtu.be') ? videoUrl : null))}
                        youtubeVideoId={videoId || (videoUrl?.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1] ?? null)}
                        movieTitle={getResourceName().replace(/^yt:/, '')}
                    />
                )}

                <GrammarSpotlightModal
                    isOpen={isGrammarModalOpen}
                    onClose={() => {
                        setIsGrammarModalOpen(false);
                        setSelectedGrammarSentence('');
                    }}
                    grammarPoint={selectedGrammarPoint}
                    fullSentence={selectedGrammarSentence || currentSubtitle || ''}
                    learningLanguage={learningLanguage}
                    fluentLanguage={fluentLanguage || undefined}
                />

                <VideoGrammarIndexModal
                    isOpen={isGrammarIndexOpen}
                    onClose={() => setIsGrammarIndexOpen(false)}
                    grammarMatches={videoGrammarMatches}
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
                />

                {!isMobile && (
                    <LessonStudioModal
                        isOpen={isLessonStudioOpen}
                        onClose={() => setIsLessonStudioOpen(false)}
                        videoTitle={selectedSubtitle || videoId || "English Video Lesson"}
                        mediaSource={videoId ? "youtube" : "upload"}
                        youtubeId={videoId || ""}
                        subtitles={Array.isArray(subtitlesForVideo) ? subtitlesForVideo.map(s => ({
                            start: s.startTimeMs / 1000,
                            end: s.endTimeMs / 1000,
                            text: s.text,
                        })) : []}
                        learningLanguage={learningLanguage}
                        onSeekToTime={(timeSec) => {
                            if (videoRef.current) {
                                videoRef.current.currentTime = Math.max(0, timeSec);
                            }
                            if (youtubePlayerRef.current) {
                                youtubePlayerRef.current.seekTo(Math.max(0, timeSec), true);
                            }
                        }}
                    />
                )}
            </div>
        </>
    );
};

export default VideoPlayer;