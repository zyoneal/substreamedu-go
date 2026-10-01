import posthog from 'posthog-js';
import { debugLog } from '../utils/debug';

export interface UTMParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  ref?: string;
  [key: string]: string | undefined;
}

export interface OpenPlayerProps {
  source: 'youtube' | 'upload' | 'googledrive' | 'onboarding' | 'demo';
  videoUrl?: string;
  videoTitle?: string;
  hasSubtitles?: boolean;
}

export interface SelectWordProps {
  text: string;
  isSingleWord: boolean;
  sentence?: string;
  source?: string;
}

export interface SaveWordProps {
  text: string;
  translation?: string;
  resourceName?: string;
  status: 'success' | 'failed' | 'guest_blocked';
}

export interface ReturnD2Props {
  userId: string;
  signupDate?: string;
  daysSinceSignup?: number;
}

const UTM_STORAGE_KEY = 'substreamedu_utm_params';
let isInitialized = false;

const getStoredUTMs = (): UTMParams => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const captureAndPersistUTMs = (): UTMParams => {
  if (typeof window === 'undefined') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref'];
    const freshUtms: UTMParams = {};
    let hasFresh = false;

    utmKeys.forEach((key) => {
      const val = params.get(key);
      if (val) {
        freshUtms[key] = val;
        hasFresh = true;
      }
    });

    if (hasFresh) {
      const existing = getStoredUTMs();
      const merged = { ...existing, ...freshUtms };
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch {
    // Graceful degradation on localStorage disabled
  }
  return getStoredUTMs();
};

export const AnalyticsService = {
  __resetForTesting: (): void => {
    isInitialized = false;
  },

  init: (forceKey?: string): void => {
    const apiKey = forceKey || process.env.REACT_APP_POSTHOG_KEY;
    const apiHost = process.env.REACT_APP_POSTHOG_HOST || 'https://us.i.posthog.com';

    if (isInitialized || typeof window === 'undefined') return;

    if (!apiKey) {
      debugLog('PostHog: REACT_APP_POSTHOG_KEY not set. Operating in debug mode.');
      captureAndPersistUTMs();
      isInitialized = true;
      return;
    }

    try {
      posthog.init(apiKey, {
        api_host: apiHost,
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
        autocapture: true,
        session_recording: {
          maskAllInputs: true,
          maskInputOptions: {
            password: true,
          },
        },
        loaded: (ph) => {
          const utms = captureAndPersistUTMs();
          if (Object.keys(utms).length > 0) {
            ph.register(utms);
          }
        },
      });
      isInitialized = true;
      debugLog('PostHog initialized successfully');
    } catch (err) {
      console.warn('PostHog failed to initialize:', err);
    }
  },

  identify: (userId: string, traits: Record<string, any> = {}): void => {
    if (!userId) return;
    const utms = getStoredUTMs();
    const enrichedTraits = {
      ...utms,
      ...traits,
      last_identified_at: new Date().toISOString(),
    };

    if (process.env.REACT_APP_POSTHOG_KEY && isInitialized) {
      posthog.identify(userId, enrichedTraits);
    } else {
      debugLog('Analytics (identify):', userId, enrichedTraits);
    }
  },

  reset: (): void => {
    if (process.env.REACT_APP_POSTHOG_KEY && isInitialized) {
      posthog.reset();
    } else {
      debugLog('Analytics (reset)');
    }
  },

  trackSignup: (method: 'google' | 'otp', email?: string, extra: Record<string, any> = {}): void => {
    const utms = getStoredUTMs();
    const payload = {
      method,
      email,
      ...utms,
      ...extra,
      timestamp: new Date().toISOString(),
    };

    if (process.env.REACT_APP_POSTHOG_KEY && isInitialized) {
      posthog.capture('signup', payload);
    } else {
      debugLog('Analytics (signup):', payload);
    }
  },

  trackOpenPlayer: (props: OpenPlayerProps): void => {
    const payload = {
      ...props,
      timestamp: new Date().toISOString(),
    };

    if (process.env.REACT_APP_POSTHOG_KEY && isInitialized) {
      posthog.capture('open_player', payload);
    } else {
      debugLog('Analytics (open_player):', payload);
    }
  },

  trackSelectWord: (props: SelectWordProps): void => {
    const payload = {
      ...props,
      timestamp: new Date().toISOString(),
    };

    if (process.env.REACT_APP_POSTHOG_KEY && isInitialized) {
      posthog.capture('select_word', payload);
    } else {
      debugLog('Analytics (select_word):', payload);
    }
  },

  trackSaveWord: (props: SaveWordProps): void => {
    const payload = {
      ...props,
      timestamp: new Date().toISOString(),
    };

    if (process.env.REACT_APP_POSTHOG_KEY && isInitialized) {
      posthog.capture('save_word', payload);
    } else {
      debugLog('Analytics (save_word):', payload);
    }
  },

  trackReturnD2: (props: ReturnD2Props): void => {
    const payload = {
      ...props,
      timestamp: new Date().toISOString(),
    };

    if (process.env.REACT_APP_POSTHOG_KEY && isInitialized) {
      posthog.capture('return_d2', payload);
    } else {
      debugLog('Analytics (return_d2):', payload);
    }
  },

  checkAndTrackReturnD2: (userId: string, createdAtInput?: string | Date | null): void => {
    if (!userId || typeof window === 'undefined') return;

    const trackKey = `substreamedu_return_d2_${userId}`;
    try {
      if (localStorage.getItem(trackKey) === 'true') {
        return;
      }
    } catch {
      return;
    }

    let signupTime: number | null = null;
    if (createdAtInput) {
      const d = new Date(createdAtInput);
      if (!isNaN(d.getTime())) {
        signupTime = d.getTime();
      }
    }

    if (!signupTime) {
      try {
        const stored = localStorage.getItem(`substreamedu_signup_date_${userId}`);
        if (stored) {
          const d = new Date(stored);
          if (!isNaN(d.getTime())) {
            signupTime = d.getTime();
          }
        }
      } catch {}
    }

    if (!signupTime) {
      try {
        localStorage.setItem(`substreamedu_signup_date_${userId}`, new Date().toISOString());
      } catch {}
      return;
    }

    const now = Date.now();
    const diffHours = (now - signupTime) / (1000 * 60 * 60);

    const signupDate = new Date(signupTime);
    const currentDate = new Date(now);
    const day1 = new Date(signupDate.getFullYear(), signupDate.getMonth(), signupDate.getDate()).getTime();
    const day2 = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate()).getTime();
    const calendarDayDiff = Math.round((day2 - day1) / (1000 * 60 * 60 * 24));

    if (calendarDayDiff === 1 || (diffHours >= 20 && diffHours <= 54)) {
      AnalyticsService.trackReturnD2({
        userId,
        signupDate: new Date(signupTime).toISOString(),
        daysSinceSignup: calendarDayDiff,
      });
      try {
        localStorage.setItem(trackKey, 'true');
      } catch {}
    }
  },
};
