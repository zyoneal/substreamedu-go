import { extractMovieYear } from '../../../utils/videoNameUtils';
import {
    SubtitleService,
    SubDLSubtitle,
    SubtitleWithScore,
    calculateSyncScore,
} from '../../../services/SubtitleService';

export interface CleanSearchTitleResult {
    targetTitle: string;
    extractedYear?: number;
    seasonNumber?: number;
    episodeNumber?: number;
    episodeMatch: boolean;
    seriesName: string;
    cleanTitleWithoutYear: string;
    cleanedVideoName: string;
}

/**
 * Extracts a human-readable video name from URL or fallback stored name.
 */
export const extractVideoNameFromUrl = (url: string, storedFileName?: string | null): string => {
    if (!url) return '';

    if (url.startsWith('blob:')) {
        return storedFileName || '';
    }

    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    const decodedFilename = decodeURIComponent(filename);

    const nameWithoutExtension = decodedFilename.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '');

    return nameWithoutExtension
        .replace(/[._-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

/**
 * Normalizes title, extracts year and season/episode info for SubDL query matching.
 */
export const cleanSearchTitle = (rawName: string): CleanSearchTitleResult => {
    let videoName = rawName
        .replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '')
        .replace(/[._-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Remove quality/codec info after episode number for better search
    videoName = videoName.replace(/(\s+s\d{1,2}e\d{1,2})\s+.*$/i, '$1');

    const movieYearInfo = extractMovieYear(videoName);
    const extractedYear = movieYearInfo.year;
    const cleanTitleWithoutYear = movieYearInfo.hasYear ? movieYearInfo.cleanTitle : videoName;

    let seasonNumber: number | undefined;
    let episodeNumber: number | undefined;
    let seriesName = cleanTitleWithoutYear;

    const episodeMatch = videoName.match(/\bs(\d{1,2})e(\d{1,2})\b/i);
    if (episodeMatch) {
        seasonNumber = parseInt(episodeMatch[1], 10);
        episodeNumber = parseInt(episodeMatch[2], 10);
        seriesName = videoName.replace(/\s+s\d{1,2}e\d{1,2}.*$/i, '').trim();
    }

    const targetTitle = seriesName || cleanTitleWithoutYear || videoName;

    return {
        targetTitle,
        extractedYear,
        seasonNumber,
        episodeNumber,
        episodeMatch: Boolean(episodeMatch),
        seriesName,
        cleanTitleWithoutYear,
        cleanedVideoName: videoName,
    };
};

/**
 * Formats milliseconds into standard SRT timestamp HH:MM:SS,mmm.
 */
export const formatSrtTimestamp = (ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')},${String(milliseconds).padStart(3, '0')}`;
};

/**
 * Builds a clean, capped .srt filename from a base video/subtitle name.
 */
export const buildSubtitleFileName = (baseName: string): string => {
    let cleanFileName = baseName.replace(/\.(mp4|mkv|avi|mov|wmv|flv|webm)$/i, '');

    cleanFileName = cleanFileName
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');

    const maxLength = 46;
    if (cleanFileName.length > maxLength) {
        cleanFileName = cleanFileName.substring(0, maxLength);
    }
    return cleanFileName + '.srt';
};

/**
 * Calculates sync scores and sorts subtitles descending by score.
 */
export const processSubtitlesWithSyncScore = (
    subtitles: SubDLSubtitle[],
    videoDuration: number,
    videoFileName: string
): { scoredSubtitles: SubtitleWithScore[]; bestScore: number } => {
    const scoredSubtitles = subtitles.map(sub => {
        const res = calculateSyncScore(sub, videoDuration, undefined, videoFileName);
        const score = res?.score ?? 0;
        const reason = res?.reason ?? '';
        return { ...sub, syncScore: score, syncReason: reason } as SubtitleWithScore;
    });

    scoredSubtitles.sort((a, b) => b.syncScore - a.syncScore);
    const bestScore = scoredSubtitles[0]?.syncScore || 0;
    return { scoredSubtitles, bestScore };
};

/**
 * Executes a SubDL subtitle search with automatic year-match re-query.
 */
export const executeSubDLSearch = async ({
    targetTitle,
    languages,
    type,
    seasonNumber,
    episodeNumber,
    imdbId,
    tmdbId,
    sdId,
    year,
}: {
    targetTitle: string;
    languages: string;
    type: 'movie' | 'tv';
    seasonNumber?: number;
    episodeNumber?: number;
    imdbId?: string;
    tmdbId?: string;
    sdId?: number;
    year?: number;
}) => {
    const response = await SubtitleService.searchSubtitlesSubDL(
        targetTitle,
        languages,
        type,
        seasonNumber,
        episodeNumber,
        imdbId,
        tmdbId,
        sdId,
        year
    );

    if (response.results && response.results.length > 0 && year && !sdId) {
        const yearMatchResult = response.results.find(r => r.year === year);
        if (yearMatchResult && response.results[0]?.sdId !== yearMatchResult.sdId) {
            const yearResponse = await SubtitleService.searchSubtitlesSubDL(
                yearMatchResult.name,
                languages,
                type,
                seasonNumber,
                episodeNumber,
                yearMatchResult.imdbId || undefined,
                yearMatchResult.tmdbId ? String(yearMatchResult.tmdbId) : undefined,
                yearMatchResult.sdId,
                year
            );
            if (yearResponse.subtitles && yearResponse.subtitles.length > 0) {
                response.subtitles = yearResponse.subtitles;
            }
            response.results = [
                yearMatchResult,
                ...response.results.filter(r => r.sdId !== yearMatchResult.sdId),
            ];
        }
    }
    return response;
};
