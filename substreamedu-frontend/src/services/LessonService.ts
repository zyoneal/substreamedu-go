import { baseURL, urls } from "../constants/urls";
import { axiosService } from "./AxiosService";

export interface LessonVocabularyItem {
  word: string;
  definition: string;
  context: string;
  timestamp_sec: number;
  cefr: string;
}

export interface LessonQuestion {
  question: string;
  type: "multiple-choice" | "true-false";
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface LessonGrammarPoint {
  pattern: string;
  rule: string;
  example_from_video: string;
  exercise_gap_fill: string;
  exercise_answer: string;
}

export interface LessonPlan {
  title: string;
  level: string;
  estimated_time_min: number;
  summary: string;
  vocabulary: LessonVocabularyItem[];
  comprehension_questions: LessonQuestion[];
  grammar_focus: LessonGrammarPoint[];
  speaking_prompts: string[];
  homework_idea: string;
}

export interface GenerateLessonRequest {
  title: string;
  language: string;
  target_level: string;
  media_source?: string;
  youtube_id?: string;
  subtitles?: Array<{ start: number; end: number; text: string }>;
  transcript?: string;
  custom_focus?: string;
}

export interface SaveLessonRequest {
  title: string;
  target_level: string;
  media_source: string;
  youtube_id: string;
  content: LessonPlan;
}

export interface LessonResponse {
  id: string;
  user_id?: string;
  share_token: string;
  title: string;
  target_level: string;
  media_source: string;
  youtube_id: string;
  content: LessonPlan;
  created_at: string;
  updated_at: string;
}

export const LessonService = {
  async generateLesson(req: GenerateLessonRequest): Promise<LessonPlan> {
    const response = await axiosService.post(
      `${baseURL}${urls.dictionary}/lessons/generate`,
      req
    );
    if (response.data && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || "Failed to generate lesson plan");
  },

  async saveLesson(req: SaveLessonRequest): Promise<LessonResponse> {
    const response = await axiosService.post(
      `${baseURL}${urls.dictionary}/lessons`,
      req
    );
    if (response.data && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || "Failed to save lesson");
  },

  async getSharedLesson(shareToken: string): Promise<LessonResponse> {
    const response = await axiosService.get(
      `${baseURL}${urls.dictionary}/lessons/share/${encodeURIComponent(shareToken)}`
    );
    if (response.data && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || "Failed to retrieve shared lesson");
  },

  async getMyLessons(): Promise<LessonResponse[]> {
    try {
      const response = await axiosService.get(
        `${baseURL}${urls.dictionary}/lessons/my`
      );
      if (response.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      return [];
    } catch (error) {
      console.error("Error fetching user lessons:", error);
      return [];
    }
  },

  async deleteLesson(id: string): Promise<void> {
    const response = await axiosService.delete(
      `${baseURL}${urls.dictionary}/lessons/${encodeURIComponent(id)}`
    );
    if (response.data && response.data.status === "error") {
      throw new Error(response.data.message || "Failed to delete lesson");
    }
  },
};
