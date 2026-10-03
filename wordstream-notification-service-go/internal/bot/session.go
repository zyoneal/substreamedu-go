// Package bot provides Telegram bot session management.
package bot

import (
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/substreamedu/wordstream-notification-service/internal/dto"
)

// UserState represents the state of a user in the bot.
type UserState struct {
	State  string
	UserID uuid.UUID
}

// AwaitingToken creates a new state waiting for token.
func AwaitingToken() *UserState {
	return &UserState{State: "AWAITING_TOKEN"}
}

// Authenticated creates a new authenticated state.
func Authenticated(userID uuid.UUID) *UserState {
	return &UserState{State: "AUTHENTICATED", UserID: userID}
}

// ReviewSession manages a word review session.
type ReviewSession struct {
	mu             sync.RWMutex
	words          []dto.DictionaryItemResponse
	currentIndex   int
	startTime      time.Time
	difficultCount int
	normalCount    int
	easyCount      int
	currentWord      *dto.DictionaryItemResponse
	answerShown      bool
	wordStartTimes   map[int64]time.Time
	answerShownTimes map[int64]time.Time
}

// NewReviewSession creates a new review session.
func NewReviewSession(words []dto.DictionaryItemResponse) *ReviewSession {
	session := &ReviewSession{
		words:            words,
		startTime:        time.Now(),
		wordStartTimes:   make(map[int64]time.Time),
		answerShownTimes: make(map[int64]time.Time),
	}
	if len(words) > 0 {
		session.currentWord = &words[0]
	}
	return session
}

// HasNext returns true if there are more words.
func (s *ReviewSession) HasNext() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentIndex < len(s.words)
}

// Next returns the next word.
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

// GetCurrentWord returns the current word.
func (s *ReviewSession) GetCurrentWord() *dto.DictionaryItemResponse {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentWord
}

// GetCurrentIndex returns the current index (1-based for display).
func (s *ReviewSession) GetCurrentIndex() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.currentIndex
}

// GetTotal returns the total number of words.
func (s *ReviewSession) GetTotal() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.words)
}

// ShowAnswer marks the answer as shown and records the time.
func (s *ReviewSession) ShowAnswer(wordID int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.answerShown = true
	s.answerShownTimes[wordID] = time.Now()
}

// RecordAnswer records the user's answer.
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

// SetWordStartTime sets the start time for a word.
func (s *ReviewSession) SetWordStartTime(wordID int64) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.wordStartTimes[wordID] = time.Now()
}

// GetWordDuration returns the duration spent on a word in milliseconds (from answer shown).
// This matches the FAANG web implementation which measures response time from when the user sees the answer.
func (s *ReviewSession) GetWordDuration(wordID int64) int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	start, ok := s.answerShownTimes[wordID]
	if !ok {
		// Fallback if answer wasn't shown properly (e.g., fast click)
		return 5000 
	}
	
	durationMs := int(time.Since(start).Milliseconds())
	if durationMs <= 0 {
		return 5000 // Fallback
	}
	return durationMs
}

// AddWordToEnd adds a word to the end of the session.
func (s *ReviewSession) AddWordToEnd(word dto.DictionaryItemResponse) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.words = append(s.words, word)
}

// GetAccuracyPercent returns the accuracy percentage.
func (s *ReviewSession) GetAccuracyPercent() float64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	total := s.difficultCount + s.normalCount + s.easyCount
	if total == 0 {
		return 0
	}
	return float64(s.normalCount+s.easyCount) / float64(total) * 100
}
