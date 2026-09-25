import { useState, useCallback } from 'react';
import {
    SubtitleService,
    SubDLSubtitle,
    SubDLSearchResult,
    SubtitleWithScore,
} from '../../../services/SubtitleService';
import { parseSRT } from '../../../utils/srtParser';
import { debugError } from '../../../utils/debug';
import {
    extractVideoNameFromUrl,
    cleanSearchTitle,
    formatSrtTimestamp,
    buildSubtitleFileName,
    processSubtitlesWithSyncScore,
    executeSubDLSearch,
} from '../utils/subtitleSearchUtils';

export interface UseSubtitleSearchParams {
    videoId: string | null;
    videoUrl: string;
    learningLanguage: string;
    videoRef: React.RefObject<HTMLVideoElement>;
    duration: number;
    subtitlesForVideo: any[] | null;
    setSubtitlesForVideo: (subs: any[] | null) => void;
    setFileName: (name: string) => void;
    setSelectedSubtitle: (url: string | null) => void;
    sanitizeSubtitles: (subs: any[] | null) => any[] | null;
    onSubtitleUpload: (file: File) => Promise<void> | void;
    showNotification: (msg: string) => void;
}

export interface UseSubtitleSearchResult {
    isSearchingSubtitles: boolean;
    showSubtitleSearchModal: boolean;
    setShowSubtitleSearchModal: React.Dispatch<React.SetStateAction<boolean>>;
    showFilmSelection: boolean;
    setShowFilmSelection: React.Dispatch<React.SetStateAction<boolean>>;
    availableSubtitles: SubtitleWithScore[];
    availableFilms: SubDLSearchResult[];
    searchQueryForFilms: string;
    isTemporarySubtitles: boolean;
    temporarySubtitleInfo: SubtitleWithScore | null;
    searchSubtitlesForVideo: (customQuery?: string | React.MouseEvent) => Promise<void>;
    handleSelectFilmForSubtitles: (film: SubDLSearchResult) => Promise<void>;
    handleQuickTest: (subtitle: SubtitleWithScore) => Promise<void>;
    handleKeepTemporarySubtitles: () => Promise<void>;
    handleDiscardTemporarySubtitles: () => void;
    handleSelectSubtitleFromSearch: (subtitle: SubDLSubtitle) => Promise<void>;
}

export const useSubtitleSearch = ({
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
}: UseSubtitleSearchParams): UseSubtitleSearchResult => {
    const [isSearchingSubtitles, setIsSearchingSubtitles] = useState(false);
    const [showSubtitleSearchModal, setShowSubtitleSearchModal] = useState(false);
    const [showFilmSelection, setShowFilmSelection] = useState(false);
    const [availableSubtitles, setAvailableSubtitles] = useState<SubtitleWithScore[]>([]);
    const [availableFilms, setAvailableFilms] = useState<SubDLSearchResult[]>([]);
    const [searchQueryForFilms, setSearchQueryForFilms] = useState('');
    const [isTemporarySubtitles, setIsTemporarySubtitles] = useState(false);
    const [temporarySubtitleInfo, setTemporarySubtitleInfo] = useState<SubtitleWithScore | null>(null);

    const [currentSearchParams, setCurrentSearchParams] = useState<{
        languages: string;
        type: 'movie' | 'tv';
        seasonNumber?: number;
        episodeNumber?: number;
    } | null>(null);

    const searchSubtitlesForVideo = useCallback(async (customQuery?: string | React.MouseEvent) => {
        if (videoId) return;

        const queryStr = typeof customQuery === 'string' ? customQuery.trim() : undefined;
        let videoName = queryStr || sessionStorage.getItem('videoFileName') || extractVideoNameFromUrl(videoUrl);

        if ((!videoName || videoName.toLowerCase() === 'google drive video') && !queryStr) {
            setSearchQueryForFilms('');
            setAvailableFilms([]);
            setShowFilmSelection(true);
            showNotification('Please enter the movie or series title to find subtitles.');
            return;
        }

        if (!videoName) {
            showNotification('Please click "Select another video" and upload the video again to enable automatic subtitle search.');
            return;
        }

        if (queryStr) {
            sessionStorage.setItem('videoFileName', queryStr);
        }

        const { targetTitle, extractedYear, seasonNumber, episodeNumber, episodeMatch, seriesName, cleanedVideoName } = cleanSearchTitle(videoName);

        setIsSearchingSubtitles(true);
        try {
            const languageSet = new Set<string>(['EN']);
            if (learningLanguage && learningLanguage.toUpperCase() !== 'EN') {
                languageSet.add(learningLanguage.toUpperCase());
            }
            const languages = Array.from(languageSet).join(',');

            setCurrentSearchParams({ languages, type: episodeMatch ? 'tv' : 'movie', seasonNumber, episodeNumber });
            setSearchQueryForFilms(targetTitle);

            let response = await executeSubDLSearch({
                targetTitle,
                languages,
                type: episodeMatch ? 'tv' : 'movie',
                seasonNumber,
                episodeNumber,
                year: extractedYear,
            });

            if (response.results && response.results.length > 1) {
                const firstResult = response.results[0];
                const isYearMatch = !extractedYear || firstResult.year === extractedYear;
                const isNameMatch = firstResult.name.toLowerCase() === targetTitle.toLowerCase() || firstResult.name.toLowerCase() === cleanedVideoName.toLowerCase();

                if (!isYearMatch || !isNameMatch) {
                    setAvailableFilms(response.results);
                    setShowSubtitleSearchModal(false);
                    setShowFilmSelection(true);
                    showNotification(`Found ${response.results.length} matching titles. Please select the correct one.`);
                    return;
                }
            }

            if ((!response.subtitles || response.subtitles.length === 0) && episodeMatch) {
                showNotification(`No exact match. Searching all "${seriesName}" subtitles...`);
                response = await SubtitleService.searchSubtitlesSubDL(seriesName, languages, 'tv');
            }

            if ((!response.subtitles || response.subtitles.length === 0) && !episodeMatch) {
                const nameWithoutYear = seriesName.replace(/\s+\d{4}\s*$/i, '').trim();
                if (nameWithoutYear !== seriesName && nameWithoutYear.length > 0) {
                    showNotification(`Searching for "${nameWithoutYear}" (without year)...`);
                    response = await SubtitleService.searchSubtitlesSubDL(nameWithoutYear, languages, 'movie');
                }
            }

            if (Array.isArray(response.subtitles) && response.subtitles.length > 0) {
                let videoDuration = videoRef.current?.duration || duration || 0;
                if (videoDuration === 0 && videoRef.current) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    videoDuration = videoRef.current?.duration || 0;
                }

                const videoFileName = sessionStorage.getItem('videoFileName') || cleanedVideoName;
                const { scoredSubtitles, bestScore } = processSubtitlesWithSyncScore(response.subtitles, videoDuration, videoFileName);

                if (bestScore >= 40) {
                    showNotification(`Found ${scoredSubtitles.length} subtitles. Use Quick Test to check sync.`);
                } else {
                    showNotification(`Found ${scoredSubtitles.length} subtitles. Sorted by ratings. Test manually.`);
                }

                setShowFilmSelection(false);
                setAvailableSubtitles(scoredSubtitles);
                setShowSubtitleSearchModal(true);
            } else {
                const looksLikeSeries = /\b(season|series|episode|s\d{1,2}|e\d{1,2})\b/i.test(cleanedVideoName);
                showNotification(
                    !episodeMatch && looksLikeSeries
                        ? `No subtitles found for "${cleanedVideoName}". For TV series, rename file to include S01E01 format (e.g., "Show.Name.S01E01.720p.mkv")`
                        : `No subtitles found for "${cleanedVideoName}". Try searching with another title.`
                );
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
    }, [videoId, videoUrl, learningLanguage, videoRef, duration, showNotification]);

    const handleSelectFilmForSubtitles = useCallback(async (film: SubDLSearchResult) => {
        setShowFilmSelection(false);
        setIsSearchingSubtitles(true);

        try {
            sessionStorage.setItem('videoFileName', film.name);
            const response = await executeSubDLSearch({
                targetTitle: film.name,
                languages: currentSearchParams?.languages || 'EN',
                type: currentSearchParams?.type || 'movie',
                seasonNumber: currentSearchParams?.seasonNumber,
                episodeNumber: currentSearchParams?.episodeNumber,
                imdbId: film.imdbId || undefined,
                tmdbId: film.tmdbId ? String(film.tmdbId) : undefined,
                sdId: film.sdId,
                year: film.year,
            });

            if (response.subtitles && response.subtitles.length > 0) {
                let videoDuration = videoRef.current?.duration || duration || 0;
                if (videoDuration === 0 && videoRef.current) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    videoDuration = videoRef.current?.duration || 0;
                }

                const videoFileName = sessionStorage.getItem('videoFileName') || film.name;
                const { scoredSubtitles, bestScore } = processSubtitlesWithSyncScore(response.subtitles, videoDuration, videoFileName);

                showNotification(bestScore >= 40 ? `Found ${scoredSubtitles.length} subtitles for "${film.name}".` : `Found ${scoredSubtitles.length} subtitles. Sorted by ratings.`);
                setAvailableSubtitles(scoredSubtitles);
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
    }, [currentSearchParams, videoRef, duration, showNotification]);

    const handleQuickTest = useCallback(async (subtitle: SubtitleWithScore) => {
        try {
            setShowSubtitleSearchModal(false);
            showNotification('Downloading subtitle for test...');

            const subtitleContent = await SubtitleService.downloadSubtitleFromSubDL(subtitle);
            const parsedSubtitles = parseSRT(subtitleContent, subtitle.name);

            setSubtitlesForVideo(sanitizeSubtitles(parsedSubtitles));
            setFileName(subtitle.releaseName || subtitle.name);
            setSelectedSubtitle('quick-test');
            setIsTemporarySubtitles(true);
            setTemporarySubtitleInfo(subtitle);

            setTimeout(() => showNotification(''), 1500);
        } catch (error) {
            debugError('Error quick testing subtitle:', error);
            showNotification('Failed to test subtitles');
            setIsTemporarySubtitles(false);
            setTemporarySubtitleInfo(null);
        }
    }, [sanitizeSubtitles, setFileName, setSelectedSubtitle, setSubtitlesForVideo, showNotification]);

    const handleKeepTemporarySubtitles = useCallback(async () => {
        if (!temporarySubtitleInfo || !subtitlesForVideo) return;

        try {
            showNotification('Saving subtitles...');
            const srtContent = (Array.isArray(subtitlesForVideo) ? subtitlesForVideo : []).map((sub, index) => {
                return `${index + 1}\n${formatSrtTimestamp(sub.startTimeMs)} --> ${formatSrtTimestamp(sub.endTimeMs)}\n${sub.text}\n`;
            }).join('\n');

            const baseName = sessionStorage.getItem('videoFileName') || temporarySubtitleInfo.name;
            const file = new File([new Blob([srtContent], { type: 'text/plain' })], buildSubtitleFileName(baseName), { type: 'text/plain' });

            await onSubtitleUpload(file);
            setIsTemporarySubtitles(false);
            setTemporarySubtitleInfo(null);
            showNotification('Subtitles saved!');
        } catch (error) {
            debugError('Error keeping subtitles:', error);
            showNotification('Failed to save subtitles');
        }
    }, [temporarySubtitleInfo, subtitlesForVideo, onSubtitleUpload, showNotification]);

    const handleDiscardTemporarySubtitles = useCallback(() => {
        setSubtitlesForVideo(null);
        setSelectedSubtitle(null);
        setIsTemporarySubtitles(false);
        setTemporarySubtitleInfo(null);
        setFileName('');
        showNotification('Subtitles discarded. Trying another...');
        setTimeout(() => setShowSubtitleSearchModal(true), 500);
    }, [setFileName, setSelectedSubtitle, setSubtitlesForVideo, showNotification]);

    const handleSelectSubtitleFromSearch = useCallback(async (subtitle: SubDLSubtitle) => {
        try {
            setShowSubtitleSearchModal(false);
            showNotification('Downloading subtitles...');

            const subtitleContent = await SubtitleService.downloadSubtitleFromSubDL(subtitle);
            const baseName = sessionStorage.getItem('videoFileName') || subtitle.name;
            const file = new File([new Blob([subtitleContent], { type: 'text/plain' })], buildSubtitleFileName(baseName), { type: 'text/plain' });

            await onSubtitleUpload(file);
            showNotification('Subtitles loaded successfully');
        } catch (error) {
            debugError('Error loading subtitle:', error);
            showNotification('Failed to load subtitles');
        }
    }, [onSubtitleUpload, showNotification]);

    return {
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
    };
};
