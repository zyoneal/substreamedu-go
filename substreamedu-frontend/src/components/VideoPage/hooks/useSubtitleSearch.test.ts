import { renderHook, act } from '@testing-library/react';
import { useSubtitleSearch, UseSubtitleSearchParams } from './useSubtitleSearch';
import { SubtitleService } from '../../../services/SubtitleService';

jest.mock('../../../services/SubtitleService', () => ({
    __esModule: true,
    SubtitleService: {
        searchSubtitlesSubDL: jest.fn(),
        downloadSubtitleFromSubDL: jest.fn(),
    },
    calculateSyncScore: jest.fn(() => ({ score: 85, reason: 'Great match' })),
}));

describe('useSubtitleSearch hook', () => {
    const mockShowNotification = jest.fn();
    const mockSetSubtitlesForVideo = jest.fn();
    const mockSetFileName = jest.fn();
    const mockSetSelectedSubtitle = jest.fn();
    const mockSanitizeSubtitles = jest.fn(subs => subs);
    const mockOnSubtitleUpload = jest.fn();

    const defaultParams: UseSubtitleSearchParams = {
        videoId: null,
        videoUrl: 'https://example.com/movies/Inception.2010.mp4',
        learningLanguage: 'en',
        videoRef: { current: null },
        duration: 120,
        subtitlesForVideo: null,
        setSubtitlesForVideo: mockSetSubtitlesForVideo,
        setFileName: mockSetFileName,
        setSelectedSubtitle: mockSetSelectedSubtitle,
        sanitizeSubtitles: mockSanitizeSubtitles,
        onSubtitleUpload: mockOnSubtitleUpload,
        showNotification: mockShowNotification,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        sessionStorage.clear();
    });

    it('initializes with default states', () => {
        const { result } = renderHook(() => useSubtitleSearch(defaultParams));
        expect(result.current.isSearchingSubtitles).toBe(false);
        expect(result.current.showSubtitleSearchModal).toBe(false);
        expect(result.current.showFilmSelection).toBe(false);
        expect(result.current.availableSubtitles).toEqual([]);
        expect(result.current.availableFilms).toEqual([]);
    });

    it('skips search when videoId is present (YouTube)', async () => {
        const { result } = renderHook(() => useSubtitleSearch({ ...defaultParams, videoId: 'yt-123' }));
        await act(async () => {
            await result.current.searchSubtitlesForVideo();
        });
        expect(SubtitleService.searchSubtitlesSubDL).not.toHaveBeenCalled();
    });

    it('opens film selection if video title is missing or generic', async () => {
        const { result } = renderHook(() => useSubtitleSearch({ ...defaultParams, videoUrl: '' }));
        await act(async () => {
            await result.current.searchSubtitlesForVideo();
        });
        expect(mockShowNotification).toHaveBeenCalled();
    });

    it('executes search and populates available subtitles', async () => {
        (SubtitleService.searchSubtitlesSubDL as jest.Mock).mockResolvedValueOnce({
            results: [{ name: 'Inception', year: 2010, sdId: 100 }],
            subtitles: [
                { id: 1, name: 'Inception.en.srt', releaseName: 'Inception.2010.720p', url: 'http://subdl/1' }
            ]
        });

        const { result } = renderHook(() => useSubtitleSearch(defaultParams));

        await act(async () => {
            await result.current.searchSubtitlesForVideo();
        });

        expect(result.current.isSearchingSubtitles).toBe(false);
        expect(result.current.showSubtitleSearchModal).toBe(true);
        expect(result.current.availableSubtitles.length).toBe(1);
    });

    it('discards temporary subtitles cleanly', () => {
        const { result } = renderHook(() => useSubtitleSearch(defaultParams));
        act(() => {
            result.current.handleDiscardTemporarySubtitles();
        });
        expect(mockSetSubtitlesForVideo).toHaveBeenCalledWith(null);
        expect(mockSetSelectedSubtitle).toHaveBeenCalledWith(null);
        expect(mockSetFileName).toHaveBeenCalledWith('');
    });
});
