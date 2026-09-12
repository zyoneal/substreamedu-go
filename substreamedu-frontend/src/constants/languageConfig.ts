export interface LanguageConfig {
    code: string;
    label: string;
    englishName: string;
    dir: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
    { code: 'ar', label: 'العربية', englishName: 'Arabic', dir: 'rtl' },
    { code: 'es', label: 'Español', englishName: 'Spanish', dir: 'ltr' },
    { code: 'id', label: 'Indonesian', englishName: 'Indonesian', dir: 'ltr' },
    { code: 'pl', label: 'Polski', englishName: 'Polish', dir: 'ltr' },
    { code: 'pt', label: 'Português', englishName: 'Portuguese', dir: 'ltr' },
    { code: 'ru', label: 'Русский', englishName: 'Russian', dir: 'ltr' },
    { code: 'tr', label: 'Türkçe', englishName: 'Turkish', dir: 'ltr' },
    { code: 'uk', label: 'Українська', englishName: 'Ukrainian', dir: 'ltr' },
    { code: 'vi', label: 'Tiếng Việt', englishName: 'Vietnamese', dir: 'ltr' },
];

export const REGION_CONFIG: Record<string, { primary: string; sensitive: string[] }> = {
    'UA': { primary: 'uk', sensitive: [] },
    'RU': { primary: 'ru', sensitive: [] },
    'PL': { primary: 'pl', sensitive: [] },
    'TR': { primary: 'tr', sensitive: [] },
    'ID': { primary: 'id', sensitive: [] },
    'VN': { primary: 'vi', sensitive: [] },
    'BR': { primary: 'pt', sensitive: [] }, 
    'PT': { primary: 'pt', sensitive: [] }, 
    'ES': { primary: 'es', sensitive: [] }, 
    'MX': { primary: 'es', sensitive: [] }, 
    'AR': { primary: 'es', sensitive: [] }, 
    'US': { primary: 'es', sensitive: [] },
    'GB': { primary: 'pl', sensitive: [] },
};
