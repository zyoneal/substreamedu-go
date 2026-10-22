export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface Chapter {
    id: string;
    title: string;
    content: string;
    wordCount: number;
}

export interface Book {
    id: string;
    title: string;
    author: string;
    level: CEFRLevel;
    description: string;
    coverGradient: string;
    accentColor: string;
    totalWords: number;
    estimatedMinutes: number;
    isCustom?: boolean;
    uploadedAt?: string;
    chapters: Chapter[];
}

export interface ReadingProgress {
    bookId: string;
    currentChapterId: string;
    scrollPercentage: number;
    lastReadAt: number;
    isCompleted: boolean;
}

export interface TextDictionaryItem {
    id?: number | string;
    resourceName?: string;
    highlightedText?: string;
    translatedText?: string;
    context?: string;
    definition?: string;
    normalizedText: string;
}
