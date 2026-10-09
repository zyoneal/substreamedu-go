const mockAxiosGet = jest.fn();

jest.mock('axios', () => {
  const mAxios: any = {
    create: jest.fn(() => mAxios),
    get: (...args: any[]) => mockAxiosGet(...args),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return mAxios;
});

jest.mock('./AxiosService', () => ({
  __esModule: true,
  axiosService: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import { axiosService } from './AxiosService';
import { SubtitleService } from './SubtitleService';

describe('SubtitleService - fetchSubtitlesForYoutube', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('loads preset subtitles statically for curated video IDs', async () => {
    const mockSubs = [
      { id: 1, name: 'Preset Subtitle', startTimeMs: 0, endTimeMs: 1500, text: 'Hello' },
    ];
    mockAxiosGet.mockResolvedValueOnce({ data: mockSubs });

    const result = await SubtitleService.fetchSubtitlesForYoutube('hsUkTQ1YTOQ');

    expect(mockAxiosGet).toHaveBeenCalledWith('/subtitles/hsUkTQ1YTOQ.json');
    expect(axiosService.get).not.toHaveBeenCalled();
    expect(result).toEqual(mockSubs);
  });

  it('falls back to axiosService if preset fetch fails', async () => {
    const fallbackSubs = [
      { id: 1, name: 'Fallback Subtitle', startTimeMs: 0, endTimeMs: 1500, text: 'Fallback' },
    ];
    mockAxiosGet.mockRejectedValueOnce(new Error('Static file 404'));
    (axiosService.get as jest.Mock).mockResolvedValueOnce({ data: fallbackSubs });

    const result = await SubtitleService.fetchSubtitlesForYoutube('hsUkTQ1YTOQ');

    expect(mockAxiosGet).toHaveBeenCalledWith('/subtitles/hsUkTQ1YTOQ.json');
    expect(axiosService.get).toHaveBeenCalledWith('/api/subtitles/youtube/hsUkTQ1YTOQ');
    expect(result).toEqual(fallbackSubs);
  });

  it('fetches via axiosService directly for non-preset video IDs', async () => {
    const customSubs = [
      { id: 1, name: 'Custom Subtitle', startTimeMs: 0, endTimeMs: 2000, text: 'Custom' },
    ];
    (axiosService.get as jest.Mock).mockResolvedValueOnce({ data: customSubs });

    const result = await SubtitleService.fetchSubtitlesForYoutube('someOtherId123');

    expect(mockAxiosGet).not.toHaveBeenCalled();
    expect(axiosService.get).toHaveBeenCalledWith('/api/subtitles/youtube/someOtherId123');
    expect(result).toEqual(customSubs);
  });
});
