import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IntlProvider } from 'react-intl';
import DashboardPage from './DashboardPage';
import { WelcomeModal } from './components/WelcomeModal';
import { DictionaryService } from '../../services/DictionaryService';
import { useRecentVideos } from '../../hooks/useRecentVideos';
import enMessages from '../../locales/en.json';

jest.mock('../../services/DictionaryService', () => ({
    DictionaryService: {
        fetchDashboardStats: jest.fn(),
    },
}));

jest.mock('../../hooks/useRecentVideos', () => ({
    useRecentVideos: jest.fn(() => [[], jest.fn(), jest.fn()]),
}));

jest.mock('./components/StreakShareModal', () => ({
    StreakShareModal: ({ isOpen }: { isOpen: boolean }) => (
        isOpen ? <div data-testid="streak-share-modal">Streak Modal Open</div> : null
    ),
    VectorFlameIcon: () => <span data-testid="flame-icon" />,
}));

describe('DashboardPage Bento Studio Redesign', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        localStorage.clear();
        (useRecentVideos as jest.Mock).mockReturnValue([[], jest.fn(), jest.fn()]);
    });

    it('renders active user telemetry, SRS deck counter, vault stats, and all 6 learning studio cards', async () => {
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

        expect(document.body.classList.contains('pixzen')).toBe(true);
        expect(document.querySelector('.pixzenGrain')).toBeInTheDocument();
        expect(screen.getByText('24')).toBeInTheDocument();
        expect(screen.getByText(/18 to review/i)).toBeInTheDocument();
        expect(screen.getByText(/6 new/i)).toBeInTheDocument();
        expect(screen.getByText(/Video-based learning/i)).toBeInTheDocument();
        expect(screen.getByText(/Learning with songs/i)).toBeInTheDocument();
        expect(screen.getByText(/Learning with books/i)).toBeInTheDocument();
        expect(screen.getByText(/Learning with texts/i)).toBeInTheDocument();
        expect(screen.getByText(/Learning with subtitles/i)).toBeInTheDocument();
        expect(screen.getByText(/Telegram bot practice/i)).toBeInTheDocument();
    });

    it('links Hero Video card directly to /videos?videoUrl=... when a recent video exists', async () => {
        (useRecentVideos as jest.Mock).mockReturnValue([
            [
                {
                    id: 'vid-1',
                    name: 'Conan Needs a Friend Interview',
                    date: '2026-11-01',
                    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                },
            ],
            jest.fn(),
            jest.fn(),
        ]);

        (DictionaryService.fetchDashboardStats as jest.Mock).mockResolvedValueOnce({
            totalWords: 50,
            newWords: 2,
            learningWords: 10,
            dueToday: 5,
            streakDays: 3,
            reviewedToday: true,
        });

        render(
            <IntlProvider locale="en" messages={enMessages}>
                <MemoryRouter>
                    <DashboardPage />
                </MemoryRouter>
            </IntlProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('50')).toBeInTheDocument();
        });

        expect(screen.getByText('Conan Needs a Friend Interview')).toBeInTheDocument();

        const resumeHeading = screen.getByText(/Resume Watching/i);
        const heroLink = resumeHeading.closest('a');
        expect(heroLink).toHaveAttribute(
            'href',
            `/videos?videoUrl=${encodeURIComponent('https://www.youtube.com/watch?v=dQw4w9WgXcQ')}`
        );
    });

    it('opens StreakShareModal via keyboard Enter on streak card for active users', async () => {
        (DictionaryService.fetchDashboardStats as jest.Mock).mockResolvedValueOnce({
            totalWords: 120,
            newWords: 5,
            learningWords: 30,
            dueToday: 10,
            streakDays: 7,
            reviewedToday: true,
        });

        render(
            <IntlProvider locale="en" messages={enMessages}>
                <MemoryRouter>
                    <DashboardPage />
                </MemoryRouter>
            </IntlProvider>
        );

        await waitFor(() => {
            expect(screen.getByText('120')).toBeInTheDocument();
        });

        const streakCard = screen.getByRole('button', { name: /Share streak/i });
        fireEvent.keyDown(streakCard, { key: 'Enter' });

        expect(screen.getByTestId('streak-share-modal')).toBeInTheDocument();
    });

    it('renders accessible WelcomeModal with role="dialog" and closes on Escape key', () => {
        const handleClose = jest.fn();

        render(
            <IntlProvider locale="en" messages={enMessages}>
                <MemoryRouter>
                    <WelcomeModal isOpen={true} onClose={handleClose} />
                </MemoryRouter>
            </IntlProvider>
        );

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');

        fireEvent.keyDown(window, { key: 'Escape' });
        expect(handleClose).toHaveBeenCalledTimes(1);
    });
});
