import posthog from 'posthog-js';
import { AnalyticsService } from './AnalyticsService';

jest.mock('posthog-js', () => ({
  init: jest.fn(),
  identify: jest.fn(),
  reset: jest.fn(),
  capture: jest.fn(),
  register: jest.fn(),
}));

describe('AnalyticsService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    process.env = { ...originalEnv, REACT_APP_POSTHOG_KEY: 'test_key' };
    AnalyticsService.__resetForTesting();
    AnalyticsService.init('test_key');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('tracks signup correctly with UTM parameters', () => {
    localStorage.setItem(
      'substreamedu_utm_params',
      JSON.stringify({ utm_source: 'telegram', utm_campaign: 'promo10' })
    );
    process.env.REACT_APP_POSTHOG_KEY = 'test_key';

    AnalyticsService.trackSignup('google', 'test@example.com');

    expect(posthog.capture).toHaveBeenCalledWith(
      'signup',
      expect.objectContaining({
        method: 'google',
        email: 'test@example.com',
        utm_source: 'telegram',
        utm_campaign: 'promo10',
      })
    );
  });

  it('tracks open_player with video attributes', () => {
    process.env.REACT_APP_POSTHOG_KEY = 'test_key';

    AnalyticsService.trackOpenPlayer({
      source: 'youtube',
      videoUrl: 'https://youtube.com/watch?v=123',
      videoTitle: 'Test Video',
      hasSubtitles: true,
    });

    expect(posthog.capture).toHaveBeenCalledWith(
      'open_player',
      expect.objectContaining({
        source: 'youtube',
        videoUrl: 'https://youtube.com/watch?v=123',
        videoTitle: 'Test Video',
        hasSubtitles: true,
      })
    );
  });

  it('tracks select_word correctly', () => {
    process.env.REACT_APP_POSTHOG_KEY = 'test_key';

    AnalyticsService.trackSelectWord({
      text: 'call it a day',
      isSingleWord: false,
      sentence: "Let's call it a day.",
      source: 'youtube_123',
    });

    expect(posthog.capture).toHaveBeenCalledWith(
      'select_word',
      expect.objectContaining({
        text: 'call it a day',
        isSingleWord: false,
        sentence: "Let's call it a day.",
        source: 'youtube_123',
      })
    );
  });

  it('tracks save_word with status', () => {
    process.env.REACT_APP_POSTHOG_KEY = 'test_key';

    AnalyticsService.trackSaveWord({
      text: 'flabbergasted',
      translation: 'ошеломлённый',
      resourceName: 'youtube_123',
      status: 'success',
    });

    expect(posthog.capture).toHaveBeenCalledWith(
      'save_word',
      expect.objectContaining({
        text: 'flabbergasted',
        translation: 'ошеломлённый',
        status: 'success',
      })
    );
  });

  it('identifies user with traits and UTMs', () => {
    localStorage.setItem(
      'substreamedu_utm_params',
      JSON.stringify({ utm_source: 'google_ads' })
    );
    process.env.REACT_APP_POSTHOG_KEY = 'test_key';

    AnalyticsService.identify('user-uuid-123', { email: 'user@test.com', role: 'USER' });

    expect(posthog.identify).toHaveBeenCalledWith(
      'user-uuid-123',
      expect.objectContaining({
        email: 'user@test.com',
        role: 'USER',
        utm_source: 'google_ads',
      })
    );
  });

  it('correctly tracks return_d2 on Day 2 and prevents duplicate events', () => {
    process.env.REACT_APP_POSTHOG_KEY = 'test_key';
    const userId = 'u-d2-test';

    // Set signup date to exactly 24 hours ago
    const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000);

    AnalyticsService.checkAndTrackReturnD2(userId, yesterday.toISOString());

    expect(posthog.capture).toHaveBeenCalledWith(
      'return_d2',
      expect.objectContaining({
        userId,
      })
    );

    // Second check should not duplicate
    jest.clearAllMocks();
    AnalyticsService.checkAndTrackReturnD2(userId, yesterday.toISOString());
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
