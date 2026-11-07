jest.mock('axios', () => {
  const mAxios: any = {
    create: jest.fn(() => mAxios),
    get: jest.fn(),
    post: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };
  return mAxios;
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import StudentLessonPage from './StudentLessonPage';
import { LessonService, LessonResponse } from '../../services/LessonService';

jest.mock('../../services/LessonService');
jest.mock('../../services/SubtitleService', () => ({
  SubtitleService: {
    processHighlightedTextAfterTranslation: jest.fn().mockResolvedValue({}),
  },
}));

const mockLessonData: LessonResponse = {
  id: 'lesson-1',
  share_token: 'valid-token',
  title: 'Mastering Context Clues',
  target_level: 'B1',
  media_source: 'youtube',
  youtube_id: 'test_yt_id',
  content: {
    title: 'Mastering Context Clues',
    level: 'B1',
    estimated_time_min: 45,
    summary: 'Learn how to deduce unfamiliar words through contextual cues.',
    vocabulary: [
      {
        word: 'unravel',
        definition: 'investigate and solve or explain',
        context: 'We will unravel the mystery together.',
        timestamp_sec: 14.5,
        cefr: 'B1',
      },
    ],
    comprehension_questions: [
      {
        question: 'What is the speaker trying to unravel?',
        type: 'multiple-choice',
        options: ['The mystery', 'A knot', 'A sweater', 'A recipe'],
        correct_index: 0,
        explanation: 'The speaker explicitly states we will unravel the mystery.',
      },
    ],
    grammar_focus: [
      {
        pattern: 'Future Intent with Will',
        rule: 'Used for spontaneous decisions or promises.',
        example_from_video: 'We will unravel...',
        exercise_gap_fill: 'We ___ unravel the mystery together.',
        exercise_answer: 'will',
      },
    ],
    speaking_prompts: ['Have you ever solved a mystery?'],
    homework_idea: 'Write 3 sentences using unravel.',
  },
  created_at: '2026-09-20T00:00:00Z',
  updated_at: '2026-09-20T00:00:00Z',
};

describe('StudentLessonPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPage = (token = 'valid-token') => {
    return render(
      <MemoryRouter initialEntries={[`/lesson/${token}`]}>
        <Routes>
          <Route path="/lesson/:shareToken" element={<StudentLessonPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  it('renders lesson worksheet title, vocabulary, and level badge', async () => {
    (LessonService.getSharedLesson as jest.Mock).mockResolvedValueOnce(mockLessonData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Mastering Context Clues')).toBeInTheDocument();
    });

    expect(screen.getByText('B1')).toBeInTheDocument();
    expect(screen.getByText('unravel')).toBeInTheDocument();
    expect(screen.getByText('investigate and solve or explain')).toBeInTheDocument();
    expect(screen.getByText(/What is the speaker trying to unravel\?/i)).toBeInTheDocument();
  });

  it('provides instant interactive feedback when selecting quiz option', async () => {
    (LessonService.getSharedLesson as jest.Mock).mockResolvedValueOnce(mockLessonData);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('The mystery')).toBeInTheDocument();
    });

    // Select the correct option
    const correctOption = screen.getByText('The mystery');
    fireEvent.click(correctOption);

    // Explanation should appear immediately
    await waitFor(() => {
      expect(
        screen.getByText(/The speaker explicitly states we will unravel the mystery/i)
      ).toBeInTheDocument();
    });

    expect(screen.getByText(/Your Score: 1 \/ 1 \(100%\)/i)).toBeInTheDocument();
  });

  it('renders graceful error state when lesson is not found', async () => {
    (LessonService.getSharedLesson as jest.Mock).mockRejectedValueOnce(
      new Error('Lesson not found')
    );

    renderPage('invalid-token');

    await waitFor(() => {
      expect(screen.getByText('Lesson Not Found')).toBeInTheDocument();
    });
  });
});
