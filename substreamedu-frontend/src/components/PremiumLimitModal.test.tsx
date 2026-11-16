import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import PremiumLimitModal from './PremiumLimitModal';
import { axiosService, setupInterceptors } from '../services/AxiosService';

const mockNavigate = jest.fn();

jest.mock('lucide-react/dist/esm/icons/x', () => () => null);

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));

describe('PremiumLimitModal', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders translation limit modal without hardcoded dark-theme inline colors that break light mode', () => {
        render(
            <MemoryRouter>
                <PremiumLimitModal type="translation" onClose={jest.fn()} />
            </MemoryRouter>
        );

        expect(screen.getByText("You're learning fast!")).toBeInTheDocument();
        expect(screen.getByText(/You've translated 100 phrases/i)).toBeInTheDocument();

        const quote = screen.getByText(/Upgrading was the best decision/i);
        expect(quote).toBeInTheDocument();
        // Must not hardcode near-white #ede8e0 on a potentially light modal surface
        expect(quote.style.color).not.toBe('rgb(237, 232, 224)');
        expect(quote.style.color).not.toBe('#ede8e0');

        const upgradeBtn = screen.getByRole('button', { name: 'Upgrade to Premium' });
        expect(upgradeBtn).toBeInTheDocument();
        // Must not set inline background #ede8e0 via onMouseLeave
        fireEvent.mouseLeave(upgradeBtn);
        expect(upgradeBtn.style.background).toBe('');
    });

    it('navigates to /subscribe on primary CTA click and calls onClose on Cancel', () => {
        const onClose = jest.fn();
        render(
            <MemoryRouter>
                <PremiumLimitModal type="translation" onClose={onClose} />
            </MemoryRouter>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Upgrade to Premium' }));
        expect(onClose).toHaveBeenCalledTimes(1);
        expect(mockNavigate).toHaveBeenCalledWith('/subscribe');

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onClose).toHaveBeenCalledTimes(2);
    });
});

describe('AxiosService 403 limit detection', () => {
    it('does not trigger premium limit modal on non-limit 403 errors even for translation/prod URL', async () => {
        const onPremiumLimit = jest.fn();
        const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
        setupInterceptors(jest.fn(), jest.fn(), onPremiumLimit);

        const handlers = (axiosService.interceptors.response as any).handlers;
        const rejected = handlers[handlers.length - 1].rejected;

        await expect(
            rejected({
                response: { status: 403, data: { message: 'Failed to verify usage limits' } },
                config: { url: '/dictionary-service/api/v1/translation/prod', method: 'post' },
                message: 'Request failed with status code 403',
            })
        ).rejects.toBeDefined();

        expect(onPremiumLimit).not.toHaveBeenCalled();
        expect(dispatchSpy).not.toHaveBeenCalledWith(
            expect.objectContaining({ type: 'substreamedu:premium_limit_reached' })
        );
        dispatchSpy.mockRestore();
    });

    it('triggers translation limit modal when 403 message explicitly indicates translation limit', async () => {
        const onPremiumLimit = jest.fn();
        setupInterceptors(jest.fn(), jest.fn(), onPremiumLimit);

        const handlers = (axiosService.interceptors.response as any).handlers;
        const rejected = handlers[handlers.length - 1].rejected;

        await expect(
            rejected({
                response: {
                    status: 403,
                    data: { message: 'Translation limit reached. Upgrade to premium for unlimited translations.' },
                },
                config: { url: '/dictionary-service/api/v1/translation/prod', method: 'post' },
                message: 'Request failed with status code 403',
            })
        ).rejects.toBeDefined();

        expect(onPremiumLimit).toHaveBeenCalledWith('translation');
    });
});
