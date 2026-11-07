export const DEFAULT_GUEST_TRANSLATION_LIMIT = 15;

export const getGuestTranslationLimit = (): number => {
  const envVal = process.env.REACT_APP_GUEST_TRANSLATION_LIMIT;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_GUEST_TRANSLATION_LIMIT;
};
