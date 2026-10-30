import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SubtitleService, SubDLSubtitle } from '../../../services/SubtitleService';
import { cleanSubtitleText } from '../../../utils/subtitleCleaner';
import { stitchSubtitleSentences } from '../../../utils/subtitleSentenceStitcher';
import { extractVideoNameFromUrl, formatSrtTimestamp } from '../utils/subtitleSearchUtils';
import { parseSRT } from '../../../utils/srtParser';
import { debugLog, debugError } from '../../../utils/debug';
import { Subtitle } from '../types';

export interface UseVideoSubtitlesParams {
    videoUrl: string;
    videoId: string | null;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    youtubePlayerRef: React.MutableRefObject<any>;
    duration: number;
    setCurrentTime: (time: number) => void;
    setProgress: (progress: number) => void;
    isOnboardingMode?: boolean;
    onSubtitleSelect?: () => void;
    onSubtitleUpload?: (file: File) => void;
    showNotification: (message: string) => void;
    fetchDictionaryItemsForCards: (resourceId?: string, force?: boolean) => Promise<void>;
}

export const useVideoSubtitles = ({
    videoUrl,
    videoId,
    videoRef,
    youtubePlayerRef,
    duration,
    setCurrentTime,
    setProgress,
    isOnboardingMode = false,
    onSubtitleSelect,
    onSubtitleUpload,
    showNotification,
    fetchDictionaryItemsForCards,
}: UseVideoSubtitlesParams) => {
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

    const [fileName, setFileName] = useState<string>('');
    const [videoFileName, setVideoFileName] = useState<string>('');
    const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
    const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);
    const [delay, setDelay] = useState<number>(0);
    const [showSubtitles, setShowSubtitles] = useState(true);
    const [blurSubtitles, setBlurSubtitles] = useState<boolean>(true);
    const effectiveBlur = isOnboardingMode ? false : blurSubtitles;
    const effectiveDelay = isOnboardingMode ? 0 : delay;
    const [isYoutubeSubsLoading, setIsYoutubeSubsLoading] = useState(false);
    const subtitleInputRef = useRef<HTMLInputElement>(null);

    const handleDelayChange = useCallback((newDelay: number) => {
        setDelay(newDelay);
    }, []);

    const getResourceName = useCallback((): string => {
        if (videoId) {
            return `yt:${videoId}`;
        }
        if (videoFileName) {
            const cleaned = videoFileName.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '.srt');
            return cleaned;
        }
        return fileName || '';
    }, [videoId, videoFileName, fileName]);

    const handleSubtitleClick = useCallback(async (subtitleName: string) => {
        try {
            sessionStorage.setItem('subtitleName', subtitleName);

            // Fast-path: reuse cached subtitles if exact file is already in sessionStorage
            let data: unknown[] | null = null;
            const cachedName = sessionStorage.getItem('cachedSubtitleName');
            const cachedRaw = sessionStorage.getItem('videoSubtitles');
            if (cachedName === subtitleName && cachedRaw) {
                try {
                    const parsed = JSON.parse(cachedRaw);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        data = parsed;
                    }
                } catch {
                    // fallback to network fetch
                }
            }

            if (!data) {
                data = await SubtitleService.fetchSubtitlesForVideo(subtitleName);
                sessionStorage.setItem('cachedSubtitleName', subtitleName);
            }

            const sanitized = sanitizeSubtitles(data);
            setSubtitlesForVideo(sanitized);
            sessionStorage.setItem('videoSubtitles', JSON.stringify(sanitized || data));

            if (Array.isArray(data) && data.length > 0) {
                setFileName((data[0] as any).name);
            }

            if (typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function') {
                setSelectedSubtitle(URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'text/vtt' })));
            }

            await fetchDictionaryItemsForCards();

            if (onSubtitleSelect) {
                onSubtitleSelect();
            }
        } catch (error) {
            debugError('Error loading subtitles:', error);
        }
    }, [sanitizeSubtitles, fetchDictionaryItemsForCards, onSubtitleSelect]);

    // YouTube 100ms interval for progress and time tracking
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (videoId && youtubePlayerRef.current) {
            interval = setInterval(() => {
                try {
                    if (youtubePlayerRef.current && typeof youtubePlayerRef.current.unloadModule === 'function') {
                        youtubePlayerRef.current.unloadModule("captions");
                    }
                } catch {}

                if (youtubePlayerRef.current && typeof youtubePlayerRef.current.getCurrentTime === 'function') {
                    const currentTime = youtubePlayerRef.current.getCurrentTime();
                    const durationVal = youtubePlayerRef.current.getDuration ? youtubePlayerRef.current.getDuration() : duration;
                    if (durationVal) {
                        setCurrentTime(currentTime);
                        setProgress((currentTime / durationVal) * 100);
                        sessionStorage.setItem('videoCurrentTime', currentTime.toString());
                    }
                }
            }, 100);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [videoId, youtubePlayerRef, duration, setCurrentTime, setProgress]);

    // Extract video filename
    useEffect(() => {
        if (videoId) return;

        let vName = sessionStorage.getItem('videoFileName');
        if (!vName && videoUrl) {
            vName = extractVideoNameFromUrl(videoUrl);
        }
        if (vName) {
            setVideoFileName(vName);
        }
    }, [videoUrl, videoId]);

    // Auto-fetch YouTube subtitles
    useEffect(() => {
        const fetchYoutubeSubtitles = async (id: string) => {
            try {
                setIsYoutubeSubsLoading(true);
                const data = await SubtitleService.fetchSubtitlesForYoutube(id);
                const sanitized = sanitizeSubtitles(data);
                setSubtitlesForVideo(sanitized);
                sessionStorage.setItem('videoSubtitles', JSON.stringify(sanitized || data));
                if (Array.isArray(data) && data.length > 0) {
                    setFileName((data[0] as any).name || id);
                    sessionStorage.setItem('subtitleName', (data[0] as any).name || id);
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
            const storedSubtitleName = sessionStorage.getItem('subtitleName');
            const storedVideoUrl = sessionStorage.getItem('videoUrl');

            const isSameVideo = storedVideoUrl === videoUrl;

            if (storedSubs && storedSubtitleName && isSameVideo) {
                const data = JSON.parse(storedSubs);
                setSubtitlesForVideo(sanitizeSubtitles(data));

                if (Array.isArray(data) && data.length > 0) {
                    setFileName((data[0] as any).name || videoId);
                    if (typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function') {
                        setSelectedSubtitle(URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'text/vtt' })));
                    }
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
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId]);

    // Embedded / local subtitles event listener
    useEffect(() => {
        const handleLocalSubtitlesLoaded = async (event: Event) => {
            const customEvent = event as CustomEvent<SubDLSubtitle[]>;
            const subtitles = customEvent.detail;
            if (subtitles && subtitles.length > 0) {
                const firstSub = subtitles[0];
                try {
                    debugLog('Auto-loading embedded subtitle:', firstSub.name);
                    const text = await SubtitleService.fetchSubtitleFileContent(firstSub.url);
                    const parsed = parseSRT(text, firstSub.name);

                    setSubtitlesForVideo(sanitizeSubtitles(parsed));
                    setFileName(firstSub.name);
                    sessionStorage.setItem('subtitleName', firstSub.name);
                    sessionStorage.setItem('videoSubtitles', JSON.stringify(parsed));

                    const vttContent = 'WEBVTT\n\n' + parsed.map((s, i) => {
                        return `${i + 1}\n${formatSrtTimestamp(s.startTimeMs)} --> ${formatSrtTimestamp(s.endTimeMs)}\n${s.text}\n`;
                    }).join('\n');

                    if (typeof window !== 'undefined' && window.URL && typeof window.URL.createObjectURL === 'function') {
                        const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
                        setSelectedSubtitle(URL.createObjectURL(vttBlob));
                    }

                    debugLog(`Loaded embedded subtitles: ${firstSub.name}`);
                } catch (err) {
                    debugError('Failed to load embedded subtitle:', err);
                }
            }
        };

        window.addEventListener('localSubtitlesLoaded', handleLocalSubtitlesLoaded as EventListener);
        return () => window.removeEventListener('localSubtitlesLoaded', handleLocalSubtitlesLoaded as EventListener);
    }, [sanitizeSubtitles]);

    // Subtitle synchronization tick
    const updateSubtitles = useCallback(async () => {
        let currentTime = 0;
        if (videoId && youtubePlayerRef.current) {
            currentTime = await youtubePlayerRef.current.getCurrentTime();
        } else if (videoRef.current) {
            currentTime = videoRef.current.currentTime;
        }

        if (Array.isArray(subtitlesForVideo) && subtitlesForVideo.length > 0) {
            const delayedTime = (currentTime + effectiveDelay) * 1000;
            const subtitle = subtitlesForVideo.find(
                (sub) => delayedTime >= sub.startTimeMs && delayedTime <= sub.endTimeMs
            );
            setCurrentSubtitle(subtitle ? subtitle.text : null);
        }
    }, [videoId, youtubePlayerRef, videoRef, subtitlesForVideo, effectiveDelay]);

    useEffect(() => {
        const intervalId = setInterval(updateSubtitles, 100);
        return () => clearInterval(intervalId);
    }, [updateSubtitles]);

    const handleSubtitleUploadEvent = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && onSubtitleUpload) {
            onSubtitleUpload(file);
            if (subtitleInputRef.current) {
                subtitleInputRef.current.value = '';
            }
        }
    }, [onSubtitleUpload]);

    return {
        subtitlesForVideo,
        setSubtitlesForVideo,
        currentSubtitle,
        setCurrentSubtitle,
        selectedSubtitle,
        setSelectedSubtitle,
        fileName,
        setFileName,
        videoFileName,
        setVideoFileName,
        delay,
        setDelay,
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
    };
};
