import { decodeHtmlEntities, highlightStoryText, SessionWord } from './storyHighlightUtils';

describe('storyHighlightUtils', () => {
    describe('decodeHtmlEntities', () => {
        it('decodes standard html entities', () => {
            expect(decodeHtmlEntities('&quot;hello&quot; &amp; world')).toBe('"hello" & world');
        });

        it('returns plain string unchanged', () => {
            expect(decodeHtmlEntities('simple text')).toBe('simple text');
        });
    });

    describe('highlightStoryText', () => {
        const sessionWords: SessionWord[] = [
            { word: 'apple', translation: 'яблоко', definition: 'a fruit', context: 'an apple a day' },
            { word: 'book', translation: 'книга', definition: 'reading material', context: 'read a book' },
        ];

        it('returns empty string if text is null or empty', () => {
            expect(highlightStoryText(null, sessionWords, 'dicWord')).toBe('');
            expect(highlightStoryText('', sessionWords, 'dicWord')).toBe('');
        });

        it('returns original text if sessionWords is empty', () => {
            expect(highlightStoryText('An apple on the table', [], 'dicWord')).toBe('An apple on the table');
        });

        it('wraps matching words in span with data-translation', () => {
            const html = highlightStoryText('I read an apple and a book.', sessionWords, 'dicWord');
            expect(html).toContain('<span class="dicWord" data-translation="яблоко">apple</span>');
            expect(html).toContain('<span class="dicWord" data-translation="книга">book</span>');
        });

        it('respects word boundaries so it does not match inside other words', () => {
            const html = highlightStoryText('pineapple is tasty and bookstore is open', sessionWords, 'dicWord');
            expect(html).not.toContain('<span class="dicWord"');
            expect(html).toBe('pineapple is tasty and bookstore is open');
        });
    });
});
