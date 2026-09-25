import { render } from '@testing-library/react';
import {
    formatSubtitleForDisplay,
    findPhraseMatch,
    findWordMatch,
    renderHighlightedSubtitle,
} from './subtitleHighlightUtils';
import { DictionaryItem } from '../types';

describe('subtitleHighlightUtils', () => {
    describe('formatSubtitleForDisplay', () => {
        it('cleans ASS tags and hard breaks', () => {
            const raw = '{\\i1}Hello{\\i0}\\Nworld';
            expect(formatSubtitleForDisplay(raw)).toBe('Hello world');
        });

        it('preserves dialogue markers on newlines', () => {
            const dialogue = '- Hello there. - General Kenobi.';
            const result = formatSubtitleForDisplay(dialogue);
            expect(result).toContain('- Hello there.');
            expect(result).toContain('- General Kenobi.');
        });
    });

    describe('findPhraseMatch and findWordMatch', () => {
        it('finds word matches including common inflections', () => {
            const text = 'She is jumping very fast.';
            const match = findWordMatch(text, 'jump', 7);
            expect(match.found).toBe(true);
            expect(match.isValid).toBe(true);
        });

        it('finds multi-word phrases cleanly', () => {
            const text = 'Take into account the consequences.';
            const match = findPhraseMatch(text, 'take into account', 0);
            expect(match.found).toBe(true);
            expect(match.isValid).toBe(true);
        });
    });

    describe('renderHighlightedSubtitle', () => {
        const mockItems: DictionaryItem[] = [
            {
                id: 1,
                resourceName: 'test',
                highlightedText: 'apple',
                translatedText: 'яблоко',
                context: 'An apple a day.',
                definition: 'fruit',
            },
        ];

        it('wraps matching words in span with data attributes', () => {
            const node = renderHighlightedSubtitle('I ate an apple yesterday.', mockItems, 'testWord');
            const { container } = render(<>{node}</>);
            const span = container.querySelector('.testWord');
            expect(span).not.toBeNull();
            expect(span?.getAttribute('data-translation')).toBe('яблоко');
            expect(span?.textContent).toBe('apple');
        });

        it('returns null if text is empty', () => {
            expect(renderHighlightedSubtitle('', mockItems)).toBeNull();
        });
    });
});
