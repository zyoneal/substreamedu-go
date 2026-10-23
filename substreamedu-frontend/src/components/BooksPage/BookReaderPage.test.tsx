import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BookReaderPage from './BookReaderPage';
import { BookStorage } from './services/bookStorage';
import { LanguageContext } from '../LanguageContext';
import enMessages from '../../locales/en.json';

jest.mock('lucide-react/dist/esm/icons/x', () => () => <span data-testid="icon-x" />);
jest.mock('lucide-react/dist/esm/icons/smartphone', () => () => <span data-testid="icon-smartphone" />);
jest.mock('lucide-react/dist/esm/icons/lightbulb', () => () => <span data-testid="icon-lightbulb" />);
jest.mock('lucide-react/dist/esm/icons/book-open', () => () => <span data-testid="icon-book-open" />);
jest.mock('lucide-react/dist/esm/icons/layers', () => () => <span data-testid="icon-layers" />);

jest.mock('../../services/SubtitleService', () => ({
    SubtitleService: {
        getTranslationProd: jest.fn().mockResolvedValue({
            translation: 'пустыня',
            definition: 'a barren area of land',
            transcription: 'ˈdɛzərt',
            imageUrl: '',
            examples: [],
            synonyms: []
        })
    }
}));

jest.mock('../../hooks/useDictionary', () => ({
    ...jest.requireActual('../../hooks/useDictionary'),
    useUserDictionaryItemsLight: () => ({
        data: [
            {
                id: 101,
                highlightedText: 'Sahara',
                translatedText: 'Сахара',
                definition: 'The largest hot desert'
            }
        ]
    })
}));

describe('BookReaderPage', () => {
    let queryClient: QueryClient;

    beforeEach(async () => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false }
            }
        });
        await BookStorage.saveProgress({
            bookId: 'curated-the-little-prince',
            currentChapterId: 'ch-1',
            scrollPercentage: 33,
            lastReadAt: Date.now(),
            isCompleted: false
        });
    });

    const renderReader = (bookId = 'curated-the-little-prince') => {
        return render(
            <QueryClientProvider client={queryClient}>
                <LanguageContext.Provider value={{
                    learningLanguage: 'en',
                    setLearningLanguage: jest.fn(),
                    fluentLanguage: 'uk',
                    setFluentLanguage: jest.fn(),
                    isPlayerActive: false,
                    setIsPlayerActive: jest.fn()
                }}>
                    <IntlProvider locale="en" messages={enMessages}>
                        <MemoryRouter initialEntries={[`/books/${bookId}`]}>
                            <Routes>
                                <Route path="/books/:bookId" element={<BookReaderPage />} />
                            </Routes>
                        </MemoryRouter>
                    </IntlProvider>
                </LanguageContext.Provider>
            </QueryClientProvider>
        );
    };

    it('renders the book title, chapter title, and content paragraphs', async () => {
        renderReader();

        await waitFor(() => {
            expect(screen.getByText('The Little Prince')).toBeInTheDocument();
            expect(screen.getByRole('heading', { level: 2, name: /Chapter 1: The Sahara Desert/i })).toBeInTheDocument();
            expect(screen.getByText('aeroplane')).toBeInTheDocument();
            expect(screen.getByText('Sahara')).toBeInTheDocument();
        });
    });

    it('allows opening the table of contents and jumping to another chapter', async () => {
        renderReader();

        await waitFor(() => {
            expect(screen.getByText('The Little Prince')).toBeInTheDocument();
        });

        // Open Table of Contents drawer
        const chaptersBtn = screen.getByRole('button', { name: /Table of Contents/i });
        fireEvent.click(chaptersBtn);

        expect(screen.getByText('Table of Contents')).toBeInTheDocument();
        const ch2Btn = screen.getByText('Chapter 2: The Rose on the Asteroid');
        fireEvent.click(ch2Btn);

        // Content updates to Chapter 2
        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 2, name: /Chapter 2: The Rose on the Asteroid/i })).toBeInTheDocument();
            expect(screen.getByText('sprouted')).toBeInTheDocument();
        });
    });

    it('navigates between chapters using Next and Previous buttons', async () => {
        renderReader();

        await waitFor(() => {
            expect(screen.getByText('The Little Prince')).toBeInTheDocument();
        });

        const nextBtn = screen.getByRole('button', { name: /Next Chapter/i });
        fireEvent.click(nextBtn);

        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 2, name: /Chapter 2: The Rose on the Asteroid/i })).toBeInTheDocument();
        });

        const prevBtn = screen.getByRole('button', { name: /Previous Chapter/i });
        fireEvent.click(prevBtn);

        await waitFor(() => {
            expect(screen.getByRole('heading', { level: 2, name: /Chapter 1: The Sahara Desert/i })).toBeInTheDocument();
        });
    });

    it('shows floating tooltip above underlined dictionary words on hover and hides on leave', async () => {
        renderReader();

        await waitFor(() => {
            expect(screen.getByText('Sahara')).toBeInTheDocument();
        });

        const saharaWord = screen.getByText('Sahara');
        expect(saharaWord.classList.contains('highlightedText')).toBe(true);

        // Hover over underlined word
        fireEvent.mouseEnter(saharaWord);

        expect(await screen.findByRole('tooltip')).toHaveTextContent('Сахара');

        // Mouse leave hides tooltip
        fireEvent.mouseLeave(saharaWord);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
});
