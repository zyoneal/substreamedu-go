import React from 'react';
import { cleanSubtitleText } from '../../../utils/subtitleCleaner';
import { getSrsTier, SrsTier } from '../../../utils/srsStatusUtils';
import {
    MatchResult,
    findPhraseMatch,
    findWordMatch,
} from '../../../utils/englishMorphology';
import { DictionaryItem } from '../types';
import styles from '../css/VideoPlayerPopover.module.css';

export type { MatchResult };
export { findPhraseMatch, findWordMatch };

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
    customWordClass?: string,
    onboardingUnderlineWords?: string[]
): React.ReactNode => {
    if (!text) return null;

    const wordMap = new Map<string, { translations: string[]; srsTier: SrsTier }>();

    for (const item of highlightedWords) {
        const searchTerm = item.highlightedText.trim().toLowerCase();
        if (!searchTerm) continue;

        const tier = getSrsTier(item.status, item.repetitionLevel);
        if (!wordMap.has(searchTerm)) {
            wordMap.set(searchTerm, { translations: [], srsTier: tier });
        }

        const entry = wordMap.get(searchTerm)!;
        if (tier === 'mastered' || (tier === 'learning' && entry.srsTier === 'new')) {
            entry.srsTier = tier;
        }

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
        srsTier: SrsTier;
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
                    originalText: originalWord,
                    srsTier: entry.srsTier,
                });
            }

            searchIndex = matchResult.nextSearchIndex;
        }
    }

    const underlineMatches: Array<{
        start: number;
        end: number;
        originalText: string;
    }> = [];

    if (onboardingUnderlineWords && onboardingUnderlineWords.length > 0) {
        let count = 0;
        for (const term of onboardingUnderlineWords) {
            if (count >= 2) break;
            const searchTerm = term.trim().toLowerCase();
            if (!searchTerm) continue;
            const isPhrase = searchTerm.includes(' ');
            const matchResult = isPhrase
                ? findPhraseMatch(text, searchTerm, 0)
                : findWordMatch(text, searchTerm, 0);

            if (
                matchResult.found &&
                matchResult.isValid &&
                !isRangeOverlapping(matchResult.start!, matchResult.end!, allMatches) &&
                !isRangeOverlapping(matchResult.start!, matchResult.end!, underlineMatches)
            ) {
                underlineMatches.push({
                    start: matchResult.start!,
                    end: matchResult.end!,
                    originalText: text.slice(matchResult.start!, matchResult.end!)
                });
                count++;
            }
        }
    }

    const escapeHtmlAttribute = (str: string) => {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    };

    const combinedMatches: Array<{
        start: number;
        end: number;
        html: string;
    }> = [];

    for (const match of allMatches) {
        const escapedTranslation = escapeHtmlAttribute(match.translation);
        const escapedDefinition = escapeHtmlAttribute(match.definition);
        const escapedOriginalText = match.originalText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        const tierClass = match.srsTier === 'mastered'
            ? styles.srsMastered
            : match.srsTier === 'learning'
                ? styles.srsLearning
                : styles.srsNew;
        const spanClass = customWordClass || `${styles.dictionaryWord} ${tierClass}`;
        const spanHtml = `<span class="${spanClass}" data-srs-tier="${match.srsTier}" data-translation="${escapedTranslation}" data-definition="${escapedDefinition}">${escapedOriginalText}</span>`;
        combinedMatches.push({
            start: match.start,
            end: match.end,
            html: spanHtml,
        });
    }

    for (const match of underlineMatches) {
        const escapedOriginalText = match.originalText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const spanHtml = `<span class="${styles.onboardingUnderline}">${escapedOriginalText}</span>`;
        combinedMatches.push({
            start: match.start,
            end: match.end,
            html: spanHtml,
        });
    }

    combinedMatches.sort((a, b) => b.start - a.start);

    let result = text;
    for (const match of combinedMatches) {
        result = result.slice(0, match.start) + match.html + result.slice(match.end);
    }

    result = result.replace(/\n/g, '<br>');

    return <span key={highlightedWords.length} dangerouslySetInnerHTML={{ __html: result }} />;
};
