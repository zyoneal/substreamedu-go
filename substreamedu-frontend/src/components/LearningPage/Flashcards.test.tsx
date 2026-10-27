import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import FlashcardsGame from './Flashcards';
import { DictionaryService } from '../../services/DictionaryService';
import { LanguageContext } from '../LanguageContext';
import enMessages from '../../locales/en.json';

jest.mock('lucide-react/dist/esm/icons/refresh-cw', () => () => <span data-testid="icon-refresh-cw" />);
jest.mock('lucide-react/dist/esm/icons/play', () => () => <span data-testid="icon-play" />);
jest.mock('lucide-react/dist/esm/icons/book-open', () => () => <span data-testid="icon-book-open" />);
jest.mock('lucide-react/dist/esm/icons/layout', () => () => <span data-testid="icon-layout" />);
jest.mock('lucide-react/dist/esm/icons/languages', () => () => <span data-testid="icon-languages" />);
jest.mock('lucide-react/dist/esm/icons/sparkles', () => () => <span data-testid="icon-sparkles" />);
jest.mock('lucide-react/dist/esm/icons/message-square', () => () => <span data-testid="icon-message-square" />);
jest.mock('lucide-react/dist/esm/icons/check', () => () => <span data-testid="icon-check" />);
jest.mock('lucide-react/dist/esm/icons/alert-circle', () => () => <span data-testid="icon-alert-circle" />);
jest.mock('lucide-react/dist/esm/icons/rotate-ccw', () => () => <span data-testid="icon-rotate-ccw" />);

jest.mock('../../services/DictionaryService', () => ({
  DictionaryService: {
    fetchSRSToday: jest.fn(),
    reviewCard2Button: jest.fn(),
    refreshSRSSession: jest.fn(),
    generateSessionSummary: jest.fn(),
  },
}));

jest.mock('../../hooks/useTTS', () => ({
  useTTS: () => ({
    play: jest.fn(),
    playingItemId: null,
  }),
}));

const mockCards = [
  {
    id: 101,
    resourceName: 'Movie 1',
    highlightedText: 'tenure',
    translatedText: 'бессрочный контракт',
    context: 'He finally got tenure at university.',
    note: '',
    definition: 'permanent academic appointment',
    imageUrl: null,
    transcription: 'ˈtenjər',
    repetitionLevel: 0,
    interval: 0,
    easeFactor: 2.5,
    nextRepetitionDate: '2026-09-03',
    cardType: 0,
  },
  {
    id: 102,
    resourceName: 'Movie 2',
    highlightedText: 'serendipity',
    translatedText: 'счастливая случайность',
    context: 'Finding this was pure serendipity.',
    note: '',
    definition: 'valuable discovery by chance',
    imageUrl: null,
    transcription: 'ˌserənˈdɪpəti',
    repetitionLevel: 0,
    interval: 0,
    easeFactor: 2.5,
    nextRepetitionDate: '2026-09-03',
    cardType: 0,
  },
];

const renderComponent = () => {
  return render(
    <IntlProvider locale="en" messages={enMessages}>
      <MemoryRouter>
        <LanguageContext.Provider
          value={{
            learningLanguage: 'en',
            fluentLanguage: 'ru',
            setLearningLanguage: jest.fn(),
            setFluentLanguage: jest.fn(),
          }}
        >
          <FlashcardsGame />
        </LanguageContext.Provider>
      </MemoryRouter>
    </IntlProvider>
  );
};

describe('Flashcards SRS Session Queue Invariants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();

    (DictionaryService.fetchSRSToday as jest.Mock).mockResolvedValue({
      cards: [...mockCards],
      totalDictionarySize: 2,
    });

    (DictionaryService.reviewCard2Button as jest.Mock).mockResolvedValue({
      card: mockCards[0],
      nextIntervalDays: 1,
      repeatInSession: false,
      stability: 1.0,
      retrievability: 1.0,
      isLeech: false,
    });

    (DictionaryService.generateSessionSummary as jest.Mock).mockResolvedValue({
      originalStory: 'Story text',
      fluentStory: 'Fluent story text',
      questions: ['Question 1'],
    });
  });

  it('requires 2 rounds for new cards when rating "Good" (FSRS repeatInSession flow)', async () => {
    // Round 1 returns repeatInSession: true, Round 2 returns repeatInSession: false
    const reviewCounts: Record<number, number> = { 101: 0, 102: 0 };
    (DictionaryService.reviewCard2Button as jest.Mock).mockImplementation((id: number) => {
      reviewCounts[id] = (reviewCounts[id] || 0) + 1;
      const isFirstPass = reviewCounts[id] === 1;
      return Promise.resolve({
        card: mockCards.find(c => c.id === id) || mockCards[0],
        nextIntervalDays: isFirstPass ? 0 : 1,
        repeatInSession: isFirstPass, // 1st pass: repeat in session, 2nd pass: graduate
        stability: 1.0,
        retrievability: 1.0,
        isLeech: false,
      });
    });

    renderComponent();

    // No start gate: the first card is interactive immediately
    await screen.findByRole('heading', { level: 1, name: 'tenure' });

    // --- ROUND 1 ---
    // Card 1: 'tenure'
    expect(screen.getByRole('heading', { level: 1, name: 'tenure' })).toBeInTheDocument();
    fireEvent.click(screen.getByText(/tap to reveal/i));
    fireEvent.click(screen.getByRole('button', { name: /good/i }));

    await waitFor(() => {
      expect(DictionaryService.reviewCard2Button).toHaveBeenCalledWith(101, 'remember', expect.any(Number));
    });

    // Card 2: 'serendipity'
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'serendipity' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/tap to reveal/i));
    fireEvent.click(screen.getByRole('button', { name: /good/i }));

    await waitFor(() => {
      expect(DictionaryService.reviewCard2Button).toHaveBeenCalledWith(102, 'remember', expect.any(Number));
    });

    // --- ROUND 2 (Both cards must repeat in session!) ---
    // Card 1: 'tenure' appears again for round 2
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'tenure' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/tap to reveal/i));
    fireEvent.click(screen.getByRole('button', { name: /good/i }));

    // Card 2: 'serendipity' appears again for round 2
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'serendipity' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/tap to reveal/i));
    fireEvent.click(screen.getByRole('button', { name: /good/i }));

    // Total review calls must be exactly 4 (2 rounds for each of the 2 cards)
    await waitFor(() => {
      expect(DictionaryService.reviewCard2Button).toHaveBeenCalledTimes(4);
    });

    // Clean session finish
    await waitFor(() => {
      expect(screen.getByText('Story text')).toBeInTheDocument();
    });
  });

  it('requires 3 rounds for a card when rating "Again" (1 time) and "Good" (2 times)', async () => {
    // Card 101: 1st review is Again, 2nd is Good (repeatInSession: true), 3rd is Good (graduate)
    // Card 102: review card that graduates immediately on 1st Good
    const reviewCounts: Record<number, number> = { 101: 0, 102: 0 };
    (DictionaryService.reviewCard2Button as jest.Mock).mockImplementation((id: number, _rating: string) => {
      reviewCounts[id] = (reviewCounts[id] || 0) + 1;
      if (id === 102) {
        return Promise.resolve({
          card: mockCards[1],
          nextIntervalDays: 1,
          repeatInSession: false,
          stability: 1.0,
          retrievability: 1.0,
          isLeech: false,
        });
      }
      // id === 101
      const count = reviewCounts[101];
      const repeatInSession = count < 3; // Repeats on round 1 (again) and round 2 (good step 1)
      return Promise.resolve({
        card: mockCards[0],
        nextIntervalDays: repeatInSession ? 0 : 1,
        repeatInSession,
        stability: 1.0,
        retrievability: 1.0,
        isLeech: false,
      });
    });

    renderComponent();

    // No start gate: the first card is interactive immediately
    await screen.findByRole('heading', { level: 1, name: 'tenure' });

    // --- ROUND 1 ---
    // Card 1 ('tenure'): Rate "Again" (Don't know)
    expect(screen.getByRole('heading', { level: 1, name: 'tenure' })).toBeInTheDocument();
    fireEvent.click(screen.getByText(/tap to reveal/i));
    fireEvent.click(screen.getByRole('button', { name: /again/i }));

    await waitFor(() => {
      expect(DictionaryService.reviewCard2Button).toHaveBeenCalledWith(101, 'forgot', expect.any(Number));
    });

    // Card 2 ('serendipity'): Rate "Good" -> completes immediately
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'serendipity' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/tap to reveal/i));
    fireEvent.click(screen.getByRole('button', { name: /good/i }));

    await waitFor(() => {
      expect(DictionaryService.reviewCard2Button).toHaveBeenCalledWith(102, 'remember', expect.any(Number));
    });

    // --- ROUND 2 ---
    // Card 1 ('tenure') reappears: Rate "Good" (Step 1 -> repeats in session)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'tenure' })).toBeInTheDocument();
      expect(screen.getByText(/tap to reveal/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/tap to reveal/i));
    fireEvent.click(screen.getByRole('button', { name: /good/i }));

    await waitFor(() => {
      expect(DictionaryService.reviewCard2Button).toHaveBeenCalledTimes(3);
    });

    // --- ROUND 3 ---
    // Card 1 ('tenure') reappears for the 3rd time: Rate "Good" (Step 2 -> graduates)
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'tenure' })).toBeInTheDocument();
      expect(screen.getByText(/tap to reveal/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/tap to reveal/i));
    fireEvent.click(screen.getByRole('button', { name: /good/i }));

    // Total review calls: 4 (101: forgot, 102: remember, 101: remember, 101: remember)
    // Card 101 took exactly 3 passes!
    await waitFor(() => {
      expect(DictionaryService.reviewCard2Button).toHaveBeenCalledTimes(4);
    });

    // Clean session finish
    await waitFor(() => {
      expect(screen.getByText('Story text')).toBeInTheDocument();
    });
  });

  it('shows the first card without a "Start learning" gate', async () => {
    renderComponent();

    await screen.findByRole('heading', { level: 1, name: 'tenure' });
    expect(screen.queryByRole('button', { name: /start learning/i })).not.toBeInTheDocument();
  });

  it('progress only advances on Good and never decreases', async () => {
    renderComponent();
    await screen.findByRole('heading', { level: 1, name: 'tenure' });

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '2');

    // Again on card 1: no progress
    fireEvent.click(screen.getByText(/tap to reveal/i));
    fireEvent.click(screen.getByRole('button', { name: /again/i }));
    await screen.findByRole('heading', { level: 1, name: 'serendipity' });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    // Good on card 2: progress 1
    fireEvent.click(screen.getByText(/tap to reveal/i));
    fireEvent.click(screen.getByRole('button', { name: /good/i }));
    await screen.findByRole('heading', { level: 1, name: 'tenure' });
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '2');

    // No checkpoint for short sessions
    expect(screen.queryByText(/cards done/i)).not.toBeInTheDocument();
  });

  describe('checkpoint', () => {
    const manyCards = Array.from({ length: 25 }, (_, i) => ({
      ...mockCards[0],
      id: 1000 + i,
      highlightedText: `word${i}`,
      context: '',
    }));

    const rateGood = async (index: number) => {
      await screen.findByRole('heading', { level: 1, name: `word${index}` });
      fireEvent.click(screen.getByText(/tap to reveal/i));
      fireEvent.click(screen.getByRole('button', { name: /good/i }));
    };

    beforeEach(() => {
      (DictionaryService.fetchSRSToday as jest.Mock).mockResolvedValue({
        cards: manyCards,
        totalDictionarySize: 25,
      });
    });

    it('appears after 20 ratings and "Keep going" resumes the session', async () => {
      renderComponent();
      for (let i = 0; i < 20; i++) {
        await rateGood(i);
      }

      expect(await screen.findByText('20 cards done')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /keep going/i }));

      expect(await screen.findByRole('heading', { level: 1, name: 'word20' })).toBeInTheDocument();
      expect(screen.queryByText('20 cards done')).not.toBeInTheDocument();
    });

    it('"Finish for today" ends the session without reviewing remaining cards', async () => {
      renderComponent();
      for (let i = 0; i < 20; i++) {
        await rateGood(i);
      }

      await screen.findByText('20 cards done');
      fireEvent.click(screen.getByRole('button', { name: /finish for today/i }));

      expect(await screen.findByText('Story text')).toBeInTheDocument();
      expect(DictionaryService.reviewCard2Button).toHaveBeenCalledTimes(20);
      expect(localStorage.getItem('srs_session_state')).toBeNull();
    });
  });

  it('lets the user skip the story stage and shows localized finish copy', async () => {
    (DictionaryService.generateSessionSummary as jest.Mock).mockReturnValue(new Promise(() => {}));
    renderComponent();

    await screen.findByRole('heading', { level: 1, name: 'tenure' });
    fireEvent.click(screen.getByText(/tap to reveal/i));
    fireEvent.click(screen.getByRole('button', { name: /good/i }));
    await screen.findByRole('heading', { level: 1, name: 'serendipity' });
    fireEvent.click(screen.getByText(/tap to reveal/i));
    fireEvent.click(screen.getByRole('button', { name: /good/i }));

    fireEvent.click(await screen.findByRole('button', { name: /skip/i }));

    expect(await screen.findByText('All cards have been studied!')).toBeInTheDocument();
    expect(screen.getByText("Great job today! You've reviewed 2 cards across 2 unique words.")).toBeInTheDocument();
  });

  it('defines all required CSS classes for completion stage in Flashcards.module.css', () => {
    const cssContent = fs.readFileSync(path.resolve(__dirname, 'Flashcards.module.css'), 'utf-8');

    const requiredClasses = [
      'completionContent',
      'completionIcon',
      'checkIcon',
      'completionTitle',
      'completionDescription',
      'completionActions',
      'activePracticeButton',
      'refreshButton',
      'refreshIcon',
      'spinning',
      'progressTrack',
      'progressFill',
      'checkpointContent',
    ];

    for (const className of requiredClasses) {
      expect(cssContent).toMatch(new RegExp(`\\.${className}\\b`));
    }
  });

  it('disables progress animation for prefers-reduced-motion', () => {
    const cssContent = fs.readFileSync(path.resolve(__dirname, 'Flashcards.module.css'), 'utf-8');
    expect(cssContent).toMatch(/prefers-reduced-motion:\s*reduce/);
  });
});
