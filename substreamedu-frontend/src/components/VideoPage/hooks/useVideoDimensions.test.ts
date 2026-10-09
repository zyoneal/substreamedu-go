import { renderHook, act } from '@testing-library/react';
import { useVideoDimensions } from './useVideoDimensions';
import { DEFAULT_COMPACT_WIDTH, DEFAULT_ASPECT_RATIO } from '../utils/videoDimensionUtils';

describe('useVideoDimensions', () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;

    beforeEach(() => {
        // Set standard laptop viewport 1440x900
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1440 });
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 900 });
    });

    afterEach(() => {
        Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: originalInnerWidth });
        Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: originalInnerHeight });
    });

    it('initializes with max fit enabled and calculates width based on window dimensions', () => {
        const mockVideoRef = { current: null };

        const { result } = renderHook(() =>
            useVideoDimensions({
                videoUrl: 'https://example.com/test.mp4',
                videoId: null,
                videoRef: mockVideoRef,
            })
        );

        expect(result.current.isMaxFit).toBe(true);
        expect(result.current.mediaAspectRatio).toBe(DEFAULT_ASPECT_RATIO);
        // (900 - 152) * 16/9 = 748 * 16/9 = 1329
        expect(result.current.playerWidth).toBe(1329);
    });

    it('toggles between max fit and compact theater mode', () => {
        const mockVideoRef = { current: null };

        const { result } = renderHook(() =>
            useVideoDimensions({
                videoUrl: 'https://example.com/test.mp4',
                videoId: null,
                videoRef: mockVideoRef,
            })
        );

        expect(result.current.isMaxFit).toBe(true);
        expect(result.current.playerWidth).toBe(1329);

        // Toggle to compact
        act(() => {
            result.current.toggleMaxFit();
        });

        expect(result.current.isMaxFit).toBe(false);
        expect(result.current.playerWidth).toBe(DEFAULT_COMPACT_WIDTH); // 1050

        // Toggle back to max fit
        act(() => {
            result.current.toggleMaxFit();
        });

        expect(result.current.isMaxFit).toBe(true);
        expect(result.current.playerWidth).toBe(1329);
    });

    it('adapts aspect ratio and recalculates width when video metadata loads', () => {
        const mockVideo = {
            videoWidth: 1200,
            videoHeight: 900, // 4:3 ratio (1.3333)
        } as HTMLVideoElement;
        const mockVideoRef = { current: mockVideo };
        const handleVideoMetadata = jest.fn();

        const { result } = renderHook(() =>
            useVideoDimensions({
                videoUrl: 'https://example.com/test.mp4',
                videoId: null,
                videoRef: mockVideoRef,
                handleVideoMetadata,
            })
        );

        act(() => {
            result.current.handleVideoMetadataWithAspect();
        });

        expect(handleVideoMetadata).toHaveBeenCalledTimes(1);
        expect(result.current.mediaAspectRatio).toBe(4 / 3);
        // 748 * 4/3 = 997
        expect(result.current.playerWidth).toBe(997);
    });

    it('updates playerWidth on window resize event', () => {
        const mockVideoRef = { current: null };

        const { result } = renderHook(() =>
            useVideoDimensions({
                videoUrl: 'https://example.com/test.mp4',
                videoId: null,
                videoRef: mockVideoRef,
            })
        );

        expect(result.current.playerWidth).toBe(1329);

        // Resize window to 1920x1080
        act(() => {
            window.innerWidth = 1920;
            window.innerHeight = 1080;
            window.dispatchEvent(new Event('resize'));
        });

        // (1080 - 152) * 16/9 = 928 * 16/9 = 1649
        expect(result.current.playerWidth).toBe(1649);
    });

    it('resets to max fit when videoId changes', () => {
        const mockVideoRef = { current: null };

        let videoId: string | null = null;
        const { result, rerender } = renderHook(() =>
            useVideoDimensions({
                videoUrl: 'https://example.com/test.mp4',
                videoId,
                videoRef: mockVideoRef,
            })
        );

        // Switch to compact mode
        act(() => {
            result.current.toggleMaxFit();
        });
        expect(result.current.isMaxFit).toBe(false);

        // Change videoId
        videoId = 'dQw4w9WgXcQ';
        rerender();

        expect(result.current.isMaxFit).toBe(true);
        expect(result.current.mediaAspectRatio).toBe(DEFAULT_ASPECT_RATIO);
    });
});
