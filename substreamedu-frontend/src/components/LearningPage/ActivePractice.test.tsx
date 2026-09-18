import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import ActivePractice from './ActivePractice';
import { LanguageContext } from '../LanguageContext';
import { DictionaryService } from '../../services/DictionaryService';
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
    // Target word and length should NOT be spoiled in header or prompt before checking
    expect(screen.queryByText('brush off')).not.toBeInTheDocument();
    expect(screen.queryByText(/2 words/i)).not.toBeInTheDocument();
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

  it('toggles hint display when clicking hint button and includes length clue in typing mode', () => {
    renderComponent();

    const hintBtn = screen.getByRole('button', { name: /show meaning hint/i });
    fireEvent.click(hintBtn);

    expect(screen.getByText(/отмахнуться/i)).toBeInTheDocument();
    expect(screen.getByText(/2 words/i)).toBeInTheDocument();
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

  it('retains all practice words when AI returns a smaller batch of exercises', async () => {
    const fiveWords = [
      ...mockWords,
      { word: 'concede', translation: 'уступать', definition: 'admit that something is true', context: 'He conceded defeat.' },
      { word: 'profound', translation: 'глубокий', definition: 'very great or intense', context: 'A profound impact.' },
      { word: 'resilient', translation: 'стойкий', definition: 'able to withstand hardships', context: 'A resilient community.' },
    ];

    (DictionaryService.generatePracticeExercises as jest.Mock).mockResolvedValueOnce({
      exercises: [
        {
          id: 'ai_1',
          type: 'gap_fill',
          target_word: 'brush off',
          prompt: 'He tried to ______ all negative rumors.',
          sentence_before: 'He tried to ',
          sentence_after: ' all negative rumors.',
          hint: 'dismiss',
          options: ['brush off', 'take over', 'look into', 'set up'],
          accepted_answers: ['brush off'],
          explanation: 'AI enhanced note',
        }
      ]
    });

    renderComponent(fiveWords);

    // Initial counter shows 5 exercises total
    expect(screen.getByText('5')).toBeInTheDocument();

    // After async AI resolves, total exercises should STILL be 5, not truncated to 1
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });
});
