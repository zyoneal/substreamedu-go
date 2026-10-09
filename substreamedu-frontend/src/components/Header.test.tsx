import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import Header from './Header';
import { LanguageContext } from './LanguageContext';
import { AuthContext } from '../store/AuthContext';
import enMessages from '../locales/en.json';

// Mock lucide icons used in Header
jest.mock('lucide-react/dist/esm/icons/log-out', () => () => <span data-testid="icon-logout" />);
jest.mock('lucide-react/dist/esm/icons/menu', () => () => <span data-testid="icon-menu" />);
jest.mock('lucide-react/dist/esm/icons/x', () => () => <span data-testid="icon-x" />);

jest.mock('../services/RegionService', () => ({
    RegionService: {
        getRegion: () => Promise.resolve('UA')
    }
}));

describe('Header Component Mobile & Desktop Layout', () => {
    const renderHeader = ({
        route = '/text-paste',
        isLoggedIn = true,
        isPlayerActive = false,
        fluentLanguage = 'uk'
    } = {}) => {
        localStorage.setItem('substreamedu_onboarding_completed', 'true');
        return render(
            <AuthContext.Provider value={{
                isLoggedIn,
                setIsLoggedIn: jest.fn(),
                authorities: [],
                setAuthorities: jest.fn()
            }}>
                <LanguageContext.Provider value={{
                    learningLanguage: 'en',
                    setLearningLanguage: jest.fn(),
                    fluentLanguage,
                    setFluentLanguage: jest.fn(),
                    isPlayerActive,
                    setIsPlayerActive: jest.fn(),
                }}>
                    <IntlProvider locale="en" messages={enMessages}>
                        <MemoryRouter initialEntries={[route]}>
                            <Header />
                        </MemoryRouter>
                    </IntlProvider>
                </LanguageContext.Provider>
            </AuthContext.Provider>
        );
    };

    it('renders logo, burger menu and language selector on mobile text-paste route', () => {
        renderHeader({ route: '/text-paste', isLoggedIn: true });

        // Logo
        expect(screen.getByRole('link', { name: /^substreamedu$/i })).toBeInTheDocument();

        // Burger menu button
        const menuButton = screen.getByRole('button', { name: /menu/i });
        expect(menuButton).toBeInTheDocument();
        expect(screen.getByTestId('icon-menu')).toBeInTheDocument();

        // Language selector
        expect(screen.getByRole('button', { name: /select language/i })).toBeInTheDocument();
        expect(screen.getByText('Українська')).toBeInTheDocument();
    });

    it('toggles mobile menu open and closed when clicking burger button', () => {
        renderHeader({ route: '/text-paste', isLoggedIn: true });

        const menuButton = screen.getByRole('button', { name: /menu/i });
        expect(screen.getByTestId('icon-menu')).toBeInTheDocument();

        // Click to open
        fireEvent.click(menuButton);
        expect(screen.getByTestId('icon-x')).toBeInTheDocument();

        // Click to close
        fireEvent.click(menuButton);
        expect(screen.getByTestId('icon-menu')).toBeInTheDocument();
    });

    it('renders centered LanguageSelector and hides nav menu when isPlayerActive is true', () => {
        renderHeader({ route: '/videos', isPlayerActive: true });

        // Nav menu should not be rendered
        expect(screen.queryByRole('button', { name: /menu/i })).not.toBeInTheDocument();

        // Language selector should be rendered
        expect(screen.getByRole('button', { name: /select language/i })).toBeInTheDocument();
    });

    it('renders burger menu but no language selector on /dictionary', () => {
        renderHeader({ route: '/dictionary', isLoggedIn: true });

        // Burger menu should be present
        expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();

        // Language selector should NOT be present on dictionary page
        expect(screen.queryByRole('button', { name: /select language/i })).not.toBeInTheDocument();
    });

    it('renders Apple mobile bottom sheet on small screen and closes on backdrop click', () => {
        const originalInnerWidth = window.innerWidth;
        window.innerWidth = 400;

        try {
            renderHeader({ route: '/text-paste', isLoggedIn: true });
            const menuButton = screen.getByRole('button', { name: /menu/i });

            // Open bottom sheet
            fireEvent.click(menuButton);

            // Bottom sheet links are present
            expect(screen.getByRole('link', { name: /songs/i })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /dictionary/i })).toBeInTheDocument();

            // Close via backdrop click (the fixed overlay behind sheet)
            const backdrop = document.querySelector('[class*="bottomSheetBackdrop"]');
            expect(backdrop).toBeInTheDocument();
            if (backdrop) {
                fireEvent.click(backdrop);
            }

            expect(screen.getByTestId('icon-menu')).toBeInTheDocument();
        } finally {
            window.innerWidth = originalInnerWidth;
        }
    });

    it('closes mobile menu on Escape key press', () => {
        renderHeader({ route: '/text-paste', isLoggedIn: true });
        const menuButton = screen.getByRole('button', { name: /menu/i });

        fireEvent.click(menuButton);
        expect(screen.getByTestId('icon-x')).toBeInTheDocument();

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(screen.getByTestId('icon-menu')).toBeInTheDocument();
    });
});
