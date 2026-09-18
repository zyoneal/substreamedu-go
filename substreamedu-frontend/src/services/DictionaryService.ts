import { baseURL, urls } from "../constants/urls";
import { axiosService } from './AxiosService';

export interface PracticeExercise {
  id: string;
  type: 'gap_fill' | 'paraphrase';
  target_word: string;
  prompt: string;
  sentence_before?: string;
  sentence_after?: string;
  hint?: string;
  options?: string[];
  accepted_answers: string[];
  explanation?: string;
}

export interface EvaluateSentenceResult {
  is_correct: boolean;
  status: 'native' | 'natural' | 'minor_issues' | 'incorrect';
  feedback: string;
  improved_version?: string;
}

export interface AnalyzeGrammarRequest {
  sentence: string;
  ruleHint?: string;
  learningLanguage?: string;
  fluentLanguage?: string;
}

export interface AnalyzeGrammarResponse {
  ruleName: string;
  structureTag: string;
  cefrLevel: string;
  formula: string;
  explanation: string;
  nativeExplanation?: string;
  highlightedSegment: string;
  exercise: PracticeExercise;
}

const DictionaryService = {

  async fetchDictionaryResources(): Promise<any[]> {
    try {
      const response = await axiosService.get(`${baseURL}${urls.dictionaryResources}`);
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error("Error fetching dictionary items:", error);
      return [];
    }
  },

  async fetchDictionaryItemsByResourceName(name: string): Promise<any[]> {
    try {
      const response = await axiosService.get(`${baseURL}${urls.dictionaryResources}/${name}/items`);
      
      if (response.data && Array.isArray(response.data.items)) {
        return response.data.items;
      }
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      console.error("Error fetching dictionary items by resource name:", error);
      return [];
    }
  },

    async fetchDictionaryItemsPaginated(
    name: string,
    cursor: number = 0,
    limit: number = 50
  ): Promise<{ items: any[]; nextCursor: number | null; hasMore: boolean; totalCount: number }> {
    try {
      const params = new URLSearchParams();
      if (cursor > 0) params.append('cursor', cursor.toString());
      if (limit !== 50) params.append('limit', limit.toString());

      const url = `${baseURL}${urls.dictionaryResources}/${name}/items${params.toString() ? '?' + params.toString() : ''}`;
      const response = await axiosService.get(url);
      return {
        items: response.data?.items || [],
        nextCursor: response.data?.nextCursor || null,
        hasMore: response.data?.hasMore || false,
        totalCount: response.data?.totalCount || 0,
      };
    } catch (error) {
      console.error("Error fetching paginated dictionary items:", error);
      throw new Error("Failed to load dictionary items.");
    }
  },

  async fetchDictionaryItemsByUser(): Promise<any[]> {
    try {
      let allItems: any[] = [];
      let cursor = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await axiosService.get(`${baseURL}${urls.dictionaryResources}/items?limit=10000${cursor ? `&cursor=${cursor}` : ''}`);
        const data = response.data;
        
        if (data && data.items) {
          allItems = allItems.concat(data.items);
          hasMore = data.hasMore;
          cursor = data.nextCursor;
        } else if (Array.isArray(data)) {
          allItems = allItems.concat(data);
          hasMore = false;
        } else {
          hasMore = false;
        }
      }

      return Array.isArray(allItems) ? allItems : [];
    } catch (error) {
      console.error("Error fetching dictionary items by user:", error);
      return [];
    }
  },

    async fetchDictionaryItemsLight(): Promise<{ id: number; highlightedText: string; translatedText: string; definition: string }[]> {
    try {
      let allItems: any[] = [];
      let cursor = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await axiosService.get(`${baseURL}${urls.dictionaryResources}/items/light?limit=10000${cursor ? `&cursor=${cursor}` : ''}`);
        const data = response.data;
        
        if (data && data.items) {
          allItems = allItems.concat(data.items);
          hasMore = data.hasMore;
          cursor = data.nextCursor;
        } else if (Array.isArray(data)) {
          allItems = allItems.concat(data);
          hasMore = false;
        } else {
          hasMore = false;
        }
      }

      return allItems;
    } catch (error) {
      console.error("Error fetching lightweight dictionary items:", error);
      throw new Error("Failed to load dictionary items.");
    }
  },

  async deleteDictionaryResource(groupName: string) {
    await axiosService.delete(`${baseURL}${urls.dictionaryResources}/${groupName}`);
  },

  async deleteDictionaryItem(resourceName: string, itemId: number) {
    await axiosService.delete(`${baseURL}${urls.dictionary}/resources/${resourceName}/items/${itemId}`);
  },

  async exportDictionaryByResourceAsAnki(resourceName: string): Promise<Blob> {
    try {
      const response = await axiosService.get(
        `${baseURL}${urls.dictionaryResources}/${resourceName}/export/anki`,
        {
          responseType: "blob",
        }
      );
      if (response && response.data) {
        return response.data;
      } else {
        throw new Error("Failed to fetch the Anki file. Response is empty.");
      }
    } catch (error) {
      throw new Error(`Failed to export dictionary as Anki: ${error}`);
    }
  },

  async exportDictionaryByResourceAsCSV(resourceName: string): Promise<Blob> {
    try {
      const response = await axiosService.get(
        `${baseURL}${urls.dictionaryResources}/${resourceName}/export/csv`,
        {
          responseType: "blob",
        }
      );
      if (response && response.data) {
        return response.data;
      } else {
        throw new Error("Failed to fetch the CSV file. Response is empty.");
      }
    } catch (error) {
      throw new Error(`Failed to export dictionary as CSV: ${error}`);
    }
  },

  async exportAllDictionaryAsAnki(): Promise<Blob> {
    try {
      const response = await axiosService.get(
        `${baseURL}${urls.dictionary}/export/anki`,
        {
          responseType: "blob",
        }
      );
      if (response && response.data) {
        return response.data;
      } else {
        throw new Error("Failed to fetch the Anki file. Response is empty.");
      }
    } catch (error) {
      throw new Error(`Failed to export dictionary as Anki: ${error}`);
    }
  },

  async exportAllDictionaryAsCSV(): Promise<Blob> {
    try {
      const response = await axiosService.get(
        `${baseURL}${urls.dictionary}/export/csv`,
        {
          responseType: "blob",
        }
      );
      if (response && response.data) {
        return response.data;
      } else {
        throw new Error("Failed to fetch the CSV file. Response is empty.");
      }
    } catch (error) {
      throw new Error(`Failed to export dictionary as CSV: ${error}`);
    }
  },

  async fetchSRSToday(): Promise<{ cards: any[]; totalDictionarySize: number }> {
    try {
      const response = await axiosService.get(`/api/dictionary/srs/today`);
      return response.data;
    } catch (error) {
      console.error("Error fetching review words:", error);
      throw new Error("Failed to load review words");
    }
  },

  async reviewCard(id: number, grade: 'hard' | 'normal' | 'easy', reviewDuration?: number): Promise<any> {
    try {
      const response = await axiosService.post(`/api/dictionary/item/${id}/review`, {
        grade,
        reviewDuration
      });
      return response.data;
    } catch (error) {
      console.error("Error reviewing card:", error);
      throw new Error("Failed to review card");
    }
  },

    async reviewCard2Button(id: number, rating: 'forgot' | 'remember', responseTimeMs: number): Promise<{
    card: any;
    nextIntervalDays: number;
    repeatInSession: boolean;
    stability: number;
    retrievability: number;
    isLeech: boolean;
  }> {
    try {
      const response = await axiosService.post(`/api/dictionary/item/${id}/review2`, {
        rating,
        responseTimeMs
      });
      return response.data;
    } catch (error) {
      console.error("Error reviewing card:", error);
      throw new Error("Failed to review card");
    }
  },

  async refreshSRSSession(): Promise<void> {
    try {
      await axiosService.post(`/api/dictionary/srs/today/refresh`, {}, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error("Error refreshing SRS session:", error);
      throw new Error("Failed to refresh study session");
    }
  },

  async generateCohesiveText(items: { word: string; meaning: string; context?: string }[], language: string, mixedMode?: boolean, baseText?: string): Promise<string> {
    try {
      const response = await axiosService.post(`/api/dictionary/generate-cohesive`, {
        items,
        language,
        mixedMode,
        baseText
      });
      return response.data;
    } catch (error) {
      console.error("Error generating cohesive text:", error);
      throw new Error("Failed to generate cohesive text");
    }
  },

  async generateQuestions(items: { word: string; meaning: string; context?: string }[], language: string): Promise<string> {
    try {
      const response = await axiosService.post(`/api/dictionary/generate-questions`, {
        items,
        language
      });
      return response.data;
    } catch (error) {
      console.error("Error generating questions:", error);
      throw new Error("Failed to generate questions");
    }
  },

  async generateSessionSummary(items: { word: string; meaning: string; context?: string }[], learningLanguage: string, fluentLanguage: string): Promise<{
    originalStory: string;
    fluentStory: string;
    questions: string[];
  }> {
    try {
      const response = await axiosService.post(`/api/dictionary/session-summary`, {
        items,
        learningLanguage,
        fluentLanguage
      }, {
        timeout: 90000
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error generating session summary:", error);
      throw new Error("Failed to generate session summary");
    }
  },

  async generatePracticeExercises(
    items: { word: string; meaning: string; context?: string }[],
    learningLanguage: string,
    fluentLanguage: string,
    exerciseTypes?: string[]
  ): Promise<{ exercises: PracticeExercise[] }> {
    try {
      const response = await axiosService.post(`/api/dictionary/practice/generate-exercises`, {
        items,
        learningLanguage,
        fluentLanguage,
        exerciseTypes
      }, {
        timeout: 20000
      });
      return response.data?.data || response.data || { exercises: [] };
    } catch (error) {
      console.error("Error generating practice exercises:", error);
      throw new Error("Failed to generate practice exercises");
    }
  },

  async evaluateSentence(
    word: string,
    meaning: string,
    sentence: string,
    learningLanguage: string
  ): Promise<EvaluateSentenceResult> {
    try {
      const response = await axiosService.post(`/api/dictionary/practice/evaluate-sentence`, {
        word,
        meaning,
        sentence,
        learningLanguage
      }, {
        timeout: 20000
      });
      return response.data?.data || response.data;
    } catch (error) {
      console.error("Error evaluating sentence:", error);
      throw new Error("Failed to evaluate sentence");
    }
  },

  async fetchDashboardStats(): Promise<{
    totalWords: number;
    newWords: number;
    learningWords: number;
    dueToday: number;
    sessionCards?: number;
    sessionDueCards?: number;
    sessionNewCards?: number;
    sessionNewWords?: number;
    streakDays: number;
    reviewedToday?: boolean;
    weekDays?: boolean[];
  }> {
    try {
      const response = await axiosService.get(`${baseURL}api/dictionary/srs/stats`);
      const raw = response.data?.data || response.data || {};
      const dueToday = raw.dueToday ?? 0;
      const sessionDueCards = raw.sessionDueCards ?? Math.min(dueToday, 50);
      const sessionNewCards = raw.sessionNewCards ?? Math.max(0, 50 - sessionDueCards);
      const sessionCards = raw.sessionCards ?? (sessionDueCards + sessionNewCards);
      const sessionNewWords = raw.sessionNewWords ?? Math.ceil(sessionNewCards / 2);

      return {
        totalWords: raw.totalWords ?? 0,
        newWords: raw.newWords ?? 0,
        learningWords: raw.learningWords ?? 0,
        dueToday: dueToday,
        sessionCards: sessionCards,
        sessionDueCards: sessionDueCards,
        sessionNewCards: sessionNewCards,
        sessionNewWords: sessionNewWords,
        streakDays: raw.streakDays ?? 0,
        reviewedToday: raw.reviewedToday ?? false,
        weekDays: Array.isArray(raw.weekDays) ? raw.weekDays : undefined,
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return {
        totalWords: 0,
        newWords: 0,
        learningWords: 0,
        dueToday: 0,
        sessionCards: 0,
        sessionDueCards: 0,
        sessionNewCards: 0,
        sessionNewWords: 0,
        streakDays: 0,
        reviewedToday: false,
        weekDays: undefined,
      };
    }
  },

  async analyzeGrammar(req: AnalyzeGrammarRequest): Promise<AnalyzeGrammarResponse | null> {
    try {
      const response = await axiosService.post(`${baseURL}api/dictionary/grammar/analyze`, req);
      return response.data?.data || response.data || null;
    } catch (error) {
      console.error("Error analyzing grammar:", error);
      return null;
    }
  }

};

export { DictionaryService };