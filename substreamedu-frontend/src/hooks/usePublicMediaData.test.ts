import { renderHook, waitFor } from '@testing-library/react';
import { usePublicMediaData } from './usePublicMediaData';
import { axiosService } from '../services/AxiosService';

jest.mock('../services/AxiosService', () => ({
  axiosService: {
    get: jest.fn(),
  },
}));

describe('usePublicMediaData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles unwrapped AxiosService response correctly', async () => {
    const mockPayload = {
      title: 'Interstellar (Docking Scene)',
      artistOrCreator: 'Christopher Nolan',
      type: 'movie',
      coverImageUrl: 'https://example.com/cover.jpg',
      snippet: ['Cooper: CASE, if I black out, you take the stick.'],
      highlightedWords: [{ word: 'black out', transcription: '/blæk aʊt/', translation: 'потерять сознание' }],
      slug: 'interstellar-docking-scene',
    };

    // When AxiosService unwraps, response.data IS the payload directly
    (axiosService.get as jest.Mock).mockResolvedValueOnce({
      data: mockPayload,
    });

    const { result } = renderHook(() => usePublicMediaData('interstellar-docking-scene'));

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPayload);
    expect(result.current.error).toBeNull();
  });

  it('handles wrapped response with success and data correctly', async () => {
    const mockPayload = {
      title: 'Shape of You',
      artistOrCreator: 'Ed Sheeran',
      type: 'song',
      coverImageUrl: 'https://example.com/shape.jpg',
      snippet: ['The club isn\'t the best place to find a lover'],
      highlightedWords: [{ word: 'lover', transcription: '/ˈlʌv.ər/', translation: 'любимый' }],
      slug: 'shape-of-you-ed-sheeran',
    };

    (axiosService.get as jest.Mock).mockResolvedValueOnce({
      data: {
        success: true,
        data: mockPayload,
      },
    });

    const { result } = renderHook(() => usePublicMediaData('shape-of-you-ed-sheeran'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockPayload);
    expect(result.current.error).toBeNull();
  });

  it('handles error response by setting error state', async () => {
    (axiosService.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePublicMediaData('unknown-slug'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBe('Content not found');
  });

  it('handles empty slug without making network request', () => {
    const { result } = renderHook(() => usePublicMediaData(''));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(axiosService.get).not.toHaveBeenCalled();
  });
});
