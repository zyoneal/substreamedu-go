import axios from 'axios';
import { debugLog, debugError } from '../utils/debug';

export interface SpotifyTrackItem {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    duration_ms: number;
    external_urls?: { spotify?: string };
    album?: {
        name?: string;
        images?: Array<{ url: string }>;
    };
}

export class SpotifyService {
    private static cachedToken: string | null = null;
    private static tokenExpiry: number = 0;

    /**
     * Retrieves or refreshes client credentials access token for Spotify API.
     */
    static async getClientToken(): Promise<string> {
        if (this.cachedToken && Date.now() < this.tokenExpiry) {
            return this.cachedToken;
        }

        debugLog('Fetching Spotify client credentials token...');
        try {
            const tokenResponse = await axios.post(
                'https://accounts.spotify.com/api/token',
                new URLSearchParams({ grant_type: 'client_credentials' }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        Authorization:
                            'Basic ' + btoa('8073fe0adc534a1290cefe1afe003d40:90bb0d2e329c4a5b8fd31ec9d39ccc4f'),
                    },
                }
            );

            const token = tokenResponse.data.access_token;
            const expiresIn = tokenResponse.data.expires_in || 3600;
            this.cachedToken = token;
            // Buffer expiry by 60 seconds
            this.tokenExpiry = Date.now() + (expiresIn - 60) * 1000;
            return token;
        } catch (error) {
            debugError('Failed to fetch Spotify client token:', error);
            throw error;
        }
    }

    /**
     * Searches for a single track on Spotify by query string.
     */
    static async searchTrack(query: string): Promise<SpotifyTrackItem | null> {
        try {
            const token = await this.getClientToken();
            debugLog('Searching Spotify track with query:', query);
            const trackRes = await axios.get(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (!trackRes.data.tracks?.items?.length) {
                return null;
            }

            return trackRes.data.tracks.items[0];
        } catch (error) {
            debugError('Failed to search Spotify track:', error);
            throw error;
        }
    }
}
