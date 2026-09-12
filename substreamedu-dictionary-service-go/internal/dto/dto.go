package dto

import (
	"time"

	"github.com/google/uuid"
)

type ApiResponse struct {
	Status	string		`json:"status"`
	Message	string		`json:"message"`
	Data	interface{}	`json:"data,omitempty"`
}

type PaginatedResponse struct {
	Items		interface{}	`json:"items"`
	NextCursor	*int64		`json:"nextCursor,omitempty"`
	HasMore		bool		`json:"hasMore"`
	TotalCount	int64		`json:"totalCount"`
}

type DictionaryItemDto struct {
	ID			int64		`json:"id"`
	UserID			uuid.UUID	`json:"userId"`
	HighlightedText		string		`json:"highlightedText"`
	TranslatedText		string		`json:"translatedText"`
	Transcription		string		`json:"transcription"`
	Context			string		`json:"context"`
	ResourceName		string		`json:"resourceName"`
	Status			string		`json:"status"`
	NextRepetitionDate	*time.Time	`json:"nextRepetitionDate"`
	DifficultyScore		float32		`json:"difficultyScore"`
	Definition		string		`json:"definition"`
	ImageUrl		string		`json:"imageUrl"`
	IsLeech			bool		`json:"isLeech"`
	Stability		float32		`json:"stability"`
	Retrievability		float32		`json:"retrievability"`
	RollingRetention	float32		`json:"rollingRetention"`
	CardType		int		`json:"cardType"`
}

type LexemeLightDto struct {
	ID		int64	`json:"id"`
	HighlightedText	string	`json:"highlightedText"`
	TranslatedText	string	`json:"translatedText"`
	Definition	string	`json:"definition"`
	CardType	int	`json:"cardType"`
}

type DailySessionDto struct {
	Cards			[]DictionaryItemDto	`json:"cards"`
	TotalDictionarySize	int64			`json:"totalDictionarySize"`
}

type UserOverviewDto struct {
	WordCount	int64	`json:"wordCount"`
	ResourceCount	int	`json:"resourceCount"`
}

type TopUserDto struct {
	UserID		uuid.UUID	`json:"userId"`
	WordCount	int64		`json:"wordCount"`
}

type DictionaryStatsDto struct {
	TotalWords      int64 `json:"totalWords"`
	NewWords        int64 `json:"newWords"`
	LearningWords   int64 `json:"learningWords"`
	DueToday        int64 `json:"dueToday"`
	SessionCards    int64 `json:"sessionCards"`
	SessionDueCards int64 `json:"sessionDueCards"`
	SessionNewCards int64 `json:"sessionNewCards"`
	SessionNewWords int64 `json:"sessionNewWords"`
	StreakDays      int   `json:"streakDays"`
	ReviewedToday   bool  `json:"reviewedToday"`
}

type ReviewResponseDto struct {
	Card			DictionaryItemDto	`json:"card"`
	NextIntervalDays	int			`json:"nextIntervalDays"`
	RepeatInSession		bool			`json:"repeatInSession"`
	Stability		float32			`json:"stability"`
	Retrievability		float32			`json:"retrievability"`
	RollingRetention	float32			`json:"rollingRetention"`
	IsLeech			bool			`json:"isLeech"`
	CardType		int			`json:"cardType"`
}

type ReviewRequest struct {
	Rating		string	`json:"rating" binding:"required"`
	ResponseTimeMs	int	`json:"responseTimeMs" binding:"required"`
}

type WordReviewedEvent struct {
	UserID		uuid.UUID	`json:"userId" binding:"required"`
	CardID		int64		`json:"cardId" binding:"required"`
	Rating		string		`json:"rating" binding:"required"`
	ReviewedAt	time.Time	`json:"reviewedAt"`
}

type LeechDetectedEvent struct {
	UserID		uuid.UUID	`json:"userId"`
	CardID		int64		`json:"cardId"`
	Word		string		`json:"word"`
	Context		string		`json:"context"`
	DetectedAt	time.Time	`json:"detectedAt"`
}

type AddWordRequestDto struct {
	HighlightedText	string	`json:"highlightedText" binding:"required"`
	ResourceName	string	`json:"resourceName" binding:"required"`
	Context		string	`json:"context" binding:"required"`
	ExtendedContext	string	`json:"extendedContext,omitempty"`
	Translation	string	`json:"translation" binding:"required"`
	Note		string	`json:"note,omitempty"`
	Transcription	string	`json:"transcription"`
	Definition	string	`json:"definition,omitempty"`
	ImageUrl	string	`json:"imageUrl,omitempty"`
}

type DictionaryRequest struct {
	HighlightedText		string	`json:"highlightedText" binding:"required"`
	Context			string	`json:"context" binding:"required"`
	ExtendedContext		string	`json:"extendedContext,omitempty"`
	LearningLanguage	string	`json:"learningLanguage" binding:"required"`
	FluentLanguage		string	`json:"fluentLanguage" binding:"required"`
}

type TranslationMetaDto struct {
	SchemaVersion	string	`json:"schema_version"`
	Confidence	float64	`json:"confidence"`
	ErrorCode	string	`json:"error_code,omitempty"`
}

type TranslationAlternativeDto struct {
	Text		string		`json:"text"`
	Register	string		`json:"register"`
	UsageNote	interface{}	`json:"usage_note,omitempty"`
}

type TranslationPronunciationDto struct {
	IPA		string		`json:"ipa"`
	SourceScript	interface{}	`json:"source_script,omitempty"`
}

type TranslationLinguisticDto struct {
	POS		string		`json:"pos"`
	Lemma		string		`json:"lemma"`
	Morphology	interface{}	`json:"morphology,omitempty"`
}

type TranslationContextAnalysisDto struct {
	MinimalUnit	interface{}	`json:"minimal_unit,omitempty"`
	Collocations	[]string	`json:"collocations"`
	Domain		string		`json:"domain"`
}

type TranslationProdResponse struct {
	Translation		string		`json:"translation"`
	Definition		string		`json:"definition"`
	Transcription		string		`json:"transcription"`
	IPA			string		`json:"ipa"`
	PartOfSpeech		string		`json:"partOfSpeech"`
	Hint			string		`json:"hint"`
	Style			string		`json:"style"`
	RecommendedSelections	[]string	`json:"recommended_selections"`
	OtherMeanings		[]string	`json:"other_meanings"`
	ImageUrl		string		`json:"imageUrl"`

	Meta		TranslationMetaDto		`json:"meta"`
	Alternatives	[]TranslationAlternativeDto	`json:"alternatives"`
	Pronunciation	TranslationPronunciationDto	`json:"pronunciation"`
	Linguistic	TranslationLinguisticDto	`json:"linguistic"`
	ContextAnalysis	TranslationContextAnalysisDto	`json:"context_analysis"`
	VisualKeyword	string				`json:"visual_keyword"`
}

type GenerateTextRequest struct {
	Language	string	`json:"language" binding:"required"`
	CefrLevel	string	`json:"cefrLevel" binding:"required"`
	Topic		string	`json:"topic"`
}

type WordWithMeaning struct {
	Word	string	`json:"word"`
	Meaning	string	`json:"meaning"`
	Context	string	`json:"context,omitempty"`
}

type GenerateCohesiveTextRequest struct {
	Words		[]string		`json:"words"`
	Items		[]WordWithMeaning	`json:"items"`
	Language	string			`json:"language" binding:"required"`
	MixedMode	bool			`json:"mixedMode"`
	BaseText	string			`json:"baseText"`
}

type DeepSeekRequest struct {
	Model		string			`json:"model"`
	Messages	[]DeepSeekMessage	`json:"messages"`
	MaxTokens	int			`json:"max_tokens"`
	Temperature	float64			`json:"temperature"`
	TopP		float64			`json:"top_p,omitempty"`
}

type DeepSeekMessage struct {
	Role	string	`json:"role"`
	Content	string	`json:"content"`
}

type DeepSeekResponse struct {
	Choices []DeepSeekChoice `json:"choices"`
}

type DeepSeekChoice struct {
	Message DeepSeekMessage `json:"message"`
}

type SessionSummaryRequest struct {
	Items			[]WordWithMeaning	`json:"items" binding:"required"`
	LearningLanguage	string			`json:"learningLanguage" binding:"required"`
	FluentLanguage		string			`json:"fluentLanguage" binding:"required"`
}

type SessionSummaryResponse struct {
	OriginalStory	string		`json:"originalStory"`
	FluentStory	string		`json:"fluentStory"`
	Questions	[]string	`json:"questions"`
}
