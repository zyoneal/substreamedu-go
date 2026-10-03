import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VideoPlayer from '../VideoPlayer';
import Header from '../../Header';
import { LanguageContext } from '../../LanguageContext';
import { AuthContext } from '../../../store/AuthContext';
import enMessages from '../../../locales/en.json';

// Mock lucide icons used across VideoPlayer subcomponents
jest.mock('lucide-react/dist/esm/icons/log-out', () => () => <span data-testid="icon-logout" />);
jest.mock('lucide-react/dist/esm/icons/menu', () => () => <span data-testid="icon-menu" />);
jest.mock('lucide-react/dist/esm/icons/x', () => () => <span data-testid="icon-x" />);
jest.mock('lucide-react/dist/esm/icons/smartphone', () => () => <span data-testid="icon-smartphone" />);
jest.mock('lucide-react/dist/esm/icons/arrow-left', () => () => <span data-testid="icon-arrow-left" />);
jest.mock('lucide-react/dist/esm/icons/arrow-right', () => () => <span data-testid="icon-arrow-right" />);
jest.mock('lucide-react/dist/esm/icons/play', () => () => <span data-testid="icon-play" />);
jest.mock('lucide-react/dist/esm/icons/zap', () => () => <span data-testid="icon-zap" />);
jest.mock('lucide-react/dist/esm/icons/alert-triangle', () => () => <span data-testid="icon-alert" />);

// Minimal mocks for heavy subcomponents
jest.mock('../components/VideoTranslationPopover', () => ({
    VideoTranslationPopover: () => null
}));
jest.mock('../components/SubtitleOverlay', () => ({
    SubtitleOverlay: () => <div data-testid="mock-subtitle-overlay" />
}));
jest.mock('../components/VideoControlsOverlay', () => ({
    VideoControlsOverlay: () => <div data-testid="mock-video-controls" />
}));
jest.mock('../components/VideoPlayerModals', () => ({
    VideoPlayerModals: () => <div data-testid="mock-modals" />
}));
const mockDictionaryData: any[] = [];
jest.mock('../../../hooks/useDictionary', () => ({
    useUserDictionaryItemsLight: () => ({ data: mockDictionaryData }),
    useSaveWord: () => ({ mutate: jest.fn(), mutateAsync: jest.fn() })
}));
jest.mock('../components/OnboardingGuideBar', () => ({
    OnboardingGuideBar: () => <div data-testid="mock-onboarding-guide" />
}));
jest.mock('react-device-detect', () => ({
    isMobile: false
}));

describe('VideoPlayer Header & Replace Button', () => {
    const defaultProps = {
        videoUrl: 'https://www.youtube.com/watch?v=hsUkTQ1YTOQ',
        mimeType: 'video/mp4',
        subtitles: [],
        onSubtitleSelect: jest.fn(),
        fetchSubtitles: jest.fn(),
        onSubtitleUpload: jest.fn(),
        isExtractingSubtitles: false,
        onSelectAnotherVideo: jest.fn(),
    };

    const renderPlayer = ({ isLoggedIn, route }: { isLoggedIn: boolean; route: string }) => {
        delete (window as any).location;
        (window as any).location = new URL(`https://substreamedu.com${route}`);

        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } }
        });

        return render(
            <QueryClientProvider client={queryClient}>
                <AuthContext.Provider value={{
                    isLoggedIn,
                    setIsLoggedIn: jest.fn(),
                    authorities: [],
                    setAuthorities: jest.fn()
                }}>
                    <IntlProvider locale="en" messages={enMessages}>
                        <MemoryRouter initialEntries={[route]}>
                            <VideoPlayer {...defaultProps} />
                        </MemoryRouter>
                    </IntlProvider>
                </AuthContext.Provider>
            </QueryClientProvider>
        );
    };

    it('renders the Replace button with text "Replace" for registered users (LanguageSelector moved to Header)', () => {
        renderPlayer({ isLoggedIn: true, route: '/videos' });

        const replaceButton = screen.getByRole('button', { name: /replace/i });
        expect(replaceButton).toBeInTheDocument();
        expect(replaceButton).toHaveTextContent('Replace');
        expect(screen.queryByRole('button', { name: /select language/i })).not.toBeInTheDocument();

        fireEvent.click(replaceButton);
        expect(defaultProps.onSelectAnotherVideo).toHaveBeenCalled();
    });

    it('renders Replace button for registered users even if on a demo route', () => {
        renderPlayer({ isLoggedIn: true, route: '/youtube-demo' });

        const replaceButton = screen.getByRole('button', { name: /replace/i });
        expect(replaceButton).toBeInTheDocument();
        expect(replaceButton).toHaveTextContent('Replace');
        expect(screen.queryByTestId('demo-player-header')).not.toBeInTheDocument();
    });

    it('renders demo navigation ("Back to Home" and "Start Free") for unregistered guests on demo routes', () => {
        renderPlayer({ isLoggedIn: false, route: '/youtube-demo' });

        expect(screen.getByTestId('demo-player-header')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /back to home/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /start free/i })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /replace/i })).not.toBeInTheDocument();
    });

    it('sets isPlayerActive on mount and unsets on unmount via LanguageContext', () => {
        const setIsPlayerActive = jest.fn();
        const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

        const { unmount } = render(
            <QueryClientProvider client={queryClient}>
                <AuthContext.Provider value={{
                    isLoggedIn: true,
                    setIsLoggedIn: jest.fn(),
                    authorities: [],
                    setAuthorities: jest.fn()
                }}>
                    <LanguageContext.Provider value={{
                        learningLanguage: 'en',
                        setLearningLanguage: jest.fn(),
                        fluentLanguage: 'uk',
                        setFluentLanguage: jest.fn(),
                        isPlayerActive: false,
                        setIsPlayerActive,
                    }}>
                        <IntlProvider locale="en" messages={enMessages}>
                            <MemoryRouter initialEntries={['/videos']}>
                                <VideoPlayer {...defaultProps} />
                            </MemoryRouter>
                        </IntlProvider>
                    </LanguageContext.Provider>
                </AuthContext.Provider>
            </QueryClientProvider>
        );

        expect(setIsPlayerActive).toHaveBeenCalledWith(true);
        unmount();
        expect(setIsPlayerActive).toHaveBeenCalledWith(false);
    });

    it('Header hides navigation menu and renders LanguageSelector when isPlayerActive is true', () => {
        render(
            <AuthContext.Provider value={{
                isLoggedIn: true,
                setIsLoggedIn: jest.fn(),
                authorities: [],
                setAuthorities: jest.fn()
            }}>
                <LanguageContext.Provider value={{
                    learningLanguage: 'en',
                    setLearningLanguage: jest.fn(),
                    fluentLanguage: 'uk',
                    setFluentLanguage: jest.fn(),
                    isPlayerActive: true,
                    setIsPlayerActive: jest.fn(),
                }}>
                    <IntlProvider locale="en" messages={enMessages}>
                        <MemoryRouter initialEntries={['/videos']}>
                            <Header />
                        </MemoryRouter>
                    </IntlProvider>
                </LanguageContext.Provider>
            </AuthContext.Provider>
        );

        // Nav menu links should NOT be in document
        expect(screen.queryByRole('link', { name: /songs/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /subtitles/i })).not.toBeInTheDocument();

        // LanguageSelector should be present in Header
        expect(screen.getByRole('button', { name: /select language/i })).toBeInTheDocument();
    });

    it('Header shows navigation menu and hides LanguageSelector when isPlayerActive is false', () => {
        localStorage.setItem('substreamedu_onboarding_completed', 'true');

        render(
            <AuthContext.Provider value={{
                isLoggedIn: true,
                setIsLoggedIn: jest.fn(),
                authorities: [],
                setAuthorities: jest.fn()
            }}>
                <LanguageContext.Provider value={{
                    learningLanguage: 'en',
                    setLearningLanguage: jest.fn(),
                    fluentLanguage: 'uk',
                    setFluentLanguage: jest.fn(),
                    isPlayerActive: false,
                    setIsPlayerActive: jest.fn(),
                }}>
                    <IntlProvider locale="en" messages={enMessages}>
                        <MemoryRouter initialEntries={['/videos']}>
                            <Header />
                        </MemoryRouter>
                    </IntlProvider>
                </LanguageContext.Provider>
            </AuthContext.Provider>
        );

        // Nav menu should be visible
        expect(screen.getByRole('link', { name: /songs/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /subtitles/i })).toBeInTheDocument();

        // LanguageSelector should not be in Header
        expect(screen.queryByRole('button', { name: /select language/i })).not.toBeInTheDocument();
    });
});
