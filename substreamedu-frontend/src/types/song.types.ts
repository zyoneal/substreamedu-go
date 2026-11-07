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

export interface SearchFilters {
    artist?: string;
    genre?: string[];
    yearFrom?: number;
    yearTo?: number;
    difficulty?: string[];
    hasLyrics?: boolean;
}

export interface SearchOptions {
    query: string;
    filters?: SearchFilters;
    limit?: number;
}
