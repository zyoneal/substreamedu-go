import { parsePlainText } from './txtParser';

describe('parsePlainText', () => {
    it('should parse chapters when chapter headings are present', () => {
        const text = `
Chapter 1: The Beginning
Once upon a time in a faraway land, there lived a young coder.

Chapter 2: The Journey
The journey was long and full of mysterious algorithms.
        `.trim();

        const book = parsePlainText(text, 'my_sample_book.txt');

        expect(book.title).toBe('my sample book');
        expect(book.author).toBe('Custom Upload');
        expect(book.isCustom).toBe(true);
        expect(book.chapters.length).toBe(2);
        expect(book.chapters[0].title).toBe('Chapter 1: The Beginning');
        expect(book.chapters[0].content).toContain('Once upon a time');
        expect(book.chapters[1].title).toBe('Chapter 2: The Journey');
        expect(book.chapters[1].content).toContain('mysterious algorithms');
        expect(book.totalWords).toBeGreaterThan(0);
    });

    it('should chunk into logical parts when no chapter headings are present', () => {
        const text = 'This is a continuous story without chapter markers. It just tells a lovely tale.';
        const book = parsePlainText(text, 'short_story.txt');

        expect(book.title).toBe('short story');
        expect(book.chapters.length).toBe(1);
        expect(book.chapters[0].title).toBe('Part 1');
        expect(book.chapters[0].content).toContain('continuous story');
    });
});
