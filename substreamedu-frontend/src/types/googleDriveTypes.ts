export interface GoogleDriveFile {
    id: string;
    name: string;
    mimeType: string;
    size?: number;
    sizeBytes?: number; 
}

export interface GooglePickerResponse {
    action: string;
    docs?: GoogleDriveFile[];
}

export interface GoogleAuthResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
}

declare global {
    interface Window {
        google: {
            accounts: {
                oauth2: {
                    initTokenClient: (config: {
                        client_id: string;
                        scope: string;
                        callback: (response: GoogleAuthResponse) => void;
                    }) => {
                        requestAccessToken: () => void;
                    };
                };
            };
            picker: {
                api: {
                    load: (callback: () => void) => void;
                };
                DocsView: new (viewId?: any) => {
                    setMimeTypes: (mimeTypes: string) => any;
                    setMode: (mode: any) => any;
                };
                DocsViewMode: {
                    LIST: string;
                    GRID: string;
                };
                PickerBuilder: new () => {
                    addView: (view: any) => any;
                    setOAuthToken: (token: string) => any;
                    setDeveloperKey: (key: string) => any;
                    setCallback: (callback: (data: GooglePickerResponse) => void) => any;
                    setOrigin: (origin: string) => any;
                    build: () => {
                        setVisible: (visible: boolean) => void;
                    };
                };
                ViewId: {
                    DOCS_VIDEOS: string;
                    DOCS: string;
                };
                Action: {
                    PICKED: string;
                    CANCEL: string;
                };
            };
        };
        gapi: {
            load: (api: string, callback: () => void) => void;
            client: {
                init: (config: {
                    apiKey: string;
                    discoveryDocs: string[];
                }) => Promise<void>;
                drive: {
                    files: {
                        get: (params: { fileId: string; fields: string }) => Promise<any>;
                    };
                };
            };
        };
    }
}
