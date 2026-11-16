/**
 * Formats a non-negative video timestamp in seconds into mm:ss or h:mm:ss.
 */
export const formatTimestampSec = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '0:00';
    }
    const totalSec = Math.floor(seconds);
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    const secStr = secs < 10 ? `0${secs}` : `${secs}`;
    if (hrs > 0) {
        const minStr = mins < 10 ? `0${mins}` : `${mins}`;
        return `${hrs}:${minStr}:${secStr}`;
    }
    return `${mins}:${secStr}`;
};

/**
 * Builds an in-app /videos?videoUrl=...&t=... route for jumping to a saved word's
 * spoken timestamp when the source is a YouTube video (yt:<id>) or a playable HTTP(S) URL.
 * Returns null for local blob: files or entries without a valid timestamp.
 */
export const buildVideoJumpUrl = (
    resourceName?: string | null,
    sourceUrl?: string | null,
    timestampSec?: number | null
): string | null => {
    if (timestampSec === null || timestampSec === undefined || !Number.isFinite(timestampSec) || timestampSec < 0) {
        return null;
    }

    const t = Math.floor(timestampSec);
    const trimmedSource = (sourceUrl || '').trim();
    if (trimmedSource.startsWith('http://') || trimmedSource.startsWith('https://')) {
        return `/videos?videoUrl=${encodeURIComponent(trimmedSource)}&t=${t}`;
    }

    const trimmedResource = (resourceName || '').trim();
    if (trimmedResource.startsWith('yt:') && trimmedResource.length > 3) {
        const videoId = trimmedResource.slice(3);
        const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
        return `/videos?videoUrl=${encodeURIComponent(ytUrl)}&t=${t}`;
    }

    return null;
};
