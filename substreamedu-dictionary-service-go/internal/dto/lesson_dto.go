package dto

import "time"

// SubtitleCueDTO represents a single subtitle cue with timing
type SubtitleCueDTO struct {
	Start float64 `json:"start"`
	End   float64 `json:"end"`
	Text  string  `json:"text"`
}

// GenerateLessonRequest is the payload sent to generate a complete lesson plan
type GenerateLessonRequest struct {
	Title       string           `json:"title"`
	Language    string           `json:"language"`
	TargetLevel string           `json:"target_level"` // "A2", "B1", "B2", "C1"
	MediaSource string           `json:"media_source,omitempty"`
	YoutubeID   string           `json:"youtube_id,omitempty"`
	Subtitles   []SubtitleCueDTO `json:"subtitles,omitempty"`
	Transcript  string           `json:"transcript,omitempty"`
	CustomFocus string           `json:"custom_focus,omitempty"`
}

// LessonVocabularyItem represents a key vocabulary word or chunk taught in the lesson
type LessonVocabularyItem struct {
	Word         string  `json:"word"`
	Definition   string  `json:"definition"`
	Context      string  `json:"context"`
	TimestampSec float64 `json:"timestamp_sec"`
	CEFR         string  `json:"cefr"`
}

// LessonQuestion represents a comprehension question with answer options
type LessonQuestion struct {
	Question     string   `json:"question"`
	Type         string   `json:"type"` // "multiple-choice" or "true-false"
	Options      []string `json:"options"`
	CorrectIndex int      `json:"correct_index"`
	Explanation  string   `json:"explanation"`
}

// LessonGrammarPoint represents an authentic grammar structure extracted from the video
type LessonGrammarPoint struct {
	Pattern          string `json:"pattern"`
	Rule             string `json:"rule"`
	ExampleFromVideo string `json:"example_from_video"`
	ExerciseGapFill  string `json:"exercise_gap_fill"`
	ExerciseAnswer   string `json:"exercise_answer"`
}

// LessonPlan represents the full structured educational worksheet
type LessonPlan struct {
	Title                  string                 `json:"title"`
	Level                  string                 `json:"level"`
	EstimatedTimeMin       int                    `json:"estimated_time_min"`
	Summary                string                 `json:"summary"`
	Vocabulary             []LessonVocabularyItem `json:"vocabulary"`
	ComprehensionQuestions []LessonQuestion       `json:"comprehension_questions"`
	GrammarFocus           []LessonGrammarPoint   `json:"grammar_focus"`
	SpeakingPrompts        []string               `json:"speaking_prompts"`
	HomeworkIdea           string                 `json:"homework_idea"`
}

// SaveLessonRequest is used to publish or update a lesson
type SaveLessonRequest struct {
	Title       string     `json:"title" binding:"required"`
	TargetLevel string     `json:"target_level"`
	MediaSource string     `json:"media_source"`
	YoutubeID   string     `json:"youtube_id"`
	Content     LessonPlan `json:"content" binding:"required"`
}

// LessonResponse represents a saved lesson returned to the client
type LessonResponse struct {
	ID          string     `json:"id"`
	UserID      *string    `json:"user_id,omitempty"`
	ShareToken  string     `json:"share_token"`
	Title       string     `json:"title"`
	TargetLevel string     `json:"target_level"`
	MediaSource string     `json:"media_source"`
	YoutubeID   string     `json:"youtube_id"`
	Content     LessonPlan `json:"content"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
