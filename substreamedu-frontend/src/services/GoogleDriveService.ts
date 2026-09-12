import { GoogleDriveFile, GooglePickerResponse, GoogleAuthResponse } from '../types/googleDriveTypes';

const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';
const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY || '';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

class GoogleDriveServiceClass {
    private accessToken: string | null = null;
    private tokenClient: any = null;
    private pickerApiLoaded = false;

    /**
     * Initialize Google Drive API
     */
    async initialize(): Promise<void> {
        return new Promise((resolve, reject) => {
            // Load Google API client
            if (!window.gapi) {
                reject(new Error('Google API not loaded. Add script to index.html'));
                return;
            }

            window.gapi.load('client:picker', async () => {
                try {
                    await window.gapi.client.init({
                        apiKey: API_KEY,
                        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                    });

                    this.pickerApiLoaded = true;
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
    }

    /**
     * Initialize OAuth token client
     */
    private initTokenClient(): void {
        if (this.tokenClient || !window.google?.accounts?.oauth2) {
            return;
        }

        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (response: GoogleAuthResponse) => {
                if (response.access_token) {
                    this.accessToken = response.access_token;
                }
            },
        });
    }

    /**
     * Request access token
     */
    private async requestAccessToken(): Promise<string> {
        return new Promise((resolve, reject) => {
            if (!window.google?.accounts?.oauth2) {
                reject(new Error('Google Identity Services not loaded'));
                return;
            }

            this.initTokenClient();

            if (this.accessToken) {
                resolve(this.accessToken);
                return;
            }

            this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: (response: GoogleAuthResponse) => {
                    if (response.access_token) {
                        this.accessToken = response.access_token;
                        resolve(response.access_token);
                    } else {
                        reject(new Error('Failed to get access token'));
                    }
                },
            });

            this.tokenClient.requestAccessToken();
        });
    }

    /**
     * Open Google Drive Picker to select video file
     */
    async selectVideoFile(): Promise<GoogleDriveFile | null> {
        try {
            // Initialize if not done
            if (!this.pickerApiLoaded) {
                await this.initialize();
            }

            // Get access token
            const token = await this.requestAccessToken();

            // Create and show picker
            return new Promise((resolve) => {
                if (!window.google?.picker) {
                    throw new Error('Google Picker API not loaded');
                }

                const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS_VIDEOS)
                    .setMimeTypes('video/mp4,video/x-matroska,video/avi,video/quicktime,video/x-msvideo')
                    .setMode(window.google.picker.DocsViewMode.LIST);

                const picker = new window.google.picker.PickerBuilder()
                    .addView(view)
                    .setOAuthToken(token)
                    .setDeveloperKey(API_KEY)
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
                    .setOrigin(window.location.origin)
                    .build();

                picker.setVisible(true);
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
        // Google Drive provides direct access to files via this URL
        // For videos, this works for streaming
        return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`;
    }

    /**
     * Get alternative streaming URL (download link)
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
