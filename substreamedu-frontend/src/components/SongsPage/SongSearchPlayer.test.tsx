import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SongSearchPlayer from './SongSearchPlayer';
import { LanguageContext } from '../LanguageContext';
import { EnhancedSongSearchService } from '../../services/EnhancedSongSearchService';
import * as englishMorphology from '../../utils/englishMorphology';

const MOCK_DICTIONARY_ITEMS = [
    {
        id: 1,
        resourceName: 'Test Song',
        highlightedText: 'hello',
        translatedText: 'привіт',
        context: 'Hello from the other side',
        definition: 'A greeting',
    },
];

jest.mock('../../hooks/useDictionary', () => ({
    useUserDictionaryItems: () => ({
        data: MOCK_DICTIONARY_ITEMS,
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

    it('shows dictionary tooltip on hover without re-running lyric highlighting or thrashing listeners on mousemove', async () => {
        (EnhancedSongSearchService.searchSongs as jest.Mock).mockResolvedValueOnce([
            {
                id: 'song-1',
                title: 'Hello',
                artist: 'Adele',
                lyrics: { text: 'Hello from the other side' },
                audio: { youtubeUrl: 'https://www.youtube.com/watch?v=YQHsXMglC9A' },
            },
        ]);

        const { container } = renderSongsPage();

        const input = screen.getByPlaceholderText(/search for any song/i);
        fireEvent.change(input, { target: { value: 'Adele Hello' } });
        fireEvent.click(screen.getByRole('button', { name: /^search$/i }));

        const songCard = await screen.findByText('Adele');
        fireEvent.click(songCard);

        await waitFor(() => {
            expect(container.querySelector('.highlightedText')).toBeInTheDocument();
        });

        const highlightedWord = container.querySelector('.highlightedText') as HTMLElement;
        const wordMatchSpy = jest.spyOn(englishMorphology, 'findWordMatch');
        const addListenerSpy = jest.spyOn(document, 'addEventListener');
        wordMatchSpy.mockClear();
        addListenerSpy.mockClear();

        fireEvent.mouseOver(highlightedWord);
        expect(await screen.findByRole('tooltip')).toHaveTextContent('привіт');

        for (let i = 0; i < 15; i++) {
            fireEvent.mouseMove(highlightedWord);
        }

        // Hovering and moving the cursor over an underlined word must NOT recompute highlightText
        // or re-register document hover listeners.
        expect(wordMatchSpy).toHaveBeenCalledTimes(0);
        expect(addListenerSpy.mock.calls.filter(([evt]) => evt === 'mouseover' || evt === 'mousemove')).toHaveLength(0);

        fireEvent.mouseOut(highlightedWord);
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

        wordMatchSpy.mockRestore();
        addListenerSpy.mockRestore();
    });
});
