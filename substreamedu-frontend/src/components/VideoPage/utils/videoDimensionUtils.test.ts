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
            // viewportHeight = 1080, overhead = 260 -> availableHeight = 820
            // maxWidthFromHeight = floor(820 * 16/9) = floor(1457.77) = 1457
            // maxWidthFromWidth = 1920 - 48 = 1872
            // maxAllowed = min(1457, 1872) = 1457
            const width = calculateMaxFitWidth(16 / 9, 1920, 1080);
            expect(width).toBe(1457);
        });

        it('calculates max fit width for 1440x900 laptop screen', () => {
            // viewportHeight = 900, overhead = 260 -> availableHeight = 640
            // maxWidthFromHeight = floor(640 * 16/9) = floor(1137.77) = 1137
            // maxWidthFromWidth = 1440 - 48 = 1392
            // maxAllowed = min(1137, 1392) = 1137
            const width = calculateMaxFitWidth(16 / 9, 1440, 900);
            expect(width).toBe(1137);
        });

        it('bounds by screen width on narrow mobile viewports', () => {
            // viewportWidth = 375, viewportHeight = 667
            // maxWidthFromWidth = 375 - 48 = 327
            // availableHeight = 667 - 260 = 407, maxWidthFromHeight = 723
            // maxAllowed = min(723, 327) = 327
            const width = calculateMaxFitWidth(16 / 9, 375, 667);
            expect(width).toBe(327);
        });

        it('clamps to MIN_PLAYER_WIDTH (320px) on ultra-narrow viewports', () => {
            const width = calculateMaxFitWidth(16 / 9, 300, 400);
            expect(width).toBe(MIN_PLAYER_WIDTH);
        });

        it('handles 4:3 aspect ratio correctly', () => {
            // availableHeight = 900 - 260 = 640 -> 640 * 4/3 = 853.33 -> 853
            const width = calculateMaxFitWidth(4 / 3, 1440, 900);
            expect(width).toBe(853);
        });

        it('handles vertical 9:16 aspect ratio correctly', () => {
            // availableHeight = 900 - 260 = 640 -> 640 * 9/16 = 360
            const width = calculateMaxFitWidth(9 / 16, 1440, 900);
            expect(width).toBe(360);
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
