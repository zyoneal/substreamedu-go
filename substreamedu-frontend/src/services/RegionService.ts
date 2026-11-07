import axios from 'axios';

const IP_API_URL = 'https://ipapi.co/json/';
const CACHE_KEY = 'detected_region_country';

export const RegionService = {
    getRegion: async (): Promise<string> => {
        try {
            
            const cachedRegion = sessionStorage.getItem(CACHE_KEY);
            if (cachedRegion) {
                return cachedRegion;
            }

            
            const response = await axios.get(IP_API_URL);
            const countryCode = response.data.country_code;

            if (countryCode) {
                sessionStorage.setItem(CACHE_KEY, countryCode);
                return countryCode;
            }
        } catch (error) {
            console.warn('Failed to detect region via IP, falling back to browser language', error);
        }

        
        const browserLang = navigator.language;
        const parts = browserLang.split('-');
        if (parts.length > 1) return parts[1];
        if (browserLang === 'uk') return 'UA';
        if (browserLang === 'ru') return 'RU';

        return 'US'; 
    }
};
