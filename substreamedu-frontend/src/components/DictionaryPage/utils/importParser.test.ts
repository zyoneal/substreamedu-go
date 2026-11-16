import { MAX_IMPORT_BATCH, parseImportText } from './importParser';

describe('parseImportText', () => {
    it('parses quoted CSV, TSV, semicolon, dash, and plain lines while skipping headers', () => {
        const raw = [
            'word,translation,definition,context,note',
            '"call it a day",закончить на сегодня,"stop working","Let us call it a day.",idiom',
            'serendipity\tсчастливая случайность',
            'resilient;стойкий',
            'ubiquitous - вездесущий',
            'ephemeral',
        ].join('\n');

        const result = parseImportText(raw);
        expect(result.truncatedCount).toBe(0);
        expect(result.items).toEqual([
            {
                word: 'call it a day',
                translation: 'закончить на сегодня',
                definition: 'stop working',
                context: 'Let us call it a day.',
                note: 'idiom',
            },
            {
                word: 'serendipity',
                translation: 'счастливая случайность',
                definition: undefined,
                context: undefined,
                note: undefined,
            },
            {
                word: 'resilient',
                translation: 'стойкий',
                definition: undefined,
                context: undefined,
                note: undefined,
            },
            {
                word: 'ubiquitous',
                translation: 'вездесущий',
                definition: undefined,
                context: undefined,
                note: undefined,
            },
            {
                word: 'ephemeral',
                translation: undefined,
                definition: undefined,
                context: undefined,
                note: undefined,
            },
        ]);
    });

    it('deduplicates case-insensitively and caps at MAX_IMPORT_BATCH', () => {
        const lines = ['Apple', 'apple', ...Array.from({ length: 205 }, (_, i) => `word_${i}`)];
        const result = parseImportText(lines.join('\n'));
        expect(result.items).toHaveLength(MAX_IMPORT_BATCH);
        expect(result.truncatedCount).toBe(6);
    });
});
