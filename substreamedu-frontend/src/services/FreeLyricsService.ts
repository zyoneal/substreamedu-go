import { axiosService } from './AxiosService';
import { baseURL, urls } from '../constants/urls';
import { debugLog, debugError } from '../utils/debug';

export class FreeLyricsService {
    private static readonly MAX_RETRIES = 2;
    private static readonly BASE_DELAY = 1000; 

        static async getLyrics(artist: string, title: string): Promise<{ text: string; source: string } | null> {
        debugLog(`\n=== FreeLyricsService: Requesting from backend for "${artist}" - "${title}" ===`);

        let lastError: any = null;

        for (let attempt = 0; attempt <= this.MAX_RETRIES; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = this.BASE_DELAY * Math.pow(2, attempt - 1);
                    debugLog(`⏳ Retry attempt ${attempt}/${this.MAX_RETRIES} after ${delay}ms delay...`);
                    await this.sleep(delay);
                }

                const response = await axiosService.get(`${baseURL}${urls.lyrics}`, {
                    params: {
                        artist,
                        title
                    },
                    timeout: 15000
                });

                if (response.data && response.data.lyrics) {
                    debugLog(`✓ Lyrics received from backend via ${response.data.source} (${response.data.lyrics.length} chars)`);
                    return {
                        text: response.data.lyrics,
                        source: response.data.source
                    };
                }

                debugLog('✗ No lyrics returned from backend');
                return null;
            } catch (error: any) {
                lastError = error;

                if (error.response?.status === 404) {
                    debugLog('✗ Backend returned 404 - lyrics not found');
                    
                    return null;
                }

                if (error.code === 'ECONNABORTED') {
                    debugLog(`✗ Request timeout on attempt ${attempt + 1}`);
                } else if (error.response?.status >= 500) {
                    debugLog(`✗ Server error (${error.response.status}) on attempt ${attempt + 1}`);
                } else {
                    debugError(`✗ Backend request failed on attempt ${attempt + 1}:`, error.message);
                    
                    if (error.response?.status >= 400 && error.response?.status < 500) {
                        return null;
                    }
                }
            }
        }

        debugError(`✗ All ${this.MAX_RETRIES + 1} attempts failed. Last error:`, lastError?.message);
        return null;
    }

        private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

