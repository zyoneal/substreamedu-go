import { parseSRT } from './srtParser';

describe('srtParser', () => {
    it('parses standard SRT format correctly', () => {
        const srtContent = `1
00:00:01,000 --> 00:00:03,000
Hello world!

2
00:00:04,500 --> 00:00:06,500
This is a test.
`;
        const result = parseSRT(srtContent, 'test.srt');
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            id: 1,
            name: 'test.srt',
            startTimeMs: 1000,
            endTimeMs: 3000,
            text: 'Hello world!'
        });
        expect(result[1]).toEqual({
            id: 2,
            name: 'test.srt',
            startTimeMs: 4500,
            endTimeMs: 6500,
            text: 'This is a test.'
        });
    });

    it('sanitizes ASS style tags and hard line breaks \\N during parsing', () => {
        const srtContent = `1
00:01:00,000 --> 00:01:05,000
{\\i1}I'm Teagan Tao.{\\i0}

2
00:01:06,000 --> 00:01:10,000
He will be\\Nif anyone finds out about this accident.

3
00:01:11,000 --> 00:01:15,000
- Go, Teagan, whoo!\\N- {\\i1}...tries.{\\i0}`;

        const result = parseSRT(srtContent, 'movie.srt');
        expect(result).toHaveLength(3);
        expect(result[0].text).toBe("I'm Teagan Tao.");
        expect(result[1].text).toBe("He will be\nif anyone finds out about this accident.");
        expect(result[2].text).toBe("- Go, Teagan, whoo!\n- ...tries.");
    });
});
