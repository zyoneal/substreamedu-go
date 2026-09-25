import { renderHook, act } from '@testing-library/react';
import { useVideoKeyboardShortcuts, UseVideoKeyboardShortcutsParams } from './useVideoKeyboardShortcuts';

describe('useVideoKeyboardShortcuts hook', () => {
    let mockPlayVideo: jest.Mock;
    let mockPauseVideo: jest.Mock;
    let mockSafePlay: jest.Mock;
    let mockResetPopoverState: jest.Mock;
    let mockToggleMaxFit: jest.Mock;
    let mockVideoElement: any;
    let mockYouTubePlayer: any;

    beforeEach(() => {
        mockPlayVideo = jest.fn();
        mockPauseVideo = jest.fn();
        mockSafePlay = jest.fn();
        mockResetPopoverState = jest.fn();
        mockToggleMaxFit = jest.fn();

        mockVideoElement = {
            currentTime: 20,
            paused: false,
            ontimeupdate: null,
        };

        mockYouTubePlayer = {
            getCurrentTime: jest.fn().mockReturnValue(30),
            seekTo: jest.fn(),
            getPlayerState: jest.fn().mockReturnValue(1), // Playing
            playVideo: jest.fn(),
            pauseVideo: jest.fn(),
        };
    });

    const createParams = (overrides: Partial<UseVideoKeyboardShortcutsParams> = {}): UseVideoKeyboardShortcutsParams => ({
        videoId: null,
        youtubePlayerRef: { current: null },
        videoRef: { current: mockVideoElement as HTMLVideoElement },
        playVideo: mockPlayVideo,
        pauseVideo: mockPauseVideo,
        safePlay: mockSafePlay,
        resetPopoverState: mockResetPopoverState,
        toggleMaxFit: mockToggleMaxFit,
        subtitlesForVideo: [
            { text: 'Hello world', startTimeMs: 1000, endTimeMs: 3000 },
            { text: 'Second line', startTimeMs: 4000, endTimeMs: 6000 },
        ],
        currentSubtitle: 'Hello world',
        disabled: false,
        ...overrides,
    });

    it('seeks +/- 4 seconds on HTML5 video via ArrowRight and ArrowLeft', () => {
        renderHook(() => useVideoKeyboardShortcuts(createParams()));

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
        });
        expect(mockVideoElement.currentTime).toBe(24);

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
        });
        expect(mockVideoElement.currentTime).toBe(20);
    });

    it('seeks +/- 4 seconds on YouTube video via ArrowRight and ArrowLeft', () => {
        renderHook(() =>
            useVideoKeyboardShortcuts(
                createParams({
                    videoId: 'abc12345',
                    youtubePlayerRef: { current: mockYouTubePlayer },
                    videoRef: { current: null },
                })
            )
        );

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
        });
        expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(34, true);

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft' }));
        });
        expect(mockYouTubePlayer.seekTo).toHaveBeenCalledWith(26, true);
    });

    it('toggles play/pause with Spacebar on HTML5 video', () => {
        mockVideoElement.paused = true;
        renderHook(() => useVideoKeyboardShortcuts(createParams()));

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        });
        expect(mockPlayVideo).toHaveBeenCalledTimes(1);

        mockVideoElement.paused = false;
        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        });
        expect(mockPauseVideo).toHaveBeenCalledTimes(1);
    });

    it('toggles play/pause with Spacebar on YouTube video', () => {
        renderHook(() =>
            useVideoKeyboardShortcuts(
                createParams({
                    videoId: 'yt-xyz',
                    youtubePlayerRef: { current: mockYouTubePlayer },
                    videoRef: { current: null },
                })
            )
        );

        // Current state is 1 (playing)
        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        });
        expect(mockYouTubePlayer.pauseVideo).toHaveBeenCalledTimes(1);

        mockYouTubePlayer.getPlayerState.mockReturnValue(2); // Paused
        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        });
        expect(mockYouTubePlayer.playVideo).toHaveBeenCalledTimes(1);
    });

    it('handles KeyT for max-fit and Escape for popover reset', () => {
        renderHook(() => useVideoKeyboardShortcuts(createParams()));

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT' }));
        });
        expect(mockToggleMaxFit).toHaveBeenCalledTimes(1);

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
        });
        expect(mockResetPopoverState).toHaveBeenCalledTimes(1);
    });

    it('ignores keydown when activeElement is an INPUT or TEXTAREA', () => {
        const input = document.createElement('input');
        document.body.appendChild(input);
        input.focus();

        renderHook(() => useVideoKeyboardShortcuts(createParams()));

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
        });
        expect(mockPlayVideo).not.toHaveBeenCalled();
        expect(mockPauseVideo).not.toHaveBeenCalled();

        document.body.removeChild(input);
    });

    it('ignores shortcuts when disabled is true', () => {
        renderHook(() => useVideoKeyboardShortcuts(createParams({ disabled: true })));

        act(() => {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' }));
        });
        expect(mockVideoElement.currentTime).toBe(20);
    });

    it('triggers repeat loop for current subtitle on HTML5 video', async () => {
        const { result } = renderHook(() => useVideoKeyboardShortcuts(createParams()));

        await act(async () => {
            await result.current.handleRepeatCurrentSubtitle();
        });

        expect(mockVideoElement.currentTime).toBe(1); // 1000ms / 1000 = 1s
        expect(mockSafePlay).toHaveBeenCalled();
        expect(mockVideoElement.ontimeupdate).toBeDefined();
    });
});
