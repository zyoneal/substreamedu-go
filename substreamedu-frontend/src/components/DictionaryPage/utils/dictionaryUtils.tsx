import React from 'react';
import { Play, Film, Music, Type, Folder } from 'lucide-react';

export interface DictionaryResource {
    groupName: string;
    numberOfWords: number;
    createdAt?: string;
    lastModified?: string;
    sampleWords?: string[];
}

export interface DictionaryItem {
    id: number;
    resourceName: string;
    highlightedText: string | null;
    translatedText: string | null;
    context: string | null;
    note: string | null;
    definition: string | null;
    imageUrl: string | null;
    transcription: string | null;
    tags?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    lastReviewed?: string;
    reviewCount?: number;
    nextReview?: string;
    mastered?: boolean;
}

export interface SourceCategory {
    type: 'youtube' | 'movies' | 'songs' | 'text' | 'other';
    name: string;
    icon: React.ElementType;
    tag: string;
    color: string;
    resources: DictionaryResource[];
}

export const ITEMS_PER_PAGE = 20;
export const SEARCH_DEBOUNCE_MS = 300;

export const escapeRegExp = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const getHighlightedParts = (
    text: string,
    term: string,
    highlightClass?: string
): (string | JSX.Element)[] => {
    const normalizedTerm = term.trim();
    if (!text || !normalizedTerm) return [text];
    try {
        const pattern = new RegExp(`(${escapeRegExp(normalizedTerm)})`, 'gi');
        const segments = text.split(pattern);
        return segments.map((segment, index) => {
            if (segment.toLowerCase() === normalizedTerm.toLowerCase()) {
                return (
                    <span key={index} className={highlightClass}>
                        {segment}
                    </span>
                );
            }
            return segment;
        });
    } catch {
        return [text];
    }
};

export const getSourceType = (resourceName: string): 'youtube' | 'movies' | 'songs' | 'text' | 'other' => {
    const name = resourceName.trim().toLowerCase();

    if (name === 'youtube' || name === 'video subtitle' || name.startsWith('yt:')) {
        return 'youtube';
    }
    if (name.endsWith('.srt')) {
        return 'movies';
    }
    if (name === 'pasted text') {
        return 'text';
    }

    return 'songs';
};

export const getSourceIcon = (sourceType: string): React.ElementType => {
    switch (sourceType) {
        case 'youtube': return Play;
        case 'movies': return Film;
        case 'text': return Type;
        case 'songs': return Music;
        default: return Folder;
    }
};
