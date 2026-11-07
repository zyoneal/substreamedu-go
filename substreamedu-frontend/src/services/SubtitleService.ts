import { baseURL, urls } from "../constants/urls";
import { axiosService } from "./AxiosService";
import axios from "axios";
import { SCORING_WEIGHTS, SCORE_THRESHOLDS, VIDEO_QUALITY_MARKERS } from '../constants/scoring';
import { debugLog, debugError } from "../utils/debug";
import { GuestLimitService } from "./GuestLimitService";

export interface TranslationProdResponse {
    transcription: string;
    translation: string;
    definition: string;
    imageUrl: string;
    
    hint?: string;
    examples?: string[];
    synonyms?: string[];
    style?: string;
    partOfSpeech?: string;
    
    other_meanings?: string[];
    recommended_selections?: string[];
    context_analysis?: {
        minimal_unit?: string;
        collocations?: string[];
        domain?: string;
    };

    // Contextual explanation fields (v3.0)
    register?: string;
    usage_note?: string;
    alternatives?: Array<{ text: string; register?: string; usage_note?: string }>;
    chunks?: string[];
    typical_contexts?: string[];
}


export interface SubDLSubtitle {
    id?: number; 
    subtitlesId: string;
    name: string;
    releaseName: string;
    language: string;
    author: string;
    url: string;
    ratings: number;
    votes: number;
    hi: boolean;
    frameRate: number;
    downloadCount: string;
    uploadDate: string;
    seasonNumber: number;
    episodeNumber: number;
    fromTrusted?: boolean; 
}

export interface SubDLSearchResult {
    imdbId: string;
    tmdbId: number;
    type: string;
    name: string;
    sdId: number;
    firstAirDate: string | null;
    year: number;
}

export interface SubDLResponse {
    status: boolean;
    results: SubDLSearchResult[];
    subtitles: SubDLSubtitle[];
}

export interface SubtitleWithScore extends SubDLSubtitle {
    syncScore: number;       
    syncReason: string;      
    lastTimestamp?: number;  
}

const SubtitleService = {

    async fetchSubtitleFileContent(url: string): Promise<string> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load subtitle file: ${response.status} ${response.statusText}`);
            }
            return await response.text();
        } catch (error) {
            debugError("Error fetching subtitle file content:", error);
            throw error;
        }
    },

    async fetchSubtitles(fileId: string): Promise<any[]> {
        try {
            const response = await axiosService.get(`${baseURL}${urls.subtitles}/${fileId}`);
            return response.data;
        } catch (error) {
            debugError("Error fetching subtitles:", error);
            throw new Error("Failed to load subtitles.");
        }
    },

    async fetchSubtitlesForVideo(fileId: string): Promise<any[]> {
        try {
            const response = await axiosService.get(`${baseURL}${urls.subtitles}/video/${fileId}`);
            return response.data;
        } catch (error) {
            debugError("Error fetching subtitles:", error);
            throw new Error("Failed to load subtitles.");
        }
    },

    async fetchSubtitlesForYoutube(videoId: string): Promise<any[]> {
        const presetSubtitlesMap: Record<string, string> = {
            'hsUkTQ1YTOQ': '/subtitles/hsUkTQ1YTOQ.json',
            'd9gkFenaKFs': '/subtitles/d9gkFenaKFs.json',
            'BnRub9D5Ch8': '/subtitles/BnRub9D5Ch8.json',
            'b5DOQ7iOzO4': '/subtitles/b5DOQ7iOzO4.json',
        };

        const presetPath = presetSubtitlesMap[videoId];
        if (presetPath) {
            try {
                const url = `${process.env.PUBLIC_URL || ''}${presetPath}`;
                const response = await axios.get(url);
                if (Array.isArray(response.data) && response.data.length > 0) {
                    return response.data;
                }
            } catch (presetError) {
                console.warn(`Failed to load preset subtitles for ${videoId}, falling back to API:`, presetError);
            }
        }

        try {
            const response = await axiosService.get(`${baseURL}${urls.youtube}/${videoId}`);
            return response.data;
        } catch (error) {
            console.error("Error fetching youtube subtitles:", error);
            throw new Error("Failed to load youtube subtitles.");
        }
    },

    async fetchSubtitlesForDemoVideo(fileId: string): Promise<any[]> {
        try {
            const response = await axiosService.get(`${baseURL}${urls.subtitles}/demoVideo/${fileId}`);
            return response.data;
        } catch (error) {
            debugError("Error fetching subtitles:", error);
            throw new Error("Failed to load subtitles.");
        }
    },

    async processHighlightedText(data: {
        resourceName: string,
        highlightedText: string,
        context: string,
        learningLanguage: string,
        fluentLanguage: string
    }) {
        try {
            const response = await axiosService.post(`${baseURL}${urls.dictionary}`, data);
            return response.data;
        } catch {
            throw new Error('Error processing highlighted text');
        }
    },

    async processHighlightedTextAfterTranslation(data: {
        resourceName: string;
        highlightedText: string;
        context: string;
        extendedContext?: string;
        translation: string | null;
        note: string;
        transcription: string | null;
        definition: string | null;
        imageUrl: string | null;
    }) {
        try {
            const response = await axiosService.post(`${baseURL}${urls.dictionary}/translated`, data);
            return response.data;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                const err = new Error(error.response.data.message || 'Unknown error');
                Object.assign(err, {
                    status: error.response.status,
                    localDateTime: error.response.data.localDateTime || new Date().toISOString()
                });
                throw err;
            } else {
                throw new Error('Error processing highlighted text');
            }
        }
    },

    async getTranslationDemo(data: {
        resourceName: string,
        highlightedText: string,
        context: string,
        learningLanguage: string,
        fluentLanguage: string
    }): Promise<string> {
        try {
            const response = await axiosService.post(`${baseURL}${urls.dictionary}/translation/demo`, data);
            return response.data;
        } catch {
            throw new Error('Error processing highlighted text');
        }
    },

    async getTranslationProd(data: {
        resourceName: string,
        highlightedText: string,
        context: string,
        extendedContext?: string,
        learningLanguage: string,
        fluentLanguage: string
    }): Promise<TranslationProdResponse> {
        if (!GuestLimitService.checkGuestTranslationAllowed()) {
            throw new Error('GUEST_LIMIT_REACHED');
        }
        const response = await axiosService.post(`${baseURL}${urls.dictionary}/translation/prod`, data);
        return response.data;
    },

    async fetchAllSubtitles(): Promise<any[]> {
        try {
            const response = await axiosService.get(`${baseURL}${urls.subtitles}`);
            return response.data;
        } catch (error) {
            debugError("Error fetching dictionary items:", error);
            throw new Error("Failed to load the dictionary.");
        }
    },

    async uploadSubtitles(formData: FormData) {
        try {
            const response = await axiosService.post(`${baseURL}${urls.uploadSubtitles}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            return response.data;
        } catch {
            throw new Error('Error processing highlighted text');
        }
    },

    async deleteSubtitlesByName(name: string) {
        await axiosService.delete(`${baseURL}${urls.subtitles}/${name}`);
    },

    async searchSubtitlesSubDL(
        filmName: string,
        languages: string = 'EN',
        type: 'movie' | 'tv' = 'movie',
        seasonNumber?: number,
        episodeNumber?: number,
        imdbId?: string,
        tmdbId?: string,
        sdId?: number,
        year?: number
    ): Promise<SubDLResponse> {
        try {
            debugLog('=== searchSubtitlesSubDL CALLED ===');
            debugLog('Input params:', { filmName, type, languages, imdbId, tmdbId, sdId, year });
            debugLog('imdbId type:', typeof imdbId, 'value:', imdbId);
            debugLog('sdId type:', typeof sdId, 'value:', sdId);

            
            const params: Record<string, string | number> = {
                filmName,
                languages,
                type,
            };

            
            if (seasonNumber !== undefined && seasonNumber !== null) {
                params.seasonNumber = seasonNumber;
            }
            if (episodeNumber !== undefined && episodeNumber !== null) {
                params.episodeNumber = episodeNumber;
            }
            if (imdbId !== undefined && imdbId !== null && imdbId !== '') {
                params.imdbId = imdbId;
            }
            if (tmdbId !== undefined && tmdbId !== null && tmdbId !== '') {
                params.tmdbId = tmdbId;
            }
            if (sdId !== undefined && sdId !== null && sdId !== 0) {
                params.sdId = sdId;
            }
            if (year !== undefined && year !== null && year > 1900) {
                params.year = year;
            }

            debugLog('Final params being sent:', params);

            // Call backend API instead of SubDL directly
            const response = await axiosService.get<SubDLResponse>(
                `${baseURL}${urls.subtitles}/external/search`,
                { params }
            );

            debugLog('Backend subtitle search response:', response.data);
            debugLog('Found subtitles:', response.data.subtitles?.length || 0);

            return response.data;
        } catch (error) {
            debugError('Error searching subtitles from backend:', error);
            throw new Error('Failed to search subtitles from backend.');
        }
    },

    async downloadSubtitleFromSubDL(subtitle: SubDLSubtitle): Promise<string> {
        try {
            debugLog('Downloading subtitle via backend:', subtitle);

            // Extract subtitle ID from URL or use direct ID
            let subtitleId = subtitle.subtitlesId;

            if (!subtitleId && subtitle.url) {
                const match = subtitle.url.match(/\/subtitle\/([^\/]+)\.zip/);
                if (match) {
                    subtitleId = match[1];
                    debugLog('Extracted subtitle ID from URL:', subtitleId);
                } else {
                    throw new Error('Could not extract subtitle ID from URL');
                }
            }

            if (!subtitleId) {
                throw new Error('Subtitle ID not available');
            }

            debugLog('Downloading subtitle ID:', subtitleId);

            
            debugLog('→ Calling backend:', `${baseURL}${urls.subtitles}/external/download/${subtitleId}`);
            const response = await axiosService.get(
                `${baseURL}${urls.subtitles}/external/download/${subtitleId}`,
                {
                    responseType: 'arraybuffer',
                    timeout: 60000
                }
            );

            debugLog('✓ Received subtitle data, size:', response.data.byteLength, 'bytes');

            const uint8 = new Uint8Array(response.data);
            const isZip = uint8.length >= 4 && uint8[0] === 0x50 && uint8[1] === 0x4B;

            // 1. Check if the response is direct raw SRT/VTT text
            const textDecoder = new TextDecoder('utf-8');
            const previewText = textDecoder.decode(uint8.slice(0, 500));
            if (previewText.includes('-->') || previewText.startsWith('WEBVTT') || /^\d+\r?\n\d\d:\d\d/m.test(previewText)) {
                const fullText = textDecoder.decode(response.data);
                debugLog('✓ Response is raw SRT/VTT text (not a zip), length:', fullText.length);
                return fullText;
            }

            if (!isZip) {
                const fallbackText = textDecoder.decode(response.data);
                if (fallbackText.includes('-->')) {
                    return fallbackText;
                }
                throw new Error('SubDL returned invalid/empty file (not a valid subtitle or zip archive).');
            }

            // 2. Parse valid ZIP archive
            const JSZip = (await import('jszip')).default;
            const zip = await JSZip.loadAsync(response.data);
            const files = Object.keys(zip.files);

            const srtFile = files.find(name =>
                (name.endsWith('.srt') || name.endsWith('.vtt')) && !name.startsWith('__MACOSX') && !name.startsWith('.')
            );

            if (!srtFile) {
                throw new Error('No .srt or .vtt file found in the downloaded archive');
            }

            const srtContent = await zip.files[srtFile].async('string');
            return srtContent;
        } catch (error) {
            debugLog('⚠️ Subtitle candidate download failed (skipping):', error instanceof Error ? error.message : error);

            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                if (status === 500) {
                    throw new Error('SubDL server error. File unavailable.');
                } else if (status === 404) {
                    throw new Error('Subtitle not found on server.');
                } else if (status === 429) {
                    throw new Error('Too many requests.');
                }
            }

            throw error instanceof Error ? error : new Error('Failed to download subtitle candidate.');
        }
    },

    async generateTextByLevel(cefrLevel: string, language: string, topic?: string): Promise<string> {
        try {
            const response = await axiosService.post(`${baseURL}${urls.subtitles}/generate-text`, {
                cefrLevel,
                language,
                topic: topic || null
            }, {
                timeout: 30000 
            });
            return response.data;
        } catch (error) {
            debugError('Error generating text by level:', error);
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 429) {
                    throw new Error('Rate limit exceeded. Please wait a minute and try again.');
                } else if (error.response?.status === 503) {
                    throw new Error('Service temporarily unavailable. Please try again later.');
                }
            }
            throw new Error('Failed to generate text. Please try again.');
        }
    },
};


function parseSrtTimestamp(timestamp: string): number {
    
    const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    if (!match) return 0;

    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const seconds = parseInt(match[3]);
    const milliseconds = parseInt(match[4]);

    return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}


function getLastTimestampFromSrt(srtContent: string): number {
    const lines = srtContent.split('\n');
    let lastTimestamp = 0;

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i].trim();
        
        if (line.includes('-->')) {
            const endTime = line.split('-->')[1].trim();
            lastTimestamp = parseSrtTimestamp(endTime);
            break;
        }
    }

    return lastTimestamp;
}


export function calculateSyncScore(
    subtitle: SubDLSubtitle,
    videoDuration: number,
    videoFps?: number,
    videoFileName?: string
): { score: number; reason: string; lastTimestamp?: number } {
    let score = 0;
    const reasons: string[] = [];

    
    if (subtitle.ratings > 0 || subtitle.votes > 0) {
        const ratingScore = Math.min(
            SCORING_WEIGHTS.RATINGS_MAX,
            (subtitle.ratings / 10) * SCORING_WEIGHTS.RATINGS_MAX
        );
        const votesScore = Math.min(
            SCORING_WEIGHTS.VOTES_MAX,
            Math.log10(subtitle.votes + 1) * 3
        );
        score += ratingScore + votesScore;

        if (subtitle.ratings >= SCORE_THRESHOLDS.EXCELLENT_RATING) {
            reasons.push('⭐ Excellent rating');
        } else if (subtitle.ratings >= SCORE_THRESHOLDS.GOOD_RATING) {
            reasons.push('Good rating');
        }

        if (subtitle.votes > SCORE_THRESHOLDS.POPULAR_VOTES) {
            reasons.push('Popular');
        }
    }

    
    if (subtitle.fromTrusted) {
        score += SCORING_WEIGHTS.TRUSTED_SOURCE;
        reasons.push('✓ Trusted source');
    }

    
    if (videoFps && subtitle.frameRate > 0) {
        const fpsDiff = Math.abs(videoFps - subtitle.frameRate);
        if (fpsDiff < SCORE_THRESHOLDS.FPS_EXACT_TOLERANCE) {
            score += SCORING_WEIGHTS.FPS_EXACT_MATCH;
            reasons.push('FPS exact');
        } else if (fpsDiff < SCORE_THRESHOLDS.FPS_CLOSE_TOLERANCE) {
            score += SCORING_WEIGHTS.FPS_CLOSE_MATCH;
            reasons.push('FPS close');
        }
    }

    
    if (videoFileName && subtitle.releaseName) {
        const videoNameLower = videoFileName.toLowerCase();
        const releaseNameLower = subtitle.releaseName.toLowerCase();

        
        const videoQuality = VIDEO_QUALITY_MARKERS.find(q => videoNameLower.includes(q));
        const subQuality = VIDEO_QUALITY_MARKERS.find(q => releaseNameLower.includes(q));

        if (videoQuality && videoQuality === subQuality) {
            score += SCORING_WEIGHTS.QUALITY_MATCH;
            reasons.push('Quality match');
        }

        
        const commonWords = videoNameLower.split(/[.\s_-]/)
            .filter(word => word.length > 3)
            .filter(word => releaseNameLower.includes(word));

        if (commonWords.length > SCORE_THRESHOLDS.MIN_COMMON_WORDS) {
            score += SCORING_WEIGHTS.RELEASE_NAME_MATCH;
            reasons.push('Release match');
        }
    }

    
    if (subtitle.hi) {
        reasons.push('HI');
    }

    
    score = Math.max(0, Math.min(100, score));

    const reason = reasons.length > 0 ? reasons.join(' • ') : 'No match info';

    return { score, reason };
}


export async function checkSubtitleSync(
    subtitle: SubDLSubtitle,
    videoDuration: number,
    videoFps?: number,
    videoFileName?: string
): Promise<SubtitleWithScore> {
    try {
        
        const basicScore = calculateSyncScore(subtitle, videoDuration, videoFps, videoFileName);

        
        
        try {
            
            let subtitleId = subtitle.subtitlesId;
            if (!subtitleId && subtitle.url) {
                const match = subtitle.url.match(/\/subtitle\/([^\/]+)\.zip/);
                if (match) subtitleId = match[1];
            }

            if (subtitleId && videoDuration > 0) {
                const downloadUrl = `https://dl.subdl.com/subtitle/${subtitleId}.zip`;

                const dlStartTime = Date.now();
                console.log(`[Performance] START direct download: ${downloadUrl}`);

                
                const response = await axios.get(downloadUrl, {
                    responseType: 'arraybuffer',
                    headers: {
                        'Range': 'bytes=0-51200',  
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': '*/*',
                        'Referer': 'https://subdl.com/'
                    },
                    timeout: 8000  
                });

                const dlDuration = Date.now() - dlStartTime;
                console.log(`%c[Performance] GET ${downloadUrl} took ${dlDuration}ms`, 'color: cyan; font-weight: bold;');

                
                const JSZip = (await import('jszip')).default;
                const zip = new JSZip();
                const zipContent = await zip.loadAsync(response.data);

                const srtFile = Object.keys(zipContent.files).find(name =>
                    name.toLowerCase().endsWith('.srt')
                );

                if (srtFile) {
                    const srtContent = await zipContent.files[srtFile].async('text');
                    const lastTimestamp = getLastTimestampFromSrt(srtContent);

                    if (lastTimestamp > 0) {
                        const timeDiff = Math.abs(videoDuration - lastTimestamp);
                        const diffPercent = (timeDiff / videoDuration) * 100;

                        
                        let timelineScore = 0;
                        let timelineReason = '';

                        if (diffPercent < 1) {
                            // Perfect sync: within 1% difference
                            timelineScore = 40;
                            timelineReason = '🎯 Perfect sync';
                        } else if (diffPercent < 2) {
                            
                            timelineScore = 35;
                            timelineReason = '✓ Excellent sync';
                        } else if (diffPercent < 5) {
                            
                            timelineScore = 25;
                            timelineReason = 'Good sync';
                        } else if (diffPercent < 10) {
                            
                            timelineScore = 15;
                            timelineReason = 'Acceptable sync';
                        } else {
                            
                            timelineScore = 0;
                            timelineReason = '⚠ Timeline mismatch';
                        }

                        const finalScore = Math.min(100, basicScore.score + timelineScore);
                        const finalReason = timelineReason + ' • ' + basicScore.reason;

                        return {
                            ...subtitle,
                            syncScore: finalScore,
                            syncReason: finalReason,
                            lastTimestamp
                        };
                    }
                }
            }
        } catch (error) {
            
            if (axios.isAxiosError(error)) {
                if (error.response?.status === 500) {
                    debugLog('SubDL server error (500) for subtitle:', subtitle.name);
                } else if (error.code === 'ECONNABORTED') {
                    debugLog('Timeline check timeout for subtitle:', subtitle.name);
                } else {
                    debugLog('Could not check timeline for subtitle:', subtitle.name, error.message);
                }
            } else {
                debugLog('Could not check timeline for subtitle:', subtitle.name, error);
            }
            
        }

        
        return {
            ...subtitle,
            syncScore: basicScore.score,
            syncReason: basicScore.reason + ' • Timeline not checked'
        };
    } catch (error) {
        debugError('Error checking subtitle sync:', error);
        return {
            ...subtitle,
            syncScore: 30,
            syncReason: 'Error during verification'
        };
    }
}

export { SubtitleService };