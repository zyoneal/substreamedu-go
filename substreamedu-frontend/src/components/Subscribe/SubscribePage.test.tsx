import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import SubscribePage from './SubscribePage';

jest.mock('../../services/AxiosService', () => ({
    axiosService: {
        post: jest.fn(),
    },
}));

describe('SubscribePage (Pixzen Monochrome Editorial)', () => {
    afterEach(() => {
        document.body.classList.remove('pixzen');
    });

    it('activates body.pixzen theme, renders .pixzenGrain, plan cards, teacher promo, and promo code section', () => {
        const { container } = render(
            <IntlProvider locale="en" messages={{}}>
                <SubscribePage />
            </IntlProvider>
        );

        expect(document.body.classList.contains('pixzen')).toBe(true);
        expect(container.querySelector('.pixzenGrain')).toBeInTheDocument();

        expect(screen.getByText('PLANS & PRICING')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /get full access to your learning potential/i })).toBeInTheDocument();

        expect(screen.getByRole('heading', { name: 'PREMIUM' })).toBeInTheDocument();
        expect(screen.getByText('$10')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /get started/i })).toBeInTheDocument();

        expect(screen.getByRole('heading', { name: 'LIFETIME' })).toBeInTheDocument();
        expect(screen.getByText('$100')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /buy lifetime/i })).toBeInTheDocument();

        expect(screen.getByRole('link', { name: /the founder/i })).toBeInTheDocument();

        const promoInput = screen.getByPlaceholderText(/enter promo code/i) as HTMLInputElement;
        fireEvent.change(promoInput, { target: { value: 'SUBSTREAM50' } });
        expect(promoInput.value).toBe('SUBSTREAM50');

        const clearBtn = screen.getByRole('button', { name: /clear promo code/i });
        fireEvent.click(clearBtn);
        expect(promoInput.value).toBe('');
    });
});
