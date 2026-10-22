import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import BooksCatalogPage from './BooksCatalogPage';
import enMessages from '../../locales/en.json';

describe('BooksCatalogPage', () => {
    const renderComponent = () => {
        return render(
            <IntlProvider locale="en" messages={enMessages}>
                <MemoryRouter>
                    <BooksCatalogPage />
                </MemoryRouter>
            </IntlProvider>
        );
    };

    it('renders the catalog header and curated books', async () => {
        renderComponent();

        expect(screen.getByText(/Learn with/i)).toBeInTheDocument();
        expect(screen.getByText('Books')).toBeInTheDocument();

        // Curated books should be displayed
        await waitFor(() => {
            expect(screen.getByText('The Little Prince')).toBeInTheDocument();
            expect(screen.getByText('Dracula')).toBeInTheDocument();
        });
    });

    it('filters books when selecting a CEFR level filter pill', async () => {
        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('The Little Prince')).toBeInTheDocument();
        });

        // Click A1 filter
        const a1Pill = screen.getByRole('button', { name: 'A1' });
        fireEvent.click(a1Pill);

        expect(screen.getByText('The Little Prince')).toBeInTheDocument();
        expect(screen.queryByText('Dracula')).not.toBeInTheDocument();

        // Click C1 filter
        const c1Pill = screen.getByRole('button', { name: 'C1' });
        fireEvent.click(c1Pill);

        expect(screen.getByText('Dracula')).toBeInTheDocument();
        expect(screen.queryByText('The Little Prince')).not.toBeInTheDocument();
    });

    it('filters books using the search input', async () => {
        renderComponent();

        const searchInput = screen.getByPlaceholderText(/Search by title or author/i);
        fireEvent.change(searchInput, { target: { value: 'Gatsby' } });

        await waitFor(() => {
            expect(screen.getByText('The Great Gatsby')).toBeInTheDocument();
            expect(screen.queryByText('Dracula')).not.toBeInTheDocument();
        });
    });
});
