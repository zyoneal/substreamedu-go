import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import TelegramBotPage from './TelegramBotPage';
import { userService } from '../../services/UserService';
import enMessages from '../../locales/en.json';

jest.mock('../../services/UserService', () => ({
    userService: {
        getCabinetInfo: jest.fn(),
    },
}));

describe('TelegramBotPage (Pixzen Monochrome Editorial)', () => {
    beforeEach(() => {
        document.body.classList.remove('pixzen');
        jest.clearAllMocks();
    });

    it('activates body.pixzen, renders .pixzenGrain, and displays the Telegram Bot connect link and stats', async () => {
        (userService.getCabinetInfo as jest.Mock).mockResolvedValueOnce({
            data: {
                id: 'u-1',
                email: 'learner@example.com',
                telegramToken: 'tok-xyz-123',
            },
        });

        const { container } = render(
            <IntlProvider locale="en" messages={enMessages}>
                <TelegramBotPage />
            </IntlProvider>
        );

        expect(document.body.classList.contains('pixzen')).toBe(true);
        expect(container.querySelector('.pixzenGrain')).toBeInTheDocument();

        await waitFor(() => {
            expect(
                screen.getByRole('heading', {
                    name: /Learn English Through Your Personal AI Bot in Telegram/i,
                })
            ).toBeInTheDocument();
        });

        const connectLink = screen.getByRole('link', { name: /Connect to Telegram Bot/i });
        expect(connectLink).toHaveAttribute('href', 'https://t.me/substreamedu_bot?start=tok-xyz-123');
        expect(screen.getByText('50')).toBeInTheDocument();
        expect(screen.getByText('9:00')).toBeInTheDocument();
        expect(screen.getByText('100%')).toBeInTheDocument();
    });
});
