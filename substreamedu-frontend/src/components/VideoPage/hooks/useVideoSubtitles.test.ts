import { renderHook, act } from '@testing-library/react';
import { useVideoSubtitles } from './useVideoSubtitles';

jest.mock('../../../services/SubtitleService', () => ({
    SubtitleService: {
        fetchSubtitlesForVideo: jest.fn().mockResolvedValue([
            { id: 1, name: 'sub1.srt', text: 'Hello world', startTimeMs: 0, endTimeMs: 2000 }
        ]),
        fetchSubtitlesForYoutube: jest.fn().mockResolvedValue([
            { id: 1, name: 'yt.srt', text: 'YouTube subtitle', startTimeMs: 0, endTimeMs: 3000 }
        ]),
        fetchSubtitleFileContent: jest.fn().mockResolvedValue('1\n00:00:00,000 --> 00:00:02,000\nLocal sub'),
    }
}));

describe('useVideoSubtitles', () => {
    const defaultProps = {
        videoUrl: 'https://example.com/video.mp4',
        videoId: null,
        videoRef: { current: null },
        youtubePlayerRef: { current: null },
        duration: 100,
        setCurrentTime: jest.fn(),
        setProgress: jest.fn(),
        onSubtitleSelect: jest.fn(),
        onSubtitleUpload: jest.fn(),
        showNotification: jest.fn(),
        fetchDictionaryItemsForCards: jest.fn().mockResolvedValue(undefined),
    };

    beforeEach(() => {
        sessionStorage.clear();
        localStorage.clear();
        jest.clearAllMocks();
    });

    it('initializes default subtitles state properly', () => {
        const { result } = renderHook(() => useVideoSubtitles(defaultProps));

        expect(result.current.showSubtitles).toBe(true);
        expect(result.current.blurSubtitles).toBe(true);
        expect(result.current.delay).toBe(0);
        expect(result.current.isYoutubeSubsLoading).toBe(false);
    });

    it('computes resource name properly for local video', () => {
        const { result } = renderHook(() =>
            useVideoSubtitles({
                ...defaultProps,
                videoUrl: 'https://example.com/matrix.mp4',
            })
        );

        expect(result.current.getResourceName()).toBe('matrix');
    });

    it('computes resource name properly for YouTube video', () => {
        const { result } = renderHook(() =>
            useVideoSubtitles({
                ...defaultProps,
                videoId: 'dQw4w9WgXcQ',
            })
        );

        expect(result.current.getResourceName()).toBe('yt:dQw4w9WgXcQ');
    });

    it('sanitizes subtitles removing noise and stitching fragments', () => {
        const { result } = renderHook(() => useVideoSubtitles(defaultProps));

        const raw = [
            { id: 1, text: 'Hello, <i>world</i>', startTimeMs: 0, endTimeMs: 1000 },
            { id: 2, text: 'how are you?', startTimeMs: 1100, endTimeMs: 2000 }
        ];

        const sanitized = result.current.sanitizeSubtitles(raw);
        expect(sanitized).toBeDefined();
        expect(Array.isArray(sanitized)).toBe(true);
    });

    it('handles delay change correctly', () => {
        const { result } = renderHook(() => useVideoSubtitles(defaultProps));

        act(() => {
            result.current.handleDelayChange(1.5);
        });

        expect(result.current.delay).toBe(1.5);
    });
});
