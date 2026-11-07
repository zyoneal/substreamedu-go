import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SongSearchPlayer from './SongSearchPlayer';
import { LanguageContext } from '../LanguageContext';

jest.mock('../../hooks/useDictionary', () => ({
    useUserDictionaryItems: () => ({
        data: [
            {
                id: 1,
                resourceName: 'Test Song',
                highlightedText: 'hello',
                translatedText: 'привіт',
                context: 'Hello from the other side',
                definition: 'A greeting',
            },
        ],
    }),
    useSaveWord: () => ({
        mutate: jest.fn(),
        isPending: false,
    }),
}));

jest.mock('../../services/SpotifyService', () => ({
    SpotifyService: {
        searchTrack: jest.fn(),
    },
}));

jest.mock('../../services/SubtitleService', () => ({
    SubtitleService: {
        getTranslationProd: jest.fn(),
    },
}));

jest.mock('../../services/EnhancedSongSearchService', () => ({
    EnhancedSongSearchService: {
        searchSongs: jest.fn().mockResolvedValue([]),
        getLyrics: jest.fn().mockResolvedValue(null),
    },
}));

jest.mock('../ui/modal', () => ({
    Modal: Object.assign(
        ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => (isOpen ? <div>{children}</div> : null),
        {
            Header: ({ title }: { title: string }) => <div>{title}</div>,
            Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
            Footer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        }
    ),
}));

jest.mock('../shared/TranslationPopover', () => ({
    TranslationPopover: () => null,
}));

jest.mock('../shared/MobileHint', () => () => null);

const renderSongsPage = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <IntlProvider locale="en" messages={{}}>
                <LanguageContext.Provider
                    value={{
                        learningLanguage: 'en',
                        fluentLanguage: 'uk',
                        setLearningLanguage: jest.fn(),
                        setFluentLanguage: jest.fn(),
                        isPlayerActive: false,
                        setIsPlayerActive: jest.fn(),
                    }}
                >
                    <SongSearchPlayer />
                </LanguageContext.Provider>
            </IntlProvider>
        </QueryClientProvider>
    );
};

describe('SongSearchPlayer (Pixzen Monochrome Editorial)', () => {
    afterEach(() => {
        document.body.classList.remove('pixzen');
    });

    it('activates body.pixzen theme, renders .pixzenGrain, search bar, and CEFR recommended songs', () => {
        const { container } = renderSongsPage();

        expect(document.body.classList.contains('pixzen')).toBe(true);
        expect(container.querySelector('.pixzenGrain')).toBeInTheDocument();

        expect(screen.getByRole('heading', { name: /learn from songs/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/search for any song/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /^search$/i })).toBeInTheDocument();

        const levelB2Tab = screen.getByRole('tab', { name: /select recommended songs for level B2/i });
        expect(levelB2Tab).toHaveAttribute('aria-selected', 'false');
        fireEvent.click(levelB2Tab);
        expect(levelB2Tab).toHaveAttribute('aria-selected', 'true');
    });

    it('shows frameless clear button when typing in SongSearchBar and clears query on click', () => {
        renderSongsPage();

        const input = screen.getByPlaceholderText(/search for any song/i) as HTMLInputElement;
        fireEvent.change(input, { target: { value: 'Radiohead' } });
        expect(input.value).toBe('Radiohead');

        const clearBtn = screen.getByRole('button', { name: /clear search query/i });
        fireEvent.click(clearBtn);
        expect(input.value).toBe('');
    });
});
