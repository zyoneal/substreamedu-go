import {
    calculateMaxFitWidth,
    getVideoAspectRatio,
    DEFAULT_COMPACT_WIDTH,
    DEFAULT_ASPECT_RATIO,
    DEFAULT_VERTICAL_OVERHEAD,
    MIN_PLAYER_WIDTH,
} from './videoDimensionUtils';

describe('videoDimensionUtils', () => {
    describe('calculateMaxFitWidth', () => {
        it('calculates max fit width for standard 16:9 on 1920x1080 desktop', () => {
            // viewportHeight = 1080, overhead = 152 -> availableHeight = 928
            // maxWidthFromHeight = floor(928 * 16/9) = floor(1649.77) = 1649
            // maxWidthFromWidth = 1920 - 48 = 1872
            // maxAllowed = min(1649, 1872) = 1649
            const width = calculateMaxFitWidth(16 / 9, 1920, 1080);
            expect(width).toBe(1649);
        });

        it('calculates max fit width for 1440x900 laptop screen', () => {
            // viewportHeight = 900, overhead = 152 -> availableHeight = 748
            // maxWidthFromHeight = floor(748 * 16/9) = floor(1329.77) = 1329
            // maxWidthFromWidth = 1440 - 48 = 1392
            // maxAllowed = min(1329, 1392) = 1329
            const width = calculateMaxFitWidth(16 / 9, 1440, 900);
            expect(width).toBe(1329);
        });

        it('bounds by screen width on narrow mobile viewports', () => {
            // viewportWidth = 375, viewportHeight = 667
            // maxWidthFromWidth = 375 - 48 = 327
            // availableHeight = 667 - 152 = 515, maxWidthFromHeight = 915
            // maxAllowed = min(915, 327) = 327
            const width = calculateMaxFitWidth(16 / 9, 375, 667);
            expect(width).toBe(327);
        });

        it('clamps to MIN_PLAYER_WIDTH (320px) on ultra-narrow viewports', () => {
            const width = calculateMaxFitWidth(16 / 9, 300, 400);
            expect(width).toBe(MIN_PLAYER_WIDTH);
        });

        it('handles 4:3 aspect ratio correctly', () => {
            // availableHeight = 900 - 152 = 748 -> 748 * 4/3 = 997.33 -> 997
            const width = calculateMaxFitWidth(4 / 3, 1440, 900);
            expect(width).toBe(997);
        });

        it('handles vertical 9:16 aspect ratio correctly', () => {
            // availableHeight = 900 - 152 = 748 -> 748 * 9/16 = 420.75 -> 420
            const width = calculateMaxFitWidth(9 / 16, 1440, 900);
            expect(width).toBe(420);
        });

        it('falls back to 16:9 when invalid ratio is supplied', () => {
            const widthZero = calculateMaxFitWidth(0, 1440, 900);
            const widthNegative = calculateMaxFitWidth(-1, 1440, 900);
            const widthStandard = calculateMaxFitWidth(DEFAULT_ASPECT_RATIO, 1440, 900);

            expect(widthZero).toBe(widthStandard);
            expect(widthNegative).toBe(widthStandard);
        });

        it('supports custom vertical overhead', () => {
            // overhead = 200 -> availableHeight = 900 - 200 = 700
            // 700 * 16/9 = 1244
            const width = calculateMaxFitWidth(16 / 9, 1440, 900, 200);
            expect(width).toBe(1244);
        });
    });

    describe('getVideoAspectRatio', () => {
        it('calculates ratio from videoWidth and videoHeight', () => {
            const mockVideo = {
                videoWidth: 1920,
                videoHeight: 1080,
            } as HTMLVideoElement;

            expect(getVideoAspectRatio(mockVideo)).toBeCloseTo(16 / 9, 4);
        });

        it('returns fallback ratio when video element is null', () => {
            expect(getVideoAspectRatio(null, 4 / 3)).toBe(4 / 3);
            expect(getVideoAspectRatio(null)).toBe(DEFAULT_ASPECT_RATIO);
        });

        it('returns fallback ratio when video dimensions are zero or invalid', () => {
            const mockVideo = {
                videoWidth: 0,
                videoHeight: 0,
            } as HTMLVideoElement;

            expect(getVideoAspectRatio(mockVideo, 21 / 9)).toBe(21 / 9);
        });
    });
});
