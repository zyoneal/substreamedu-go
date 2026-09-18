import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import ActivePractice from './ActivePractice';
import { LanguageContext } from '../LanguageContext';
import enMessages from '../../locales/en.json';

jest.mock('../../services/DictionaryService', () => ({
  __esModule: true,
  DictionaryService: {
    fetchDictionaryItemsByUser: jest.fn().mockResolvedValue([]),
    generatePracticeExercises: jest.fn().mockResolvedValue({ exercises: [] }),
    evaluateSentence: jest.fn().mockResolvedValue({
      is_correct: true,
      status: 'native',
      feedback: 'Excellent phrasing and natural vocabulary use.',
      improved_version: 'He brushed off the concerns.'
    }),
  },
}));

jest.mock('../../hooks/useTTS', () => ({
  useTTS: () => ({
    play: jest.fn(),
    playingItemId: null,
  }),
}));

const mockWords = [
  {
    word: 'brush off',
    translation: 'отмахнуться',
    definition: 'to dismiss as unimportant',
    context: 'He tried to brush off the criticism.',
  },
  {
    word: 'tenure',
    translation: 'пожизненный контракт',
    definition: 'permanent academic appointment',
    context: 'She finally achieved tenure after years of research.',
  },
];

describe('ActivePractice Component', () => {
  const renderComponent = (words = mockWords, onBack = jest.fn()) => {
    return render(
      <IntlProvider locale="en" messages={enMessages}>
        <LanguageContext.Provider value={{ learningLanguage: 'en', fluentLanguage: 'ru', setLearningLanguage: jest.fn(), setFluentLanguage: jest.fn() }}>
          <ActivePractice initialWords={words} onBackToFlashcards={onBack} />
        </LanguageContext.Provider>
      </IntlProvider>
    );
  };

  it('renders the initial Cloze gap-fill exercise with prompt and hidden target word (no spoiler)', () => {
    renderComponent();

    expect(screen.getByText('Contextual Cloze')).toBeInTheDocument();
    expect(screen.getByText('AI Sentence Builder')).toBeInTheDocument();
    // Target word should NOT be spoiled in header or prompt before checking
    expect(screen.queryByText('brush off')).not.toBeInTheDocument();
    // Subtle word/letter count clue is shown instead
    expect(screen.getByText(/2 words/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Type the missing word/i)).toBeInTheDocument();
  });

  it('allows user to type answer, validates correct match, and reveals target word', () => {
    renderComponent();

    const input = screen.getByPlaceholderText(/Type the missing word/i);
    fireEvent.change(input, { target: { value: 'brush off' } });

    const checkBtn = screen.getByRole('button', { name: /check/i });
    fireEvent.click(checkBtn);

    expect(screen.getByText(/Excellent! Exact match/i)).toBeInTheDocument();
    expect(screen.getAllByText(/brush off/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('toggles hint display when clicking hint button', () => {
    renderComponent();

    const hintBtn = screen.getByRole('button', { name: /show meaning hint/i });
    fireEvent.click(hintBtn);

    expect(screen.getByText(/отмахнуться/i)).toBeInTheDocument();
  });

  it('switches to AI Sentence Builder mode', async () => {
    renderComponent();

    const builderTab = screen.getByRole('button', { name: /ai sentence builder/i });
    fireEvent.click(builderTab);

    await waitFor(() => {
      expect(screen.getByText(/Compose an original sentence using/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Write a sentence featuring "brush off"/i)).toBeInTheDocument();
    });
  });
});
