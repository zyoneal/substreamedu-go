import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VideoPlayer from '../VideoPlayer';
import { AuthContext } from '../../../store/AuthContext';
import enMessages from '../../../locales/en.json';

// Mock lucide icons used across VideoPlayer subcomponents
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

    it('renders the Replace button with text "Replace" for registered users', () => {
        renderPlayer({ isLoggedIn: true, route: '/videos' });

        const replaceButton = screen.getByRole('button', { name: /replace/i });
        expect(replaceButton).toBeInTheDocument();
        expect(replaceButton).toHaveTextContent('Replace');

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
});
