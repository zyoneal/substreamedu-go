import { axiosService } from './AxiosService';
import { AnalyticsService } from './AnalyticsService';
import { urls } from '../constants/urls';

jest.mock('./AxiosService', () => ({
  axiosService: {
    post: jest.fn().mockResolvedValue({ data: { success: true } }),
    get: jest.fn().mockResolvedValue({ data: {} }),
  },
}));

describe('AnalyticsService (Self-Hosted Telemetry)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    AnalyticsService.init();
  });

  it('tracks signup correctly with UTM parameters and anonymous ID', async () => {
    localStorage.setItem(
      'substreamedu_utm_params',
      JSON.stringify({ utm_source: 'telegram', utm_campaign: 'promo10' })
    );

    AnalyticsService.trackSignup('google', 'test@example.com');

    expect(axiosService.post).toHaveBeenCalledWith(
      urls.auth.events,
      expect.objectContaining({
        event: 'signup',
        anonymousId: expect.any(String),
        properties: expect.objectContaining({
          method: 'google',
          email: 'test@example.com',
          utm_source: 'telegram',
          utm_campaign: 'promo10',
        }),
      })
    );
  });

  it('tracks open_player with video attributes', async () => {
    AnalyticsService.trackOpenPlayer({
      source: 'youtube',
      videoUrl: 'https://youtube.com/watch?v=123',
      videoTitle: 'Test Video',
      hasSubtitles: true,
    });

    expect(axiosService.post).toHaveBeenCalledWith(
      urls.auth.events,
      expect.objectContaining({
        event: 'open_player',
        properties: expect.objectContaining({
          source: 'youtube',
          videoUrl: 'https://youtube.com/watch?v=123',
          videoTitle: 'Test Video',
          hasSubtitles: true,
        }),
      })
    );
  });

  it('tracks select_word correctly', async () => {
    AnalyticsService.trackSelectWord({
      text: 'call it a day',
      isSingleWord: false,
      sentence: "Let's call it a day.",
      source: 'youtube_123',
    });

    expect(axiosService.post).toHaveBeenCalledWith(
      urls.auth.events,
      expect.objectContaining({
        event: 'select_word',
        properties: expect.objectContaining({
          text: 'call it a day',
          isSingleWord: false,
          sentence: "Let's call it a day.",
          source: 'youtube_123',
        }),
      })
    );
  });

  it('tracks save_word with status', async () => {
    AnalyticsService.trackSaveWord({
      text: 'flabbergasted',
      translation: 'ошеломлённый',
      resourceName: 'youtube_123',
      status: 'success',
    });

    expect(axiosService.post).toHaveBeenCalledWith(
      urls.auth.events,
      expect.objectContaining({
        event: 'save_word',
        properties: expect.objectContaining({
          text: 'flabbergasted',
          translation: 'ошеломлённый',
          status: 'success',
        }),
      })
    );
  });

  it('tracks onboarding_hint_shown correctly', async () => {
    AnalyticsService.trackOnboardingHintShown({ source: 'video_player' });

    expect(axiosService.post).toHaveBeenCalledWith(
      urls.auth.events,
      expect.objectContaining({
        event: 'onboarding_hint_shown',
        properties: expect.objectContaining({
          source: 'video_player',
        }),
      })
    );
  });

  it('tracks onboarding_hint_dismissed correctly', async () => {
    AnalyticsService.trackOnboardingHintDismissed('selection');

    expect(axiosService.post).toHaveBeenCalledWith(
      urls.auth.events,
      expect.objectContaining({
        event: 'onboarding_hint_dismissed',
        properties: expect.objectContaining({
          reason: 'selection',
        }),
      })
    );
  });

  it('identifies user without dispatching unwhitelisted events', async () => {
    localStorage.setItem(
      'substreamedu_utm_params',
      JSON.stringify({ utm_source: 'google_ads' })
    );

    AnalyticsService.identify('user-uuid-123', { email: 'user@test.com', role: 'USER' });

    // identify should not send unwhitelisted HTTP event to backend
    expect(axiosService.post).not.toHaveBeenCalled();
  });

  it('correctly tracks return_d2 on Day 2 and prevents duplicate events', async () => {
    const userId = 'u-d2-test';

    // Set signup date to 26 hours ago
    const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000);

    AnalyticsService.checkAndTrackReturnD2(userId, yesterday.toISOString());

    expect(axiosService.post).toHaveBeenCalledWith(
      urls.auth.events,
      expect.objectContaining({
        event: 'return_d2',
        properties: expect.objectContaining({
          userId,
        }),
      })
    );

    // Second check should not duplicate
    jest.clearAllMocks();
    AnalyticsService.checkAndTrackReturnD2(userId, yesterday.toISOString());
    expect(axiosService.post).not.toHaveBeenCalled();
  });
});
