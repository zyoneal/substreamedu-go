import { GoogleDriveFile, GooglePickerResponse, GoogleAuthResponse } from '../types/googleDriveTypes';

const DEFAULT_CLIENT_ID = '887938283003-7t4hh8127tcpkltcmseo2gkht3qm7vss.apps.googleusercontent.com';
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || DEFAULT_CLIENT_ID;
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

const waitFor = async (check: () => boolean, timeoutMs = 5000, intervalMs = 100): Promise<boolean> => {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        if (check()) return true;
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
    return check();
};

class GoogleDriveServiceClass {
    private accessToken: string | null = null;
    private pickerApiLoaded = false;

    /**
     * Initialize Google Drive Picker API
     */
    async initialize(): Promise<void> {
        if (this.pickerApiLoaded && window.google?.picker) {
            return;
        }

        const hasGapi = await waitFor(() => typeof window !== 'undefined' && !!window.gapi, 5000);
        if (!hasGapi || !window.gapi) {
            throw new Error('Google API not loaded. Check internet connection or ad-blocker.');
        }

        return new Promise<void>((resolve, reject) => {
            window.gapi.load('picker', {
                callback: () => {
                    this.pickerApiLoaded = true;
                    resolve();
                },
                onerror: () => {
                    reject(new Error('Failed to load Google Picker library'));
                },
                ontimeout: () => {
                    reject(new Error('Timeout loading Google Picker library'));
                },
                timeout: 10000,
            });
        });
    }

    /**
     * Request access token via Google Identity Services
     */
    private async requestAccessToken(): Promise<string> {
        if (this.accessToken) {
            return this.accessToken;
        }

        const hasGsi = await waitFor(
            () => typeof window !== 'undefined' && !!window.google?.accounts?.oauth2,
            5000
        );

        if (!hasGsi || !window.google?.accounts?.oauth2) {
            throw new Error('Google Identity Services not loaded');
        }

        return new Promise<string>((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('Authentication timed out. Please try again.'));
            }, 60000);

            try {
                const client = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: (response: GoogleAuthResponse) => {
                        clearTimeout(timer);
                        if (response.access_token) {
                            this.accessToken = response.access_token;
                            resolve(response.access_token);
                        } else {
                            reject(new Error('Failed to get access token'));
                        }
                    },
                    error_callback: (error: any) => {
                        clearTimeout(timer);
                        const msg =
                            error?.type === 'popup_closed'
                                ? 'Authentication cancelled: popup was closed'
                                : (error?.message || 'Authentication error');
                        reject(new Error(msg));
                    },
                });

                client.requestAccessToken();
            } catch (err) {
                clearTimeout(timer);
                reject(err);
            }
        });
    }

    /**
     * Extract Google Drive File ID from URL or raw ID
     */
    extractFileId(input: string): string | null {
        if (!input || typeof input !== 'string') return null;
        const trimmed = input.trim();

        // Pattern 1: /file/d/<ID>
        const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/);
        if (fileDMatch && fileDMatch[1]) {
            return fileDMatch[1];
        }

        // Pattern 2: ?id=<ID> or &id=<ID>
        const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]{20,})/);
        if (idParamMatch && idParamMatch[1]) {
            return idParamMatch[1];
        }

        // Pattern 3: raw alphanumeric ID (typically 25-50 chars)
        if (/^[a-zA-Z0-9_-]{25,50}$/.test(trimmed)) {
            return trimmed;
        }

        return null;
    }

    /**
     * Open Google Drive Picker to select video file
     */
    async selectVideoFile(): Promise<GoogleDriveFile | null> {
        try {
            await this.initialize();
            const token = await this.requestAccessToken();

            return new Promise<GoogleDriveFile | null>((resolve, reject) => {
                if (!window.google?.picker) {
                    reject(new Error('Google Picker API not loaded'));
                    return;
                }

                try {
                    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS_VIDEOS)
                        .setMimeTypes('video/mp4,video/x-matroska,video/avi,video/quicktime,video/x-msvideo')
                        .setMode(window.google.picker.DocsViewMode.LIST);

                    const builder = new window.google.picker.PickerBuilder()
                        .addView(view)
                        .setOAuthToken(token)
                        .setAppId(CLIENT_ID)
                        .setCallback((data: GooglePickerResponse) => {
                            if (data.action === window.google.picker.Action.PICKED) {
                                const file = data.docs?.[0];
                                if (file) {
                                    resolve({
                                        id: file.id,
                                        name: file.name,
                                        mimeType: file.mimeType,
                                        size: file.sizeBytes,
                                    });
                                } else {
                                    resolve(null);
                                }
                            } else if (data.action === window.google.picker.Action.CANCEL) {
                                resolve(null);
                            }
                        })
                        .setOrigin(window.location.origin);

                    if (API_KEY) {
                        builder.setDeveloperKey(API_KEY);
                    }

                    const picker = builder.build();
                    picker.setVisible(true);
                } catch (pickerErr) {
                    reject(pickerErr);
                }
            });
        } catch (error) {
            console.error('Error selecting file from Google Drive:', error);
            throw error;
        }
    }

    /**
     * Get streaming URL for Google Drive video
     */
    getStreamingUrl(fileId: string): string {
        if (API_KEY) {
            return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
        }
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    /**
     * Get alternative download URL
     */
    getDownloadUrl(fileId: string): string {
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return !!this.accessToken;
    }

    /**
     * Clear authentication
     */
    clearAuth(): void {
        this.accessToken = null;
    }
}

export const GoogleDriveService = new GoogleDriveServiceClass();
