import { AuthService } from './AuthService';
import { getGuestTranslationLimit } from '../constants/limits';

const GUEST_TRANSLATION_COUNT_KEY = 'substreamedu_guest_translation_count';
export const GUEST_MAX_TRANSLATIONS = getGuestTranslationLimit();

export interface PendingSaveWord {
  resourceName: string;
  highlightedText: string;
  context: string;
  extendedContext?: string;
  translation: string;
  note?: string;
  transcription?: string;
  definition?: string;
  imageUrl?: string;
  videoUrl?: string;
  timecode?: number;
  returnUrl?: string;
}

const PENDING_SAVE_WORD_KEY = 'substreamedu_pending_save_word';

export const GuestLimitService = {
  getLimit: (): number => getGuestTranslationLimit(),

  getCount: (): number => {
    try {
      return parseInt(localStorage.getItem(GUEST_TRANSLATION_COUNT_KEY) || '0', 10);
    } catch {
      return 0;
    }
  },

  getRemaining: (): number => {
    const count = GuestLimitService.getCount();
    return Math.max(0, getGuestTranslationLimit() - count);
  },

  hasReachedLimit: (): boolean => {
    return GuestLimitService.getCount() >= getGuestTranslationLimit();
  },

  incrementCount: (): number => {
    const next = GuestLimitService.getCount() + 1;
    localStorage.setItem(GUEST_TRANSLATION_COUNT_KEY, next.toString());
    return next;
  },

  resetCount: (): void => {
    localStorage.removeItem(GUEST_TRANSLATION_COUNT_KEY);
  },

  checkGuestTranslationAllowed: (): boolean => {
    // If user is logged in, guest limit does not apply
    if (AuthService.getUserEmail()) {
      return true;
    }
    if (GuestLimitService.hasReachedLimit()) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('substreamedu:guest_limit_reached'));
      }
      return false;
    }
    GuestLimitService.incrementCount();
    return true;
  },

  triggerGuestSavePrompt: (): void => {
    if (!AuthService.getUserEmail()) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('substreamedu:guest_save_reached'));
      }
    }
  },

  setPendingSaveWord: (data: PendingSaveWord): void => {
    try {
      localStorage.setItem(PENDING_SAVE_WORD_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to store pending save word:', e);
    }
  },

  getPendingSaveWord: (): PendingSaveWord | null => {
    try {
      const data = localStorage.getItem(PENDING_SAVE_WORD_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  clearPendingSaveWord: (): void => {
    try {
      localStorage.removeItem(PENDING_SAVE_WORD_KEY);
    } catch {}
  },
};

