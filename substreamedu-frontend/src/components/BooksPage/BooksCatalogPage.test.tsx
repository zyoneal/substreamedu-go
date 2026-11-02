import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import BooksCatalogPage from './BooksCatalogPage';
import { BookStorage } from './services/bookStorage';
import enMessages from '../../locales/en.json';

describe('BooksCatalogPage', () => {
    beforeEach(() => {
        jest.restoreAllMocks();
    });

    const renderComponent = () => {
        return render(
            <IntlProvider locale="en" messages={enMessages}>
                <MemoryRouter>
                    <BooksCatalogPage />
                </MemoryRouter>
            </IntlProvider>
        );
    };

    it('renders the catalog header, Reading Desk hero, and curated books', async () => {
        renderComponent();

        expect(screen.getByText(/Learn with/i)).toBeInTheDocument();
        expect(screen.getByText('Books')).toBeInTheDocument();
        expect(screen.getByTestId('book-continue-desk')).toBeInTheDocument();
        expect(screen.getByText('Recommended Start')).toBeInTheDocument();
        expect(screen.getByText('Open Chapter 1')).toBeInTheDocument();

        // Curated books should be displayed
        await waitFor(() => {
            expect(screen.getByText('The Little Prince')).toBeInTheDocument();
            expect(screen.getByText('Dracula')).toBeInTheDocument();
        });
    });

    it('shows Continue Reading Desk and progress percentage when a book is in progress', async () => {
        jest.spyOn(BookStorage, 'getAllProgress').mockResolvedValueOnce({
            'curated-the-little-prince': {
                bookId: 'curated-the-little-prince',
                currentChapterId: 'ch-1',
                scrollPercentage: 33,
                lastReadAt: Date.now(),
                isCompleted: false,
            },
        });

        renderComponent();

        await waitFor(() => {
            expect(screen.getByText('Resume: The Little Prince')).toBeInTheDocument();
            expect(screen.getByText('Continue Chapter')).toBeInTheDocument();
            expect(screen.getAllByText('33% completed').length).toBeGreaterThanOrEqual(1);
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
