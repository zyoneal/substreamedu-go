import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilmSelectionModal } from './FilmSelectionModal';
import { SubDLSearchResult } from '../../../services/SubtitleService';

jest.mock('lucide-react/dist/esm/icons/x', () => () => <span data-testid="icon-x" />);
jest.mock('lucide-react/dist/esm/icons/film', () => () => <span data-testid="icon-film" />);
jest.mock('lucide-react/dist/esm/icons/tv', () => () => <span data-testid="icon-tv" />);
jest.mock('lucide-react/dist/esm/icons/calendar', () => () => <span data-testid="icon-calendar" />);
jest.mock('lucide-react/dist/esm/icons/check-circle', () => () => <span data-testid="icon-check-circle" />);
jest.mock('lucide-react/dist/esm/icons/search', () => () => <span data-testid="icon-search" />);

describe('FilmSelectionModal Component', () => {
    const mockFilms: SubDLSearchResult[] = [
        {
            sdId: 101,
            type: 'movie',
            name: 'Inception',
            imdbId: 'tt1375666',
            tmdbId: 27205,
            firstAirDate: '2010-07-16',
            year: 2010,
        },
        {
            sdId: 102,
            type: 'movie',
            name: 'Inception: The Cobol Job',
            imdbId: 'tt1790736',
            tmdbId: 88888,
            firstAirDate: '2010-12-07',
            year: 2010,
        },
    ];

    it('does not render when isOpen is false', () => {
        const { container } = render(
            <FilmSelectionModal
                isOpen={false}
                onClose={jest.fn()}
                films={mockFilms}
                onSelectFilm={jest.fn()}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders films list and allows selecting a film', () => {
        const onSelectFilm = jest.fn();
        render(
            <FilmSelectionModal
                isOpen={true}
                onClose={jest.fn()}
                films={mockFilms}
                onSelectFilm={onSelectFilm}
                searchQuery="Inception"
            />
        );

        expect(screen.getByText('Inception')).toBeInTheDocument();
        expect(screen.getByText('Inception: The Cobol Job')).toBeInTheDocument();

        fireEvent.click(screen.getByText('Inception'));
        expect(onSelectFilm).toHaveBeenCalledWith(mockFilms[0]);
    });

    it('submits search query via onSearchAgain when user types and submits search bar', () => {
        const onSearchAgain = jest.fn();
        render(
            <FilmSelectionModal
                isOpen={true}
                onClose={jest.fn()}
                films={mockFilms}
                onSelectFilm={jest.fn()}
                searchQuery="Inception"
                onSearchAgain={onSearchAgain}
            />
        );

        const searchInput = screen.getByPlaceholderText(/Search film or series title/i);
        fireEvent.change(searchInput, { target: { value: 'Interstellar' } });

        const searchButton = screen.getByRole('button', { name: /^search$/i });
        fireEvent.click(searchButton);

        expect(onSearchAgain).toHaveBeenCalledWith('Interstellar');
    });

    it('displays empty state with search input when no films are found', () => {
        render(
            <FilmSelectionModal
                isOpen={true}
                onClose={jest.fn()}
                films={[]}
                onSelectFilm={jest.fn()}
                searchQuery="Unknown Film"
            />
        );

        expect(screen.getByText(/No results found for "Unknown Film"/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Search film or series title/i)).toBeInTheDocument();
    });
});
