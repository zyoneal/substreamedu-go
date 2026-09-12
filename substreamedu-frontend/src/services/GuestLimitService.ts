import { AuthService } from './AuthService';

const GUEST_TRANSLATION_COUNT_KEY = 'substreamedu_guest_translation_count';
export const GUEST_MAX_TRANSLATIONS = 5;

export const GuestLimitService = {
  getCount: (): number => {
    try {
      return parseInt(localStorage.getItem(GUEST_TRANSLATION_COUNT_KEY) || '0', 10);
    } catch {
      return 0;
    }
  },

  getRemaining: (): number => {
    const count = GuestLimitService.getCount();
    return Math.max(0, GUEST_MAX_TRANSLATIONS - count);
  },

  hasReachedLimit: (): boolean => {
    return GuestLimitService.getCount() >= GUEST_MAX_TRANSLATIONS;
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
};
