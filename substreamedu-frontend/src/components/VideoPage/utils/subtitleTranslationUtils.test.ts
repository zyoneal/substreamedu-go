import {
    getExtendedSubtitleContext,
    findSentenceForSubtitle,
    calculatePopoverPosition,
} from './subtitleTranslationUtils';

describe('subtitleTranslationUtils', () => {
    describe('getExtendedSubtitleContext', () => {
        const mockSubtitles = [
            { text: 'First line of dialogue.' },
            { text: 'Second line with more context.' },
            { text: 'Third concluding line.' },
        ];

        it('returns combined previous, current, and next subtitles', () => {
            const result = getExtendedSubtitleContext(mockSubtitles, 'Second line with more context.');
            expect(result).toContain('First line of dialogue.');
            expect(result).toContain('Second line with more context.');
            expect(result).toContain('Third concluding line.');
        });

        it('handles boundary cases cleanly (first and last subtitles)', () => {
            const firstResult = getExtendedSubtitleContext(mockSubtitles, 'First line of dialogue.');
            expect(firstResult).toBe('First line of dialogue. Second line with more context.');

            const lastResult = getExtendedSubtitleContext(mockSubtitles, 'Third concluding line.');
            expect(lastResult).toBe('Second line with more context. Third concluding line.');
        });

        it('falls back to currentSubtitle when list is empty or null', () => {
            expect(getExtendedSubtitleContext(null, 'Single text')).toBe('Single text');
            expect(getExtendedSubtitleContext([], 'Single text')).toBe('Single text');
        });
    });

    describe('findSentenceForSubtitle', () => {
        const mockSubtitles = [
            { text: 'We need to move quickly.' },
            { text: 'The bridge is collapsing soon!' },
            { text: 'Follow me right now.' },
        ];

        it('extracts sentence with terminating punctuation', () => {
            const sentence = findSentenceForSubtitle('bridge', 'The bridge is collapsing soon!', mockSubtitles);
            expect(sentence).toBe('The bridge is collapsing soon!');
        });

        it('extracts sentence across adjacent subtitle boundaries', () => {
            const sentence = findSentenceForSubtitle('move', 'The bridge is collapsing soon!', mockSubtitles);
            expect(sentence).toBe('We need to move quickly.');
        });

        it('returns null if selected text or currentSubtitle is missing', () => {
            expect(findSentenceForSubtitle(null, 'hello', mockSubtitles)).toBeNull();
            expect(findSentenceForSubtitle('hello', null, mockSubtitles)).toBeNull();
        });
    });

    describe('calculatePopoverPosition', () => {
        it('returns null if rect width is 0 or range is invalid', () => {
            const mockRange = {
                getBoundingClientRect: jest.fn().mockReturnValue({ width: 0, height: 0 }),
                commonAncestorContainer: document.createElement('div'),
            } as unknown as Range;

            expect(calculatePopoverPosition(mockRange)).toBeNull();
        });

        it('calculates position centered over rect bounded by viewport', () => {
            const mockRange = {
                getBoundingClientRect: jest.fn().mockReturnValue({
                    left: 200,
                    top: 400,
                    bottom: 420,
                    width: 50,
                    height: 20,
                }),
                commonAncestorContainer: document.createElement('div'),
            } as unknown as Range;

            const pos = calculatePopoverPosition(mockRange);
            expect(pos).not.toBeNull();
            expect(pos?.x).toBe(225); // 200 + 50/2
            expect(pos?.y).toBeDefined();
        });
    });
});
