import { buildVideoJumpUrl, formatTimestampSec } from './videoTimestampUtils';

describe('formatTimestampSec', () => {
    it('formats seconds under one hour as m:ss', () => {
        expect(formatTimestampSec(0)).toBe('0:00');
        expect(formatTimestampSec(9)).toBe('0:09');
        expect(formatTimestampSec(252.8)).toBe('4:12');
    });

    it('formats seconds >= 3600 as h:mm:ss', () => {
        expect(formatTimestampSec(3665)).toBe('1:01:05');
    });

    it('handles negative or NaN values safely', () => {
        expect(formatTimestampSec(-3)).toBe('0:00');
        expect(formatTimestampSec(Number.NaN)).toBe('0:00');
    });
});

describe('buildVideoJumpUrl', () => {
    it('builds jump URL for YouTube resourceName (yt:<videoId>)', () => {
        expect(buildVideoJumpUrl('yt:dQw4w9WgXcQ', '', 83)).toBe(
            '/videos?videoUrl=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&t=83'
        );
    });

    it('prefers playable HTTP(S) sourceUrl when present', () => {
        expect(buildVideoJumpUrl('My Drive Movie', 'https://drive.google.com/file/d/123/view', 145.9)).toBe(
            '/videos?videoUrl=https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2F123%2Fview&t=145'
        );
    });

    it('returns null for local blob/file resources without HTTP(S) sourceUrl', () => {
        expect(buildVideoJumpUrl('local-movie.mp4', 'blob:https://app.local/123', 42)).toBeNull();
        expect(buildVideoJumpUrl('local-movie.mp4', '', 42)).toBeNull();
    });

    it('returns null when timestampSec is missing or negative', () => {
        expect(buildVideoJumpUrl('yt:dQw4w9WgXcQ', '', null)).toBeNull();
        expect(buildVideoJumpUrl('yt:dQw4w9WgXcQ', '', undefined)).toBeNull();
        expect(buildVideoJumpUrl('yt:dQw4w9WgXcQ', '', -1)).toBeNull();
    });
});
