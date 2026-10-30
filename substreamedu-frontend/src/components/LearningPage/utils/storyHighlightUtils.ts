export interface SessionWord {
    word: string;
    translation: string;
    definition: string;
    context: string;
}

/**
 * Decodes HTML entities safely in browser environments and Node/SSR.
 */
export const decodeHtmlEntities = (str: string): string => {
    if (!str) return '';
    if (typeof document === 'undefined') {
        return str
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>');
    }
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
};

/**
 * Highlights vocabulary words present in the story text by wrapping them
 * in span elements with data-translation attributes for interactive tooltips.
 */
export const highlightStoryText = (
    text: string | null,
    sessionWords: SessionWord[],
    dictionaryWordClass: string
): string => {
    if (!text || sessionWords.length === 0) return text || '';

    let result = text;
    const sortedWords = [...sessionWords].sort((a, b) => b.word.length - a.word.length);

    const allMatches: Array<{
        start: number;
        end: number;
        translation: string;
        definition: string;
        originalText: string;
    }> = [];

    const lowerText = text.toLowerCase();

    for (const item of sortedWords) {
        const searchTerm = item.word.toLowerCase();
        let searchIndex = 0;

        while (searchIndex < text.length) {
            const foundIndex = lowerText.indexOf(searchTerm, searchIndex);
            if (foundIndex === -1) break;

            const isWordStart = foundIndex === 0 || !/[a-zA-Z0-9]/.test(text[foundIndex - 1]);
            const isWordEnd = foundIndex + searchTerm.length === text.length || !/[a-zA-Z0-9]/.test(text[foundIndex + searchTerm.length]);

            if (isWordStart && isWordEnd) {
                const overlap = allMatches.some(m =>
                    (foundIndex >= m.start && foundIndex < m.end) ||
                    (foundIndex + searchTerm.length > m.start && foundIndex + searchTerm.length <= m.end)
                );

                if (!overlap) {
                    allMatches.push({
                        start: foundIndex,
                        end: foundIndex + searchTerm.length,
                        translation: item.translation,
                        definition: item.definition,
                        originalText: text.slice(foundIndex, foundIndex + searchTerm.length)
                    });
                }
            }
            searchIndex = foundIndex + 1;
        }
    }

    allMatches.sort((a, b) => b.start - a.start);

    for (const match of allMatches) {
        const tooltipText = (match.translation && match.translation.trim()) ? match.translation : (match.definition || '');
        const escapedTooltip = tooltipText.replace(/"/g, '&quot;');
        const spanHtml = `<span class="${dictionaryWordClass}" data-translation="${escapedTooltip}">${match.originalText}</span>`;
        result = result.slice(0, match.start) + spanHtml + result.slice(match.end);
    }

    return result;
};
