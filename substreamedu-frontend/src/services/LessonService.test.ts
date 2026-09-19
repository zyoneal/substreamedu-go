jest.mock('./AxiosService', () => ({
  __esModule: true,
  axiosService: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

import { LessonService, LessonPlan, LessonResponse } from './LessonService';
import { axiosService } from './AxiosService';

describe('LessonService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockPlan: LessonPlan = {
    title: 'Test English Lesson',
    level: 'B1',
    estimated_time_min: 45,
    summary: 'A lesson on conversational nuances.',
    vocabulary: [
      {
        word: 'perspective',
        definition: 'a point of view',
        context: 'From my perspective...',
        timestamp_sec: 15.0,
        cefr: 'B1',
      },
    ],
    comprehension_questions: [
      {
        question: 'What is the main point?',
        type: 'multiple-choice',
        options: ['Perspective', 'Silence'],
        correct_index: 0,
        explanation: 'The speaker explains different perspectives.',
      },
    ],
    grammar_focus: [
      {
        pattern: 'Conditionals',
        rule: 'If + clause',
        example_from_video: 'If I were you...',
        exercise_gap_fill: 'If I ___ you',
        exercise_answer: 'were',
      },
    ],
    speaking_prompts: ['What is your perspective?'],
    homework_idea: 'Write a short reflection.',
  };

  const mockResponse: LessonResponse = {
    id: 'lesson-123',
    share_token: 'token-abc-456',
    title: 'Test English Lesson',
    target_level: 'B1',
    media_source: 'youtube',
    youtube_id: 'abc12345',
    content: mockPlan,
    created_at: '2026-09-20T00:00:00Z',
    updated_at: '2026-09-20T00:00:00Z',
  };

  it('generateLesson calls endpoint and returns lesson plan', async () => {
    (axiosService.post as jest.Mock).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: mockPlan,
      },
    });

    const result = await LessonService.generateLesson({
      title: 'Video 1',
      language: 'en',
      target_level: 'B1',
    });

    expect(result.title).toBe('Test English Lesson');
    expect(result.vocabulary).toHaveLength(1);
    expect(result.vocabulary[0].word).toBe('perspective');
  });

  it('saveLesson persists plan and returns share_token', async () => {
    (axiosService.post as jest.Mock).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: mockResponse,
      },
    });

    const result = await LessonService.saveLesson({
      title: 'Test English Lesson',
      target_level: 'B1',
      media_source: 'youtube',
      youtube_id: 'abc12345',
      content: mockPlan,
    });

    expect(result.share_token).toBe('token-abc-456');
    expect(result.id).toBe('lesson-123');
  });

  it('getSharedLesson retrieves worksheet by share token', async () => {
    (axiosService.get as jest.Mock).mockResolvedValueOnce({
      data: {
        status: 'success',
        data: mockResponse,
      },
    });

    const result = await LessonService.getSharedLesson('token-abc-456');

    expect(result.title).toBe('Test English Lesson');
    expect(result.content.comprehension_questions).toHaveLength(1);
    expect(result.content.comprehension_questions[0].correct_index).toBe(0);
  });
});
