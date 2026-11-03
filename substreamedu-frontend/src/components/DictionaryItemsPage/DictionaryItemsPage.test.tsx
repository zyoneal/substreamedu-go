import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import DictionaryItemsPage from './DictionaryItemsPage';
import { DictionaryService } from '../../services/DictionaryService';

jest.mock('lucide-react/dist/esm/icons/download', () => () => <span data-testid="icon-download" />);
jest.mock('lucide-react/dist/esm/icons/arrow-left', () => () => <span data-testid="icon-arrow-left" />);
jest.mock('lucide-react/dist/esm/icons/shuffle', () => () => <span data-testid="icon-shuffle" />);
jest.mock('lucide-react/dist/esm/icons/play', () => () => <span data-testid="icon-play" />);

jest.mock('../../services/DictionaryService', () => ({
    DictionaryService: {
        fetchDictionaryItemsPaginated: jest.fn(),
        exportDictionaryByResourceAsAnki: jest.fn(),
        deleteDictionaryItem: jest.fn(),
    },
}));

jest.mock('../../hooks/useTTS', () => ({
    useTTS: () => ({
        play: jest.fn(),
        playingItemId: null,
    }),
}));

const mockItems = [
    {
        id: 1,
        resourceName: 'Deadpool1.srt',
        highlightedText: 'lonesome',
        translatedText: 'одинокий',
        context: "I'm kinda lonesome back here.",
        note: '',
        definition: 'sad or dejected because of a lack of companionship',
        imageUrl: '',
        transcription: 'ˈləʊnsəm',
    },
    {
        id: 2,
        resourceName: 'Deadpool1.srt',
        highlightedText: 'dishonorable',
        translatedText: 'бесчестный',
        context: 'He is as dishonorable as he is attractive.',
        note: '',
        definition: 'lacking honor or integrity',
        imageUrl: '',
        transcription: 'dɪsˈɒnərəbl',
    },
];

describe('DictionaryItemsPage Pixzen Light Editorial Redesign', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        document.body.classList.remove('pixzen');

        // Mock IntersectionObserver
        (window as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        };

        (DictionaryService.fetchDictionaryItemsPaginated as jest.Mock).mockResolvedValue({
            items: mockItems,
            nextCursor: null,
            hasMore: false,
            totalCount: 2,
        });
    });

    const renderPage = () =>
        render(
            <MemoryRouter initialEntries={['/dictionary/resources/Deadpool1.srt']}>
                <Routes>
                    <Route path="/dictionary/resources/:resourceName" element={<DictionaryItemsPage />} />
                </Routes>
            </MemoryRouter>
        );

    it('activates the Pixzen light editorial theme on body and renders pixzenGrain', async () => {
        const { container } = renderPage();

        await screen.findByRole('heading', { level: 1, name: /Deadpool1\.srt/i });
        expect(document.body.classList.contains('pixzen')).toBe(true);
        expect(container.querySelector('.pixzenGrain')).toBeInTheDocument();
    });

    it('renders flashcard, flips on click, and displays terms in the set', async () => {
        renderPage();

        expect(await screen.findByRole('heading', { level: 2, name: 'lonesome' })).toBeInTheDocument();
        expect(screen.getByText('Terms in this set (2)')).toBeInTheDocument();
        expect(screen.getByText(/sad or dejected because of a lack of companionship \(одинокий\)/i)).toBeInTheDocument();

        const flashcard = screen.getByRole('button', { name: /flashcard for lonesome/i });
        fireEvent.click(flashcard);
        await waitFor(() => {
            expect(flashcard).toHaveAttribute('aria-label', expect.stringContaining('Side: Definition'));
        });
    });

    it('uses Pixzen light editorial surfaces (#f5f3ef and #eae7e1) instead of legacy #111111 dark cards in CSS', () => {
        const cssContent = fs.readFileSync(
            path.resolve(__dirname, 'css/DictionaryItemsPage.module.css'),
            'utf-8'
        );

        expect(cssContent).toContain('#f5f3ef');
        expect(cssContent).toContain('#eae7e1');
        expect(cssContent).not.toContain('background: #111111');
        expect(cssContent).toMatch(/prefers-reduced-motion:\s*reduce/);
    });

    it('hides the image container completely when the card image fails to load', async () => {
        (DictionaryService.fetchDictionaryItemsPaginated as jest.Mock).mockResolvedValueOnce({
            items: [
                {
                    ...mockItems[0],
                    imageUrl: 'https://invalid.example.com/broken-icon.png',
                },
            ],
            nextCursor: null,
            hasMore: false,
            totalCount: 1,
        });

        const { container } = renderPage();
        await screen.findByRole('heading', { level: 2, name: 'lonesome' });

        const img = container.querySelector('img');
        expect(img).toBeInTheDocument();

        fireEvent.error(img!);

        await waitFor(() => {
            expect(container.querySelector('img')).not.toBeInTheDocument();
        });
    });
});

