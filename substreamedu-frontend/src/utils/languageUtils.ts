import { LanguageConfig, REGION_CONFIG, SUPPORTED_LANGUAGES } from '../constants/languageConfig';

export const getRecommendedLanguages = (
    currentUiLanguage: string,
    detectedRegion: string = 'US', 
    browserLanguage: string = 'en'
): LanguageConfig[] => {
    const recommendedSet = new Set<string>();

    if (currentUiLanguage && currentUiLanguage !== 'en') {
        recommendedSet.add(currentUiLanguage);
    }

    const regionConfig = REGION_CONFIG[detectedRegion];

    if (regionConfig) {
        const { primary, sensitive } = regionConfig;

        const isSensitive = sensitive.includes(primary);

        if ((!isSensitive || primary === currentUiLanguage) && primary !== 'en') {
            recommendedSet.add(primary);
        }
    }

    const browserLangCode = browserLanguage.split('-')[0].toLowerCase();
    const isRussianBrowser = browserLangCode === 'ru';

    return SUPPORTED_LANGUAGES.filter(lang => {
        if (lang.code === 'en') {
            return false;
        }
        if (lang.code === 'ru') {
            return isRussianBrowser;
        }
        return recommendedSet.has(lang.code);
    });
};

export const getSortedLanguages = (
    currentUiLanguage: string,
    _detectedRegion: string = 'US',
    browserLanguage: string = 'en'
): LanguageConfig[] => {
    const browserLangCode = browserLanguage.split('-')[0].toLowerCase();
    const isRussianBrowser = browserLangCode === 'ru';

    const languages = SUPPORTED_LANGUAGES.filter(lang => {
        if (lang.code === 'en') {
            return false;
        }
        if (lang.code === 'ru') {
            return isRussianBrowser;
        }
        return true;
    });

    return languages.sort((a, b) => {
        const locale = (currentUiLanguage && currentUiLanguage !== 'en') ? currentUiLanguage : 'en';
        return new Intl.Collator(locale).compare(a.label, b.label);
    });
};
