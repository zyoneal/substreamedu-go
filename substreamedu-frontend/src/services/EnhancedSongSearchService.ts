import axios from 'axios';
import { axiosService } from './AxiosService';
import { FreeLyricsService } from './FreeLyricsService';
import { YouTubeMusicService } from './YouTubeMusicService';
import { debugLog, debugWarn, debugError } from '../utils/debug';

export interface EnhancedSong {
    id: string;
    title: string;
    artist: string;
    album?: string;
    year?: number;
    genre?: string[];
    difficulty?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

    lyrics?: {
        text: string;
        source: 'local' | 'backend';
    };

    audio?: {
        spotifyUrl?: string;
        spotifyEmbedUrl?: string;
        youtubeUrl?: string;
        previewUrl?: string;
    };

    metadata?: {
        language?: string;
        explicit?: boolean;
        popularity?: number;
        imageUrl?: string;
    };
}

export interface SearchOptions {
    query: string;
    filters?: {
        artist?: string;
        genre?: string[];
        yearFrom?: number;
        yearTo?: number;
        difficulty?: string[];
        hasLyrics?: boolean;
    };
    limit?: number;
}



export class EnhancedSongSearchService {
    private static readonly MUSIXMATCH_API_BASE = 'https://api.musixmatch.com/ws/1.1';
    private static readonly MUSIXMATCH_KEY = 'your_musixmatch_key_here'; 

    
    private static readonly BACKEND_API_URL = '/api';

    static async searchSongs(options: SearchOptions): Promise<EnhancedSong[]> {
        const results: EnhancedSong[] = [];

        debugLog('Starting enhanced search for:', options.query);

        
        let youtubeResults: EnhancedSong[] = [];
        let useSpotify = false;

        try {
            youtubeResults = await YouTubeMusicService.searchMusic(options.query, 20);
            debugLog(`✅ YouTube search successful: ${youtubeResults.length} results`);
        } catch (error) {
            if (error instanceof Error && error.message === 'QUOTA_EXCEEDED') {
                debugWarn('⚠️ YouTube quota exceeded, falling back to Spotify');
                useSpotify = true;
            } else {
                debugError('YouTube search failed, falling back to Spotify:', error);
                useSpotify = true;
            }
        }

        
        let spotifyResults: EnhancedSong[] = [];
        if (useSpotify || youtubeResults.length === 0) {
            try {
                spotifyResults = await this.searchSpotify(options.query);
                debugLog(`✅ Spotify fallback successful: ${spotifyResults.length} results`);
            } catch (error) {
                debugError('Spotify search also failed:', error);
            }
        }

        
        results.push(...youtubeResults);

        if (spotifyResults.length > 0) {
            spotifyResults.forEach(spotifySong => {
                if (!results.find(r => this.isSameSong(r, spotifySong))) {
                    results.push(spotifySong);
                }
            });
        }

        debugLog('Total results before filtering:', results.length);

        return this.applyFilters(results, options.filters).slice(0, options.limit || 50);
    }




    private static async searchSpotify(query: string): Promise<EnhancedSong[]> {
        try {
            debugLog('Searching Spotify via backend API:', query);

            
            const response = await axiosService.get(`${this.BACKEND_API_URL}/music/search`, {
                params: {
                    query: query,
                    source: 'spotify',
                    limit: 10
                }
            });

            const items = response.data || [];
            debugLog(`Backend returned ${items.length} Spotify results`);

            
            return items.map((item: any) => ({
                id: item.id || `spotify-${Date.now()}`,
                title: item.title,
                artist: item.artist || 'Unknown Artist',
                year: item.year,
                audio: {
                    spotifyUrl: item.audio?.spotifyUrl,
                    spotifyEmbedUrl: item.audio?.spotifyEmbedUrl,
                    previewUrl: item.audio?.previewUrl
                },
                metadata: {
                    language: 'en',
                    imageUrl: item.imageUrl
                }
            }));

        } catch (error) {
            debugError('Backend Spotify search error:', error);
            if (axios.isAxiosError(error)) {
                debugError('Backend error details:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    message: error.message
                });
            }
            return [];
        }
    }



    static async getLyrics(artist: string, title: string): Promise<{ text: string; source: string } | null> {
        debugLog(`\n=== 🎵 Multi-Source Lyrics Search ===`);
        debugLog(`Song: "${artist}" - "${title}"`);
        const startTime = Date.now();

        
        debugLog('\n🌐 Step 2: Fetching from external sources in parallel...');

        const fetchPromises = [
            
            FreeLyricsService.getLyrics(artist, title)
                .then(result => ({ service: 'Backend', result }))
                .catch(err => ({ service: 'Backend', result: null, error: err }))
        ];

        
        const racePromise = new Promise<{ text: string; source: string } | null>((resolve) => {
            let completed = 0;
            const total = fetchPromises.length;

            fetchPromises.forEach((promise) => {
                promise.then((fetchResult) => {
                    if (fetchResult.result) {
                        
                        debugLog(`✓ ${fetchResult.service}: Found (${fetchResult.result.text?.length || 0} chars)`);
                        const elapsed = Date.now() - startTime;
                        debugLog(`\n✓ SUCCESS: Lyrics from ${fetchResult.service} (${elapsed}ms total)`);
                        debugLog(`=== End Lyrics Search ===\n`);
                        resolve(fetchResult.result);
                    } else {
                        completed++;
                        if ('error' in fetchResult && fetchResult.error) {
                            debugLog(`✗ ${fetchResult.service}: Error - ${fetchResult.error.message}`);
                        } else {
                            debugLog(`✗ ${fetchResult.service}: Not found`);
                        }

                        
                        if (completed === total) {
                            resolve(null);
                        }
                    }
                });
            });
        });

        const firstResult = await racePromise;
        if (firstResult) {
            return firstResult;
        }

        
        debugLog('\n🔄 Step 3: Retrying with cleaned search terms...');
        const cleanedArtist = this.cleanArtistName(artist);
        const cleanedTitle = this.cleanSongTitle(title);

        if (cleanedArtist !== artist || cleanedTitle !== title) {
            debugLog(`Original: "${artist}" - "${title}"`);
            debugLog(`Cleaned:  "${cleanedArtist}" - "${cleanedTitle}"`);

            const retryPromises = [
                FreeLyricsService.getLyrics(cleanedArtist, cleanedTitle)
                    .then(result => ({ service: 'Backend (retry)', result }))
                    .catch(() => ({ service: 'Backend (retry)', result: null }))
            ];

            const retryResults = await Promise.allSettled(retryPromises);

            
            retryResults.forEach((promiseResult) => {
                if (promiseResult.status === 'fulfilled') {
                    const { service, result } = promiseResult.value;
                    if (result) {
                        debugLog(`✓ ${service}: Found (${result.text?.length || 0} chars)`);
                    } else {
                        debugLog(`✗ ${service}: Not found`);
                    }
                }
            });

            
            for (const promiseResult of retryResults) {
                if (promiseResult.status === 'fulfilled' && promiseResult.value.result) {
                    const elapsed = Date.now() - startTime;
                    debugLog(`\n✓ SUCCESS: Lyrics from ${promiseResult.value.service} (${elapsed}ms total)`);
                    debugLog(`=== End Lyrics Search ===\n`);
                    return promiseResult.value.result;
                }
            }
        } else {
            debugLog('No cleaning needed, skipping retry');
        }

        const elapsed = Date.now() - startTime;
        debugLog(`\n✗ FAILED: No lyrics found from any source (${elapsed}ms total)`);
        debugLog(`=== End Lyrics Search ===\n`);
        return null;
    }

    private static cleanArtistName(artist: string): string {
        return artist
            .replace(/\s*&\s*The\s+.*/i, '')
            .replace(/\s*feat\.?.*/i, '')
            .replace(/\s*ft\.?.*/i, '')
            .trim();
    }

    private static cleanSongTitle(title: string): string {
        return title
            .replace(/\s*\(.*?\)/g, '')
            .replace(/\s*\[.*?\]/g, '')
            .replace(/\s*-\s*Remastered.*$/i, '')
            .replace(/\s*-\s*\d{4}\s*Remaster.*$/i, '')
            .replace(/\s*-\s*From.*$/i, '')
            .trim();
    }

    private static async getMusixmatchLyrics(artist: string, title: string): Promise<string | null> {
        if (!this.MUSIXMATCH_KEY || this.MUSIXMATCH_KEY === 'your_musixmatch_key_here') {
            return null;
        }

        try {
            const searchResponse = await axios.get(
                `${this.MUSIXMATCH_API_BASE}/track.search`,
                {
                    params: {
                        q_artist: artist,
                        q_track: title,
                        apikey: this.MUSIXMATCH_KEY
                    }
                }
            );

            const tracks = searchResponse.data.message?.body?.track_list;
            if (!tracks || tracks.length === 0) {
                return null;
            }

            const trackId = tracks[0].track.track_id;

            const lyricsResponse = await axios.get(
                `${this.MUSIXMATCH_API_BASE}/track.lyrics.get`,
                {
                    params: {
                        track_id: trackId,
                        apikey: this.MUSIXMATCH_KEY
                    }
                }
            );

            return lyricsResponse.data.message?.body?.lyrics?.lyrics_body || null;
        } catch (error) {
            debugError('Musixmatch lyrics error:', error);
            return null;
        }
    }

    private static mergeWithSpotify(existing: EnhancedSong[], spotifyResults: EnhancedSong[]): EnhancedSong[] {
        return existing.map(song => {
            const spotifyMatch = spotifyResults.find(s => this.isSameSong(song, s));
            if (spotifyMatch) {
                return {
                    ...song,
                    audio: { ...song.audio, ...spotifyMatch.audio },
                    metadata: { ...song.metadata, ...spotifyMatch.metadata }
                };
            }
            return song;
        });
    }

    private static isSameSong(song1: EnhancedSong, song2: EnhancedSong): boolean {
        const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
            normalize(song1.title) === normalize(song2.title) &&
            normalize(song1.artist) === normalize(song2.artist)
        );
    }

    private static applyFilters(songs: EnhancedSong[], filters?: SearchOptions['filters']): EnhancedSong[] {
        if (!filters) return songs;

        return songs.filter(song => {
            if (filters.artist && !song.artist.toLowerCase().includes(filters.artist.toLowerCase())) {
                return false;
            }

            if (filters.yearFrom && song.year && song.year < filters.yearFrom) {
                return false;
            }

            if (filters.yearTo && song.year && song.year > filters.yearTo) {
                return false;
            }

            if (filters.difficulty?.length && song.difficulty && !filters.difficulty.includes(song.difficulty)) {
                return false;
            }

            if (filters.hasLyrics && !song.lyrics?.text) {
                return false;
            }

            if (filters.genre?.length && song.genre) {
                const hasMatchingGenre = song.genre.some(g =>
                    filters.genre!.some(fg => g.toLowerCase().includes(fg.toLowerCase()))
                );
                if (!hasMatchingGenre) return false;
            }

            return true;
        });
    }

    private static parseYear(dateString?: string): number | undefined {
        if (!dateString) return undefined;
        const match = dateString.match(/\d{4}/);
        return match ? parseInt(match[0]) : undefined;
    }
}
