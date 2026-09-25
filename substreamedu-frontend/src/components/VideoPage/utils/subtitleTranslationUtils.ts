import { cleanSubtitleText, cleanSubtitleSelection } from '../../../utils/subtitleCleaner';
import { SelectionPosition } from '../types';

/**
 * Gets extended subtitle context by combining previous, current, and next subtitles.
 */
export const getExtendedSubtitleContext = (
    subtitlesForVideo: Array<{ text: string; [key: string]: any }> | null,
    currentSubtitle: string | null
): string => {
    if (!Array.isArray(subtitlesForVideo) || !currentSubtitle) {
        return cleanSubtitleSelection(currentSubtitle || '');
    }

    const currentIndex = subtitlesForVideo.findIndex(sub => sub.text === currentSubtitle);
    if (currentIndex === -1) {
        return cleanSubtitleSelection(currentSubtitle);
    }

    const contextParts: string[] = [];
    if (currentIndex > 0) {
        contextParts.push(cleanSubtitleText(subtitlesForVideo[currentIndex - 1].text));
    }
    contextParts.push(cleanSubtitleText(currentSubtitle));
    if (currentIndex < subtitlesForVideo.length - 1) {
        contextParts.push(cleanSubtitleText(subtitlesForVideo[currentIndex + 1].text));
    }

    return cleanSubtitleSelection(contextParts.join(' '));
};

/**
 * Finds the whole sentence containing the selected text using punctuation,
 * boundary matching, or a surrounding contextual window.
 */
export const findSentenceForSubtitle = (
    selected: string | null,
    currentSubtitle: string | null,
    subtitlesForVideo: Array<{ text: string; [key: string]: any }> | null
): string | null => {
    if (!selected || !currentSubtitle) {
        return null;
    }

    try {
        const fullExtendedContext = getExtendedSubtitleContext(subtitlesForVideo, currentSubtitle);
        const cleanedContext = cleanSubtitleSelection(fullExtendedContext);
        const escapedSelection = selected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        const selectionIndex = cleanedContext.toLowerCase().indexOf(selected.toLowerCase());
        if (selectionIndex === -1) {
            return cleanSubtitleSelection(currentSubtitle);
        }

        // Strategy 1: Sentence with terminating punctuation
        const sentenceRegex = new RegExp(`[^.!?]*\\b${escapedSelection}\\b[^.!?]*[.!?]+`, 'gi');
        const sentenceMatches = cleanedContext.match(sentenceRegex);
        if (Array.isArray(sentenceMatches) && sentenceMatches.length > 0) {
            return cleanSubtitleSelection(sentenceMatches[0]);
        }

        // Strategy 2: Logical boundary matching
        const logicalBoundaryRegex = new RegExp(
            `(?:^|[.!?]\\s+)([^.!?]*\\b${escapedSelection}\\b[^.!?]*)(?:[.!?]|$)`,
            'gi'
        );
        const logicalMatches = cleanedContext.match(logicalBoundaryRegex);
        if (Array.isArray(logicalMatches) && logicalMatches.length > 0) {
            return cleanSubtitleSelection(logicalMatches[0].replace(/^[.!?]\s+/, ''));
        }

        // Strategy 3: Surrounding context window
        const words = cleanedContext.split(/\s+/);
        const selectedWords = selected.split(/\s+/);
        const selectedStartIndex = words.findIndex((_word, idx) => {
            const phrase = words.slice(idx, idx + selectedWords.length).join(' ');
            return phrase.toLowerCase() === selected.toLowerCase();
        });

        if (selectedStartIndex !== -1) {
            const contextWindowSize = 10;
            const startIdx = Math.max(0, selectedStartIndex - contextWindowSize);
            const endIdx = Math.min(words.length, selectedStartIndex + selectedWords.length + contextWindowSize);
            return words.slice(startIdx, endIdx).join(' ');
        }

        return fullExtendedContext.length > currentSubtitle.length
            ? cleanedContext
            : cleanSubtitleSelection(currentSubtitle);
    } catch {
        return cleanSubtitleSelection(currentSubtitle);
    }
};

/**
 * Calculates popover positioning relative to portalParent and viewport boundaries.
 */
export const calculatePopoverPosition = (
    range: Range,
    subtitleContainerClass?: string
): SelectionPosition | null => {
    try {
        const rect = range.getBoundingClientRect();
        if (!rect || rect.width === 0) return null;

        const portalParent = (document.fullscreenElement || document.body) as HTMLElement;
        const parentRect = portalParent.getBoundingClientRect();

        const node = range.commonAncestorContainer;
        const element = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
        const subtitleContainerEl = subtitleContainerClass
            ? (element?.closest(`.${subtitleContainerClass}`) as HTMLElement | null)
            : (element?.closest('[class*="currentSubtitleContainer"]') as HTMLElement | null);
        const containerRect = subtitleContainerEl?.getBoundingClientRect();

        const estimatedPopoverHeight = 350;
        const minPopoverHeight = 150;
        const minPopoverWidth = 160;

        let showBelow = false;
        let isConstrained = false;
        let maxHeight: number | undefined = undefined;

        const topBoundary = containerRect ? containerRect.top : rect.top;
        const bottomBoundary = containerRect ? containerRect.bottom : rect.bottom;

        const spaceAbove = topBoundary;
        const spaceBelow = window.innerHeight - bottomBoundary;
        const GAP = 8;

        let x = rect.left - parentRect.left + (rect.width / 2);
        const minX = -parentRect.left + minPopoverWidth;
        const maxX = -parentRect.left + window.innerWidth - minPopoverWidth;
        if (x < minX) x = minX;
        if (x > maxX) x = maxX;

        let y: number;
        if (spaceAbove >= estimatedPopoverHeight) {
            y = topBoundary - parentRect.top - GAP;
            showBelow = false;
        } else if (spaceBelow >= estimatedPopoverHeight) {
            showBelow = true;
            y = bottomBoundary - parentRect.top + GAP;
        } else if (spaceBelow > spaceAbove) {
            showBelow = true;
            isConstrained = true;
            y = bottomBoundary - parentRect.top + GAP;
            maxHeight = Math.max(spaceBelow - 20, minPopoverHeight);
        } else {
            showBelow = false;
            isConstrained = true;
            y = topBoundary - parentRect.top - GAP;
            maxHeight = Math.max(spaceAbove - 20, minPopoverHeight);
        }

        return {
            x,
            y,
            showBelow,
            isConstrained,
            maxHeight,
        };
    } catch {
        return null;
    }
};
