import { cleanSubtitleText, cleanSubtitleSelection } from './subtitleCleaner';

describe('subtitleCleaner', () => {
    describe('cleanSubtitleText', () => {
        it('handles null, undefined, or empty string gracefully', () => {
            expect(cleanSubtitleText(null)).toBe('');
            expect(cleanSubtitleText(undefined)).toBe('');
            expect(cleanSubtitleText('')).toBe('');
        });

        it('replaces ASS hard line break \\N with a newline', () => {
            const input = 'He will be\\Nif anyone finds out about this accident.';
            expect(cleanSubtitleText(input)).toBe(
                'He will be\nif anyone finds out about this accident.'
            );
        });

        it('strips ASS italics override tags {\\i1} and {\\i0}', () => {
            const input = "{\\i1}I'm Teagan Tao.{\\i0}";
            expect(cleanSubtitleText(input)).toBe("I'm Teagan Tao.");
        });

        it('handles ASS hard line breaks with punctuation', () => {
            const input = 'Remember, stay within your pace,\\Nkeep it steady. You got this!';
            expect(cleanSubtitleText(input)).toBe(
                'Remember, stay within your pace,\nkeep it steady. You got this!'
            );
        });

        it('formats dialogue with \\N and inline italics tags cleanly', () => {
            const input = '- Go, Teagan, whoo!\\N- {\\i1}...tries.{\\i0}';
            expect(cleanSubtitleText(input)).toBe(
                '- Go, Teagan, whoo!\n- ...tries.'
            );
        });

        it('strips complex ASS tags like alignment, colors, and positioning', () => {
            const input = '{\\an8\\c&H00FFFF&\\pos(192,200)}Special Announcement';
            expect(cleanSubtitleText(input)).toBe('Special Announcement');
        });

        it('replaces ASS hard space \\h with a regular space', () => {
            const input = 'WordOne\\hWordTwo';
            expect(cleanSubtitleText(input)).toBe('WordOne WordTwo');
        });

        it('strips HTML formatting tags <i>, <b>, <font>', () => {
            const input = '<i>Italics</i>, <b>Bold</b>, and <font color="#fff">Font</font>';
            expect(cleanSubtitleText(input)).toBe('Italics, Bold, and Font');
        });

        it('decodes common HTML entities and cleans directional marks', () => {
            const input = '&lrm;It&#39;s a &quot;great&quot; day &amp; night&nbsp;test';
            expect(cleanSubtitleText(input)).toBe('It\'s a "great" day & night test');
        });
    });

    describe('cleanSubtitleSelection', () => {
        it('collapses multi-line ASS text into a clean single line for dictionary selection', () => {
            const input = 'He will be\\Nif anyone finds out about this accident.';
            expect(cleanSubtitleSelection(input)).toBe(
                'He will be if anyone finds out about this accident.'
            );
        });

        it('strips tags and normalizes spaces for dialogue', () => {
            const input = '- Go, Teagan, whoo!\\N- {\\i1}...tries.{\\i0}';
            expect(cleanSubtitleSelection(input)).toBe(
                '- Go, Teagan, whoo! - ...tries.'
            );
        });
    });
});
