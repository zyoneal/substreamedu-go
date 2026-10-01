import { axiosService } from './AxiosService';
import { urls } from '../constants/urls';
import { AuthService } from './AuthService';
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
const ANON_ID_STORAGE_KEY = 'substreamedu_anonymous_id';

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

const getOrCreateAnonymousId = (): string => {
  if (typeof window === 'undefined') return 'server_side';
  try {
    let anonId = localStorage.getItem(ANON_ID_STORAGE_KEY);
    if (!anonId) {
      anonId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(ANON_ID_STORAGE_KEY, anonId);
    }
    return anonId;
  } catch {
    return 'fallback_anon';
  }
};

const sendBackendEvent = async (eventName: string, properties: Record<string, any> = {}): Promise<void> => {
  const anonymousId = getOrCreateAnonymousId();
  const userId = AuthService.getUserId() || undefined;
  const utms = getStoredUTMs();

  const payload = {
    event: eventName,
    properties: {
      ...utms,
      ...properties,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      pathname: typeof window !== 'undefined' ? window.location.pathname : '',
    },
    anonymousId,
    userId,
  };

  debugLog(`[Analytics] ${eventName}:`, payload);

  try {
    await axiosService.post(urls.auth.events, payload);
  } catch (err) {
    debugLog(`[Analytics] Non-fatal delivery failed for ${eventName}:`, err);
  }
};

export const AnalyticsService = {
  init: (): void => {
    captureAndPersistUTMs();
    getOrCreateAnonymousId();
    debugLog('[Analytics] Native analytics service initialized');
  },

  identify: (userId: string, traits: Record<string, any> = {}): void => {
    if (!userId) return;
    debugLog('[Analytics] User identified:', userId, traits);
  },

  reset: (): void => {
    debugLog('[Analytics] Reset session');
  },

  trackSignup: (method: 'google' | 'otp', email?: string, extra: Record<string, any> = {}): void => {
    sendBackendEvent('signup', {
      method,
      email,
      ...extra,
    });
  },

  trackOpenPlayer: (props: OpenPlayerProps): void => {
    sendBackendEvent('open_player', props);
  },

  trackSelectWord: (props: SelectWordProps): void => {
    sendBackendEvent('select_word', props);
  },

  trackSaveWord: (props: SaveWordProps): void => {
    sendBackendEvent('save_word', props);
  },

  trackReturnD2: (props: ReturnD2Props): void => {
    sendBackendEvent('return_d2', props);
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

    // Calendar day 1 or window between 20h and 54h
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
