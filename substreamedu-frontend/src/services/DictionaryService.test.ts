jest.mock('axios', () => {
  const mAxios: any = {
    create: jest.fn(() => mAxios),
    get: jest.fn(),
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
  },
}));

import { DictionaryService } from './DictionaryService';
import { axiosService } from './AxiosService';

describe('DictionaryService & SRS Session Invariants', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchDashboardStats', () => {
    it('correctly maps session breakdown fields from backend', async () => {
      const mockBackendStats = {
        totalWords: 150,
        newWords: 24,
        dueToday: 2,
        learningWords: 5,
        sessionCards: 50,
        sessionDueCards: 2,
        sessionNewCards: 48,
        sessionNewWords: 24,
      };

      (axiosService.get as jest.Mock).mockResolvedValueOnce({
        data: {
          data: mockBackendStats,
        },
      });

      const stats = await DictionaryService.fetchDashboardStats();

      expect(stats.sessionCards).toBe(50);
      expect(stats.sessionDueCards).toBe(2);
      expect(stats.sessionNewCards).toBe(48);
      expect(stats.sessionNewWords).toBe(24);
      expect(stats.dueToday).toBe(2);
    });

    it('provides resilient fallbacks if session metrics are missing from backend', async () => {
      const mockLegacyStats = {
        totalWords: 100,
        newWords: 10,
        dueToday: 4,
        learningWords: 2,
      };

      (axiosService.get as jest.Mock).mockResolvedValueOnce({
        data: mockLegacyStats,
      });

      const stats = await DictionaryService.fetchDashboardStats();

      expect(stats.dueToday).toBe(4);
      expect(stats.sessionDueCards).toBe(4);
      expect(stats.sessionNewCards).toBe(46);
      expect(stats.sessionCards).toBe(50);
      expect(stats.sessionNewWords).toBe(23);
    });
  });

  describe('generateSessionSummary', () => {
    it('unwraps response.data.data when present', async () => {
      const mockSummary = {
        originalStory: 'Once upon a time in high school...',
        fluentStory: 'Once upon a time в старшей школе...',
        questions: ['Why was tenure important?'],
      };

      (axiosService.post as jest.Mock).mockResolvedValueOnce({
        data: {
          success: true,
          data: mockSummary,
        },
      });

      const result = await DictionaryService.generateSessionSummary(
        [{ word: 'tenure', meaning: 'permanent academic position' }],
        'en',
        'ru'
      );

      expect(result.originalStory).toBe(mockSummary.originalStory);
      expect(result.fluentStory).toBe(mockSummary.fluentStory);
      expect(result.questions).toEqual(mockSummary.questions);
    });

    it('handles direct response when not wrapped in data property', async () => {
      const mockSummary = {
        originalStory: 'Direct story...',
        fluentStory: 'Direct fluent story...',
        questions: ['Question 1?'],
      };

      (axiosService.post as jest.Mock).mockResolvedValueOnce({
        data: mockSummary,
      });

      const result = await DictionaryService.generateSessionSummary(
        [{ word: 'tenure', meaning: 'permanent academic position' }],
        'en',
        'ru'
      );

      expect(result.originalStory).toBe(mockSummary.originalStory);
      expect(result.fluentStory).toBe(mockSummary.fluentStory);
    });
  });
});
