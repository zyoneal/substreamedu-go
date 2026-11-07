import { escapeRegExp, getSourceType, getHighlightedParts } from './dictionaryUtils';

describe('dictionaryUtils', () => {
    describe('escapeRegExp', () => {
        it('escapes special regex characters correctly', () => {
            expect(escapeRegExp('hello.world*test?')).toBe('hello\\.world\\*test\\?');
            expect(escapeRegExp('[a-z]+(foo)')).toBe('\\[a-z\\]\\+\\(foo\\)');
        });
    });

    describe('getSourceType', () => {
        it('identifies youtube sources', () => {
            expect(getSourceType('youtube')).toBe('youtube');
            expect(getSourceType('video subtitle')).toBe('youtube');
            expect(getSourceType('yt:RickAstley')).toBe('youtube');
        });

        it('identifies movies sources from .srt extension', () => {
            expect(getSourceType('Inception.srt')).toBe('movies');
            expect(getSourceType('Interstellar.SRT')).toBe('movies');
        });

        it('identifies text sources', () => {
            expect(getSourceType('pasted text')).toBe('text');
        });

        it('defaults other names to songs', () => {
            expect(getSourceType('Bohemian Rhapsody')).toBe('songs');
            expect(getSourceType('Coldplay - Yellow')).toBe('songs');
        });
    });

    describe('getHighlightedParts', () => {
        it('returns plain text array if term is empty', () => {
            expect(getHighlightedParts('hello world', '', 'hlClass')).toEqual(['hello world']);
        });

        it('splits text around matching term', () => {
            const parts = getHighlightedParts('an apple on tree', 'apple', 'hlClass');
            expect(parts).toHaveLength(3);
            expect(parts[0]).toBe('an ');
            expect(parts[2]).toBe(' on tree');
        });
    });
});
