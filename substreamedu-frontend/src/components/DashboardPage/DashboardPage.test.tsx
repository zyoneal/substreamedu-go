import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import DashboardPage from './DashboardPage';
import { DictionaryService } from '../../services/DictionaryService';
import enMessages from '../../locales/en.json';

jest.mock('../../services/DictionaryService', () => ({
    DictionaryService: {
        fetchDashboardStats: jest.fn(),
    },
}));

jest.mock('../../hooks/useRecentVideos', () => ({
    useRecentVideos: () => [[], jest.fn()],
}));

jest.mock('./components/StreakShareModal', () => ({
    StreakShareModal: () => null,
    VectorFlameIcon: () => <span data-testid="flame-icon" />,
}));

jest.mock('./components/WelcomeModal', () => ({
    WelcomeModal: () => null,
}));

describe('DashboardPage Bento Studio Redesign', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
    });

    it('renders active user telemetry, SRS deck counter, vault stats, and all 5 learning studio cards', async () => {
        (DictionaryService.fetchDashboardStats as jest.Mock).mockResolvedValueOnce({
            totalWords: 248,
            newWords: 12,
            learningWords: 42,
            dueToday: 18,
            sessionCards: 24,
            sessionDueCards: 18,
            sessionNewCards: 6,
            sessionNewWords: 3,
            streakDays: 5,
            reviewedToday: true,
            weekDays: [true, true, true, true, true, false, false],
        });

        render(
            <IntlProvider locale="en" messages={enMessages}>
                <MemoryRouter>
                    <DashboardPage />
                </MemoryRouter>
            </IntlProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('248')).toBeInTheDocument();
        });

        expect(screen.getByText('24')).toBeInTheDocument();
        expect(screen.getByText(/Video-based learning/i)).toBeInTheDocument();
        expect(screen.getByText(/Learning with songs/i)).toBeInTheDocument();
        expect(screen.getByText(/Learning with texts/i)).toBeInTheDocument();
        expect(screen.getByText(/Learning with subtitles/i)).toBeInTheDocument();
        expect(screen.getByText(/Telegram bot practice/i)).toBeInTheDocument();
    });
});
