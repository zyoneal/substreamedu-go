import React, { useEffect, useMemo, useState, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import AppRoutes from './routes/routes';
import Header from './components/Header';
import { urls } from './constants/urls';
import useAuth, { useBackgroundImage } from './hooks/useAuth';
import { setupInterceptors } from './services/AxiosService';
import { AuthContext } from './store/AuthContext';
import { LanguageContext } from "./components/LanguageContext";
import LoadingPage from "./components/LoadingPage/LoadingPage";
import { IntlProvider } from 'react-intl';
import TelegramFloatingButton from './components/ui/TelegramFloatingButton';
import PremiumLimitModal from './components/PremiumLimitModal';
import ScrollToTop from './components/ScrollToTop';
import { SUPPORTED_LANGUAGES } from './constants/languageConfig';

import enMessages from './locales/en.json';
import { AnalyticsService } from './services/AnalyticsService';
import { usePendingWordAutoSave } from './hooks/usePendingWordAutoSave';

const PendingSaveHandler: React.FC<{ isLoggedIn: boolean }> = ({ isLoggedIn }) => {
    const { savedNotification, setSavedNotification } = usePendingWordAutoSave(isLoggedIn);

    if (!savedNotification) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '80px',
            right: '24px',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: '#059669',
            color: '#ffffff',
            padding: '16px 24px',
            borderRadius: '16px',
            boxShadow: '0 24px 30px -10px rgba(0, 0, 0, 0.4)',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 600, fontSize: '15px' }}>
                <span style={{ fontSize: '18px' }}>🎉</span>
                <span>{savedNotification}</span>
                <button
                    onClick={() => setSavedNotification(null)}
                    style={{
                        marginLeft: 'auto',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255, 255, 255, 0.8)',
                        cursor: 'pointer',
                        fontSize: '18px',
                        padding: '2px 6px',
                    }}
                >
                    ✕
                </button>
            </div>
            
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.2)', paddingTop: '10px', marginTop: '2px', fontSize: '13px' }}>
                <div style={{ marginBottom: '8px', color: 'rgba(255,255,255,0.9)' }}>
                    Don't forget this word! Practice it tomorrow.
                </div>
                <a 
                    href="/telegramBot" 
                    onClick={() => setSavedNotification(null)}
                    style={{ 
                        display: 'inline-block',
                        background: '#ffffff',
                        color: '#059669',
                        padding: '6px 14px',
                        borderRadius: '100px',
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: '12px'
                    }}
                >
                    Connect Telegram Bot
                </a>
            </div>
        </div>
    );
};

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5,
            gcTime: 1000 * 60 * 30,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

const App: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { isLoggedIn, setIsLoggedIn, isLoading, authorities, setAuthorities } = useAuth(navigate);

    const [learningLanguage, setLearningLanguage] = useState('');
    const [fluentLanguage, setFluentLanguage] = useState(() => {
        const saved = localStorage.getItem('fluentLanguage');
        if (saved) {
            if (saved !== 'en' && SUPPORTED_LANGUAGES.some(l => l.code === saved)) {
                return saved;
            }
            try {
                localStorage.removeItem('fluentLanguage');
            } catch {}
        }
        const browserLang = typeof navigator !== 'undefined' && navigator.language ? navigator.language.split('-')[0].toLowerCase() : '';
        if (browserLang && browserLang !== 'en' && SUPPORTED_LANGUAGES.some(l => l.code === browserLang)) {
            try {
                localStorage.setItem('fluentLanguage', browserLang);
            } catch {}
            return browserLang;
        }
        return '';
    });

    const authContextValue = useMemo(
        () => ({
            isLoggedIn,
            setIsLoggedIn,
            authorities,
            setAuthorities
        }),
        [isLoggedIn, setIsLoggedIn, authorities, setAuthorities]
    );

    const [isPlayerActive, setIsPlayerActive] = useState(false);

    useEffect(() => {
        if (!['/videos', '/youtube-demo', '/demo', '/movies'].includes(location.pathname)) {
            setIsPlayerActive(false);
        }
    }, [location.pathname]);

    const languageContextValue = useMemo(
        () => ({
            learningLanguage,
            setLearningLanguage,
            fluentLanguage,
            setFluentLanguage,
            isPlayerActive,
            setIsPlayerActive,
        }),
        [learningLanguage, setLearningLanguage, fluentLanguage, setFluentLanguage, isPlayerActive, setIsPlayerActive]
    );

    const [premiumLimitType, setPremiumLimitType] = useState<'translation' | 'save' | 'guest_limit' | 'guest_save' | null>(null);

    useEffect(() => {
        AnalyticsService.init();
    }, []);

    useEffect(() => {
        const handleGuestLimit = () => setPremiumLimitType('guest_limit');
        const handleGuestSave = () => setPremiumLimitType('guest_save');
        const handlePremiumLimit = (e: Event) => {
            const customEvent = e as CustomEvent<{ type?: 'translation' | 'save' }>;
            const type = customEvent.detail?.type || 'save';
            setPremiumLimitType(type);
        };

        window.addEventListener('substreamedu:guest_limit_reached', handleGuestLimit);
        window.addEventListener('substreamedu:guest_save_reached', handleGuestSave);
        window.addEventListener('substreamedu:premium_limit_reached', handlePremiumLimit);

        return () => {
            window.removeEventListener('substreamedu:guest_limit_reached', handleGuestLimit);
            window.removeEventListener('substreamedu:guest_save_reached', handleGuestSave);
            window.removeEventListener('substreamedu:premium_limit_reached', handlePremiumLimit);
        };
    }, []);

    const interceptorsSetup = useRef(false);
    if (!interceptorsSetup.current) {
        setupInterceptors(setIsLoggedIn, navigate, setPremiumLimitType);
        interceptorsSetup.current = true;
    }

    const { loadOptimized } = useBackgroundImage(isLoggedIn);

    useEffect(() => {
        loadOptimized();
    }, [isLoggedIn, loadOptimized]);

    if (isLoading) {
        return <LoadingPage />;
    }

    const allowedPaths = ['/login', '/', '/demo', '/tt', '/movies', '/dictionary-demo', '/review-demo', '/songs-demo', '/subtitles-demo', '/texts-demo', '/youtube-demo', '/videos', '/dashboard', '/dictionary', '/songs', '/text-paste', '/subtitles', '/subscribe', '/learning'];

    if (!isLoggedIn && !allowedPaths.includes(location.pathname) && !location.pathname.startsWith('/dictionary/resources/') && !location.pathname.startsWith('/subtitles/') && !location.pathname.startsWith('/lesson/') && !location.pathname.startsWith('/learn/media/')) {
        return <Navigate to="/" />;
    }

    const isTiktokPage = location.pathname === '/tt';
    const isFlashcardsPage = location.pathname === '/learning';
    const isDictionaryItemsPage = location.pathname.startsWith('/dictionary/resources/');
    const isLoginPage = location.pathname === urls.login;

    return (
        <QueryClientProvider client={queryClient}>
            <GoogleOAuthProvider clientId="887938283003-7t4hh8127tcpkltcmseo2gkht3qm7vss.apps.googleusercontent.com">
                <AuthContext.Provider value={authContextValue}>
                    <LanguageContext.Provider value={languageContextValue}>
                        <IntlProvider locale="en" messages={enMessages}>
                            <PendingSaveHandler isLoggedIn={isLoggedIn} />
                            <div className="flex flex-col min-h-screen bg-canvas">
                                <ScrollToTop />
                                {!isTiktokPage && !isLoginPage && <Header />}
                                <main className="flex-1 bg-canvas pt-0 pb-0">
                                    <div className="min-h-full flex flex-col bg-canvas">
                                        <div className="flex-1 bg-canvas">
                                            <AppRoutes />
                                        </div>
                                    </div>
                                </main>
                                {!isTiktokPage && !isFlashcardsPage && !isDictionaryItemsPage && !isLoginPage && <TelegramFloatingButton />}
                            </div>
                        </IntlProvider>
                    </LanguageContext.Provider>
                </AuthContext.Provider>
                <PremiumLimitModal
                    type={premiumLimitType}
                    onClose={() => setPremiumLimitType(null)}
                />
            </GoogleOAuthProvider>
            <ReactQueryDevtools initialIsOpen={false} />
        </QueryClientProvider>
    );
};

export default App;