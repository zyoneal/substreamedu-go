import axios, { AxiosError } from 'axios';
import { axiosService } from './AxiosService';
import { EnhancedSong } from './EnhancedSongSearchService';
import { debugLog, debugWarn, debugError } from '../utils/debug';

const QUOTA_STORAGE_KEY = 'youtube_music_quota_exceeded';
const QUOTA_RESET_TIME_KEY = 'youtube_music_quota_reset_time';


interface InternalYoutubeVideoDto {
    id: string;
    title: string;
    description: string;
    thumbnailUrl: string;
}

export class YouTubeMusicService {
        static isQuotaExceeded(): boolean {
        const quotaExceeded = localStorage.getItem(QUOTA_STORAGE_KEY);
        const resetTime = localStorage.getItem(QUOTA_RESET_TIME_KEY);

        if (!quotaExceeded || !resetTime) {
            return false;
        }

        const now = Date.now();
        const reset = parseInt(resetTime, 10);

        
        if (now >= reset) {
            this.clearQuotaExceeded();
            return false;
        }

        return quotaExceeded === 'true';
    }

        private static markQuotaExceeded(): void {
        localStorage.setItem(QUOTA_STORAGE_KEY, 'true');

        
        
        const resetTime = Date.now() + (24 * 60 * 60 * 1000);
        localStorage.setItem(QUOTA_RESET_TIME_KEY, resetTime.toString());

        debugWarn('🚨 YouTube API quota exceeded. Falling back to Spotify until tomorrow.');
    }

        private static clearQuotaExceeded(): void {
        localStorage.removeItem(QUOTA_STORAGE_KEY);
        localStorage.removeItem(QUOTA_RESET_TIME_KEY);
        debugLog('✅ YouTube API quota reset');
    }

    static async searchMusic(query: string, limit: number = 20): Promise<EnhancedSong[]> {
        
        if (this.isQuotaExceeded()) {
            debugLog('🚨 YouTube quota already exceeded, skipping search');
            throw new Error('QUOTA_EXCEEDED');
        }

        try {
            debugLog('🎵 Searching YouTube Music (via proxy) for:', query);

            const response = await axiosService.get<InternalYoutubeVideoDto[]>(
                '/api/youtube/search',
                {
                    params: {
                        q: query,
                    }
                }
            );

            debugLog(`✅ Found ${response.data.length} YouTube videos`);

            return response.data.slice(0, limit).map(item => {
                const { title, artist } = this.parseMusicTitle(item.title);

                return {
                    id: `youtube-${item.id}`,
                    title: title,
                    artist: artist || 'Unknown Artist',
                    audio: {
                        youtubeUrl: `https://www.youtube.com/watch?v=${item.id}`
                    },
                    metadata: {
                        language: 'en',
                        imageUrl: item.thumbnailUrl
                    }
                };
            });

        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError<any>;

                
                if (axiosError.response?.status === 403 || axiosError.response?.status === 429) {
                    const errorData = axiosError.response.data;
                    const errorMessage = typeof errorData === 'string' ? errorData : JSON.stringify(errorData);

                    if (errorMessage.includes('quotaExceeded')) {
                        debugError('❌ YouTube API quota exceeded');
                        this.markQuotaExceeded();
                        throw new Error('QUOTA_EXCEEDED');
                    }
                }

                debugError('YouTube proxy search error:', {
                    status: axiosError.response?.status,
                    message: axiosError.message,
                    data: axiosError.response?.data
                });
            } else {
                debugError('YouTube search error:', error);
            }

            throw error;
        }
    }

        private static parseMusicTitle(fullTitle: string): { title: string; artist: string | null } {
        
        const cleaned = fullTitle
            .replace(/\(Official\s*(Music\s*)?Video\)/gi, '')
            .replace(/\(Official\s*Audio\)/gi, '')
            .replace(/\(Lyric\s*Video\)/gi, '')
            .replace(/\(Lyrics?\)/gi, '')
            .replace(/\[Official\s*(Music\s*)?Video\]/gi, '')
            .replace(/\[Official\s*Audio\]/gi, '')
            .replace(/\[Lyric\s*Video\]/gi, '')
            .replace(/\[Lyrics?\]/gi, '')
            .replace(/\(HD\)/gi, '')
            .replace(/\[HD\]/gi, '')
            .replace(/\(4K\)/gi, '')
            .replace(/\[4K\]/gi, '')
            .trim();

        // Try to split by common separators: " - ", " – ", " | "
        const separators = [' - ', ' – ', ' — ', ' | '];

        for (const separator of separators) {
            if (cleaned.includes(separator)) {
                const parts = cleaned.split(separator);
                if (parts.length >= 2) {
                    return {
                        artist: parts[0].trim(),
                        title: parts.slice(1).join(separator).trim()
                    };
                }
            }
        }

        
        return {
            artist: null,
            title: cleaned
        };
    }

        static getEmbedUrl(videoId: string): string {
        return `https://www.youtube.com/embed/${videoId}`;
    }

        static extractVideoId(url: string): string | null {
        const patterns = [
            /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
            /youtube\.com\/embed\/([^&\n?#]+)/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }
}
