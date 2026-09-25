/**
 * Pure utilities for video player aspect ratio calculation, zero-scroll max-fit width,
 * and theater mode layout geometry.
 */

export const DEFAULT_COMPACT_WIDTH = 1050;
export const DEFAULT_ASPECT_RATIO = 16 / 9;
export const DEFAULT_VERTICAL_OVERHEAD = 152; // Top header (76px) + control bar (~52px) + bottom padding (24px)
export const MIN_PLAYER_WIDTH = 320;
export const MIN_AVAILABLE_HEIGHT = 240;
export const HORIZONTAL_PADDING = 48;

/**
 * Calculates the maximum width in pixels that maximizes video area without
 * introducing vertical window scrollbars, bounded by available screen width.
 */
export const calculateMaxFitWidth = (
    ratio: number,
    viewportWidth: number,
    viewportHeight: number,
    verticalOverhead: number = DEFAULT_VERTICAL_OVERHEAD
): number => {
    const validRatio = ratio && ratio > 0 ? ratio : DEFAULT_ASPECT_RATIO;

    const availableHeight = Math.max(MIN_AVAILABLE_HEIGHT, viewportHeight - verticalOverhead);
    const maxWidthFromHeight = Math.floor(availableHeight * validRatio);
    const maxWidthFromWidth = Math.max(MIN_PLAYER_WIDTH, Math.floor(viewportWidth - HORIZONTAL_PADDING));
    const maxAllowed = Math.min(maxWidthFromHeight, maxWidthFromWidth);

    return Math.max(MIN_PLAYER_WIDTH, maxAllowed);
};

/**
 * Extracts the aspect ratio from an HTMLVideoElement if available, or returns fallback.
 */
export const getVideoAspectRatio = (
    video: HTMLVideoElement | null,
    fallbackRatio: number = DEFAULT_ASPECT_RATIO
): number => {
    if (video && video.videoWidth > 0 && video.videoHeight > 0) {
        return video.videoWidth / video.videoHeight;
    }
    return fallbackRatio > 0 ? fallbackRatio : DEFAULT_ASPECT_RATIO;
};
