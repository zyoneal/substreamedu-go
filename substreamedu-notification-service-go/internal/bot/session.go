package bot

import (
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-notification-service/internal/dto"
)

type UserState struct {
	State	string
	UserID	uuid.UUID
}

func AwaitingToken() *UserState {
	return &UserState{State: "AWAITING_TOKEN"}
}

func Authenticated(userID uuid.UUID) *UserState {
	return &UserState{State: "AUTHENTICATED", UserID: userID}
}

type ReviewSession struct {
	mu			sync.RWMutex
	words			[]dto.DictionaryItemResponse
	currentIndex		int
	startTime		time.Time
	difficultCount		int
	normalCount		int
	easyCount		int
	currentWord		*dto.DictionaryItemResponse
	answerShown		bool
	wordStartTimes		map[int64]time.Time
	answerShownTimes	map[int64]time.Time
}

func NewReviewSession(words []dto.DictionaryItemResponse) *ReviewSession {
	session := &ReviewSession{
		words:			words,
		startTime:		time.Now(),
		wordStartTimes:		make(map[int64]time.Time),
		answerShownTimes:	make(map[int64]time.Time),
	}
	if len(words) > 0 {
		session.currentWord = &words[0]
	}
	return session
}

func (s *ReviewSession) HasNext() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentIndex < len(s.words)
}

func (s *ReviewSession) Next() *dto.DictionaryItemResponse {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.currentIndex >= len(s.words) {
		return nil
	}

	s.currentWord = &s.words[s.currentIndex]
	s.currentIndex++
	s.answerShown = false
	return s.currentWord
}

func (s *ReviewSession) GetCurrentWord() *dto.DictionaryItemResponse {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentWord
}

func (s *ReviewSession) GetCurrentIndex() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentIndex
}

func (s *ReviewSession) GetTotal() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.words)
}

func (s *ReviewSession) ShowAnswer(wordID int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.answerShown = true
	s.answerShownTimes[wordID] = time.Now()
}

func (s *ReviewSession) RecordAnswer(choice string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	switch choice {
	case "hard", "forgot":
		s.difficultCount++
	case "normal":
		s.normalCount++
	case "easy", "remember":
		s.easyCount++
	}
}

func (s *ReviewSession) SetWordStartTime(wordID int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.wordStartTimes[wordID] = time.Now()
}

func (s *ReviewSession) GetWordDuration(wordID int64) int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	start, ok := s.answerShownTimes[wordID]
	if !ok {

		return 5000
	}

	durationMs := int(time.Since(start).Milliseconds())
	if durationMs <= 0 {
		return 5000
	}
	return durationMs
}

func (s *ReviewSession) AddWordToEnd(word dto.DictionaryItemResponse) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.words = append(s.words, word)
}

func (s *ReviewSession) GetAccuracyPercent() float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	total := s.difficultCount + s.normalCount + s.easyCount
	if total == 0 {
		return 0
	}
	return float64(s.normalCount+s.easyCount) / float64(total) * 100
}

type ReviewSessionSnapshot struct {
	Words			[]dto.DictionaryItemResponse	`json:"words"`
	CurrentIndex		int				`json:"currentIndex"`
	StartTime		time.Time			`json:"startTime"`
	DifficultCount		int				`json:"difficultCount"`
	NormalCount		int				`json:"normalCount"`
	EasyCount		int				`json:"easyCount"`
	WordStartTimes		map[int64]time.Time		`json:"wordStartTimes"`
	AnswerShownTimes	map[int64]time.Time		`json:"answerShownTimes"`
}

func (s *ReviewSession) Snapshot() *ReviewSessionSnapshot {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return &ReviewSessionSnapshot{
		Words:			s.words,
		CurrentIndex:		s.currentIndex,
		StartTime:		s.startTime,
		DifficultCount:		s.difficultCount,
		NormalCount:		s.normalCount,
		EasyCount:		s.easyCount,
		WordStartTimes:		s.wordStartTimes,
		AnswerShownTimes:	s.answerShownTimes,
	}
}

func RestoreReviewSession(snap *ReviewSessionSnapshot) *ReviewSession {
	s := &ReviewSession{
		words:			snap.Words,
		currentIndex:		snap.CurrentIndex,
		startTime:		snap.StartTime,
		difficultCount:		snap.DifficultCount,
		normalCount:		snap.NormalCount,
		easyCount:		snap.EasyCount,
		wordStartTimes:		snap.WordStartTimes,
		answerShownTimes:	snap.AnswerShownTimes,
		answerShown:		false,
	}
	if snap.CurrentIndex > 0 && len(snap.Words) > 0 {
		s.currentWord = &snap.Words[snap.CurrentIndex-1]
	}
	if s.wordStartTimes == nil {
		s.wordStartTimes = make(map[int64]time.Time)
	}
	if s.answerShownTimes == nil {
		s.answerShownTimes = make(map[int64]time.Time)
	}
	return s
}
