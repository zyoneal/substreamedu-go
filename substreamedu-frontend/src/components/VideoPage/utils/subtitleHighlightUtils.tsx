import React from 'react';
import { cleanSubtitleText } from '../../../utils/subtitleCleaner';
import { DictionaryItem } from '../types';
import styles from '../css/VideoPlayerPopover.module.css';

/**
 * Formats raw subtitle text for display: strips ASS tags, collapses duplicate whitespace,
 * and ensures dialogue lines start with '- '.
 */
export const formatSubtitleForDisplay = (text: string): string => {
    if (!text) return '';

    // 1. Sanitize ASS/SSA tags, HTML markup, and convert \N into \n
    let formatted = cleanSubtitleText(text);

    // 2. Collapse non-dialogue newlines into a single space
    formatted = formatted.replace(/\n(?![ \t]*[-–—])/g, ' ');

    // 3. Ensure dialogue lines start on fresh lines with '- '
    formatted = formatted.replace(/([^\n])\s+[-–—]\s+/g, '$1\n- ');
    formatted = formatted.replace(/\s+[-–—]\s+/g, '\n- ');

    // 4. Collapse duplicate horizontal spaces and trim
    return formatted.replace(/[ \t]{2,}/g, ' ').trim();
};

export interface MatchResult {
    found: boolean;
    isValid?: boolean;
    start?: number;
    end?: number;
    nextSearchIndex: number;
}

export function findPhraseMatch(text: string, searchPhrase: string, startIndex: number): MatchResult {
    const foundIndex = text.toLowerCase().indexOf(searchPhrase.toLowerCase(), startIndex);

    if (foundIndex === -1) {
        return { found: false, nextSearchIndex: text.length };
    }

    const isWordStart = foundIndex === 0 || !/[a-zA-Z]/.test(text[foundIndex - 1]);

    if (!isWordStart) {
        return {
            found: true,
            isValid: false,
            start: foundIndex,
            end: foundIndex + searchPhrase.length,
            nextSearchIndex: foundIndex + 1
        };
    }

    const endIndex = foundIndex + searchPhrase.length;
    const remainingText = text.slice(endIndex);

    let punctuationLength = 0;
    let hasValidEnd = false;

    if (remainingText.length === 0) {
        hasValidEnd = true;
    } else {
        for (let i = 0; i < remainingText.length; i++) {
            const char = remainingText[i];
            if (/[.,!?;:"']/.test(char)) {
                punctuationLength++;
            } else if (/\s/.test(char)) {
                hasValidEnd = true;
                break;
            } else if (/[a-zA-Z]/.test(char)) {
                break;
            } else {
                hasValidEnd = true;
                break;
            }
        }

        if (punctuationLength > 0 && punctuationLength === remainingText.length) {
            hasValidEnd = true;
        }
    }

    return {
        found: true,
        isValid: hasValidEnd,
        start: foundIndex,
        end: endIndex + punctuationLength,
        nextSearchIndex: foundIndex + 1
    };
}

const VALID_ENDINGS = [
    "s", "es", "’s", "ed", "d", "ing",
    "er", "r", "est",
    "ly",
    "ness", "ment", "ion", "tion", "sion", "ity",
    "or", "ist", "ship", "hood", "dom",
    "able", "ible", "ous", "ful", "less", "al", "ic", "ish", "y",
    "ize", "ise", "en", "ify",
    "ward", "wards", "wise"
];

export function findWordMatch(text: string, searchTerm: string, startIndex: number): MatchResult {
    const foundIndex = text.toLowerCase().indexOf(searchTerm.toLowerCase(), startIndex);

    if (foundIndex === -1) {
        return { found: false, nextSearchIndex: text.length };
    }

    const isWordStart = foundIndex === 0 || !/[a-zA-Z]/.test(text[foundIndex - 1]);

    if (!isWordStart) {
        return {
            found: true,
            isValid: false,
            start: foundIndex,
            end: foundIndex + searchTerm.length,
            nextSearchIndex: foundIndex + 1
        };
    }

    const remainingText = text.slice(foundIndex + searchTerm.length);

    if (remainingText.length === 0 || !/[a-zA-Z]/.test(remainingText[0])) {
        return {
            found: true,
            isValid: true,
            start: foundIndex,
            end: foundIndex + searchTerm.length,
            nextSearchIndex: foundIndex + 1
        };
    }

    for (const ending of VALID_ENDINGS) {
        if (remainingText.toLowerCase().startsWith(ending)) {
            const afterEnding = remainingText.slice(ending.length);

            if (afterEnding.length === 0 || !/[a-zA-Z]/.test(afterEnding[0])) {
                return {
                    found: true,
                    isValid: true,
                    start: foundIndex,
                    end: foundIndex + searchTerm.length,
                    nextSearchIndex: foundIndex + searchTerm.length + ending.length
                };
            }
        }
    }

    return {
        found: true,
        isValid: false,
        start: foundIndex,
        end: foundIndex + searchTerm.length,
        nextSearchIndex: foundIndex + 1
    };
}

export function isRangeOverlapping(
    start: number,
    end: number,
    existingRanges: Array<{ start: number; end: number }>
): boolean {
    return existingRanges.some(range => start < range.end && end > range.start);
}

/**
 * Highlights dictionary words within subtitle text with tooltips and styling.
 */
export const renderHighlightedSubtitle = (
    text: string,
    highlightedWords: DictionaryItem[],
    customWordClass?: string
): React.ReactNode => {
    if (!text) return null;

    const wordMap = new Map<string, { translations: string[] }>();

    for (const item of highlightedWords) {
        const searchTerm = item.highlightedText.trim().toLowerCase();
        if (!searchTerm) continue;

        if (!wordMap.has(searchTerm)) {
            wordMap.set(searchTerm, { translations: [] });
        }

        const entry = wordMap.get(searchTerm)!;

        const translation = item.translatedText && item.translatedText.trim()
            ? item.translatedText.trim()
            : item.definition && item.definition.trim()
                ? item.definition.trim()
                : null;

        if (translation) {
            entry.translations.push(translation);
        }
    }

    const sortedSearchTerms = Array.from(wordMap.keys()).sort((a, b) => b.length - a.length);

    const allMatches: Array<{
        start: number;
        end: number;
        translation: string;
        definition: string;
        originalText: string;
    }> = [];

    for (const searchTerm of sortedSearchTerms) {
        const entry = wordMap.get(searchTerm)!;
        const filteredTranslations = (Array.isArray(entry.translations) ? entry.translations : []).filter(
            t => t && t.trim().length > 0
        );
        const uniqueTranslations = Array.from(new Set(filteredTranslations));
        const translations = uniqueTranslations.join(', ');

        const isPhrase = searchTerm.includes(' ');
        let searchIndex = 0;

        while (searchIndex < text.length) {
            const matchResult = isPhrase
                ? findPhraseMatch(text, searchTerm, searchIndex)
                : findWordMatch(text, searchTerm, searchIndex);

            if (!matchResult.found) break;

            if (matchResult.isValid && !isRangeOverlapping(matchResult.start!, matchResult.end!, allMatches)) {
                const originalWord = text.slice(matchResult.start!, matchResult.end!);
                allMatches.push({
                    start: matchResult.start!,
                    end: matchResult.end!,
                    translation: translations,
                    definition: '',
                    originalText: originalWord
                });
            }

            searchIndex = matchResult.nextSearchIndex;
        }
    }

    allMatches.sort((a, b) => b.start - a.start);

    const escapeHtmlAttribute = (str: string) => {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    };

    let result = text;
    for (const match of allMatches) {
        const escapedTranslation = escapeHtmlAttribute(match.translation);
        const escapedDefinition = escapeHtmlAttribute(match.definition);
        const escapedOriginalText = match.originalText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const spanClass = customWordClass || styles.dictionaryWord;
        const spanHtml = `<span class="${spanClass}" data-translation="${escapedTranslation}" data-definition="${escapedDefinition}">${escapedOriginalText}</span>`;
        result = result.slice(0, match.start) + spanHtml + result.slice(match.end);
    }

    result = result.replace(/\n/g, '<br>');

    return <span key={highlightedWords.length} dangerouslySetInnerHTML={{ __html: result }} />;
};
