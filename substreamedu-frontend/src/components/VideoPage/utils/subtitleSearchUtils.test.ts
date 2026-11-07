import {
    extractVideoNameFromUrl,
    cleanSearchTitle,
    formatSrtTimestamp,
    buildSubtitleFileName,
} from './subtitleSearchUtils';

describe('subtitleSearchUtils', () => {
    describe('extractVideoNameFromUrl', () => {
        it('returns empty string for empty url', () => {
            expect(extractVideoNameFromUrl('')).toBe('');
        });

        it('returns stored filename for blob URLs if provided', () => {
            expect(extractVideoNameFromUrl('blob:http://localhost/xyz', 'My Movie.mp4')).toBe('My Movie.mp4');
        });

        it('returns empty string for blob URLs if no stored filename', () => {
            expect(extractVideoNameFromUrl('blob:http://localhost/xyz')).toBe('');
        });

        it('extracts and decodes filename from standard URL', () => {
            expect(extractVideoNameFromUrl('https://example.com/videos/The%20Matrix%201999.mp4')).toBe('The Matrix 1999');
        });
    });

    describe('cleanSearchTitle', () => {
        it('extracts series name, season and episode', () => {
            const result = cleanSearchTitle('Breaking.Bad.S01E03.720p.mkv');
            expect(result.episodeMatch).toBe(true);
            expect(result.seasonNumber).toBe(1);
            expect(result.episodeNumber).toBe(3);
            expect(result.targetTitle).toBe('Breaking Bad');
        });

        it('extracts movie year', () => {
            const result = cleanSearchTitle('Inception (2010).mp4');
            expect(result.extractedYear).toBe(2010);
            expect(result.cleanTitleWithoutYear).toBe('Inception');
        });
    });

    describe('formatSrtTimestamp', () => {
        it('formats milliseconds to standard SRT timestamp', () => {
            expect(formatSrtTimestamp(0)).toBe('00:00:00,000');
            expect(formatSrtTimestamp(3723004)).toBe('01:02:03,004');
        });
    });

    describe('buildSubtitleFileName', () => {
        it('cleans filename and appends .srt extension', () => {
            expect(buildSubtitleFileName('My Cool Video 2024.mp4')).toBe('My_Cool_Video_2024.srt');
        });

        it('caps filename length to 50 chars total including extension', () => {
            const longName = 'A'.repeat(100);
            const result = buildSubtitleFileName(longName);
            expect(result.length).toBe(50);
            expect(result.endsWith('.srt')).toBe(true);
        });
    });
});
