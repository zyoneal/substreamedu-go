// Package bot provides Telegram bot implementation.
package bot

import (
	"context"
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/google/uuid"
	"github.com/substreamedu/wordstream-notification-service/internal/config"
	"github.com/substreamedu/wordstream-notification-service/internal/dto"
	"github.com/substreamedu/wordstream-notification-service/internal/model"
	"github.com/substreamedu/wordstream-notification-service/internal/repository"
	"github.com/substreamedu/wordstream-notification-service/internal/service"
	"go.uber.org/zap"
)

const (
	// FAANG Pattern: Configurable constants for scheduler resilience
	defaultReviewHour       = 9
	maxRetryAttempts        = 3
	baseRetryDelay          = 2 * time.Second
	defaultTimezone          = "Europe/Kyiv"
)

// TelegramBot handles Telegram interactions.
type TelegramBot struct {
	api            *tgbotapi.BotAPI
	botService     *service.BotService
	telegramRepo   repository.TelegramUserRepository
	logger         *zap.Logger
	userStates     sync.Map // map[int64]*UserState
	reviewSessions sync.Map // map[int64]*ReviewSession
}

// New creates a new TelegramBot.
func New(cfg *config.TelegramConfig, botService *service.BotService, telegramRepo repository.TelegramUserRepository, logger *zap.Logger) (*TelegramBot, error) {
	api, err := tgbotapi.NewBotAPI(cfg.Token)
	if err != nil {
		return nil, fmt.Errorf("create bot api: %w", err)
	}

	bot := &TelegramBot{
		api:          api,
		botService:   botService,
		telegramRepo: telegramRepo,
		logger:       logger,
	}

	// Set commands
	commands := tgbotapi.NewSetMyCommands(
		tgbotapi.BotCommand{Command: "start", Description: "Start the bot and authenticate"},
		tgbotapi.BotCommand{Command: "random_word", Description: "Get a random word to learn"},
		tgbotapi.BotCommand{Command: "review", Description: "Review previously learned words"},
		tgbotapi.BotCommand{Command: "show_progress", Description: "View your learning progress"},
	)
	if _, err := api.Request(commands); err != nil {
		logger.Warn("Failed to set commands", zap.Error(err))
	}

	// Load all users from database into userStates
	ctx := context.Background()
	users, err := telegramRepo.FindAllActiveUsers(ctx)
	if err != nil {
		logger.Error("Failed to load users from database", zap.Error(err))
	} else {
		for _, user := range users {
			bot.userStates.Store(user.ChatID, Authenticated(user.UserID))
		}
		logger.Info("Loaded users from database", zap.Int("count", len(users)))
	}

	logger.Info("Telegram bot initialized", zap.String("username", api.Self.UserName))

	return bot, nil
}

// Start starts the bot polling.
func (b *TelegramBot) Start(ctx context.Context) {
	// Start daily review job
	go b.StartDailyReviewJob(ctx)

	u := tgbotapi.NewUpdate(0)
	u.Timeout = 60

	updates := b.api.GetUpdatesChan(u)

	for {
		select {
		case <-ctx.Done():
			b.api.StopReceivingUpdates()
			return
		case update := <-updates:
			go b.handleUpdate(ctx, update)
		}
	}
}

// loadTimezone resolves the scheduler timezone from TZ env var.
// FAANG Pattern: Explicit timezone handling prevents silent scheduling drift.
func loadTimezone() *time.Location {
	tzName := os.Getenv("TZ")
	if tzName == "" {
		tzName = defaultTimezone
	}

	loc, err := time.LoadLocation(tzName)
	if err != nil {
		// Fallback to UTC if timezone is invalid — never crash on config
		return time.UTC
	}
	return loc
}

// StartDailyReviewJob is a resilient scheduler for daily review notifications.
// FAANG Pattern: Startup catch-up ensures no missed notifications after pod restarts.
func (b *TelegramBot) StartDailyReviewJob(ctx context.Context) {
	loc := loadTimezone()

	b.logger.Info("Daily review scheduler started",
		zap.String("timezone", loc.String()),
		zap.Int("review_hour", defaultReviewHour),
	)

	// --- Startup Catch-Up ---
	// If the pod restarted after the scheduled hour, trigger immediately
	now := time.Now().In(loc)
	scheduledToday := time.Date(now.Year(), now.Month(), now.Day(), defaultReviewHour, 0, 0, 0, loc)

	if now.After(scheduledToday) {
		b.logger.Info("Startup catch-up: scheduled time already passed today, triggering now",
			zap.Time("scheduled_time", scheduledToday),
			zap.Time("current_time", now),
		)
		b.triggerDailyReviews(ctx)
	}

	// --- Main Scheduler Loop ---
	for {
		now = time.Now().In(loc)
		nextRun := time.Date(now.Year(), now.Month(), now.Day(), defaultReviewHour, 0, 0, 0, loc)

		// If scheduled time has passed today, schedule for tomorrow
		if now.After(nextRun) {
			nextRun = nextRun.Add(24 * time.Hour)
		}

		duration := nextRun.Sub(now)
		b.logger.Info("Next daily review scheduled",
			zap.Time("next_run", nextRun),
			zap.Duration("wait_duration", duration),
			zap.String("timezone", loc.String()),
		)

		select {
		case <-ctx.Done():
			b.logger.Info("Daily review scheduler stopped")
			return
		case <-time.After(duration):
			b.triggerDailyReviews(ctx)
		}
	}
}

// triggerDailyReviews loads all active users and starts review sessions.
// FAANG Pattern: Retry with exponential backoff on transient DB failures.
func (b *TelegramBot) triggerDailyReviews(ctx context.Context) {
	start := time.Now()
	b.logger.Info("Triggering daily reviews for all active users")

	// Retry with exponential backoff
	var users []model.TelegramUser
	var err error

	for attempt := 1; attempt <= maxRetryAttempts; attempt++ {
		users, err = b.telegramRepo.FindAllActiveUsers(ctx)
		if err == nil {
			break
		}

		backoff := time.Duration(math.Pow(2, float64(attempt-1))) * baseRetryDelay
		b.logger.Warn("FindAllActiveUsers failed, retrying",
			zap.Int("attempt", attempt),
			zap.Int("max_attempts", maxRetryAttempts),
			zap.Duration("backoff", backoff),
			zap.Error(err),
		)

		select {
		case <-ctx.Done():
			return
		case <-time.After(backoff):
			// retry
		}
	}

	if err != nil {
		b.logger.Error("Failed to load users for daily review after all retries",
			zap.Int("attempts", maxRetryAttempts),
			zap.Error(err),
		)
		return
	}

	b.logger.Info("Daily review dispatch started",
		zap.Int("user_count", len(users)),
		zap.Duration("db_latency", time.Since(start)),
	)

	for _, user := range users {
		// Ensure userStates is populated for session management
		b.userStates.Store(user.ChatID, Authenticated(user.UserID))
		go b.runDailyReview(ctx, user.ChatID, user.UserID)
	}
}

func (b *TelegramBot) runDailyReview(ctx context.Context, chatID int64, userID uuid.UUID) {
	start := time.Now()

	words, err := b.botService.GetSrsCardsForToday(ctx, userID)
	if err != nil {
		b.logger.Error("Failed to fetch SRS cards for daily review",
			zap.Int64("chat_id", chatID),
			zap.String("user_id", userID.String()),
			zap.Duration("latency", time.Since(start)),
			zap.Error(err),
		)
		return
	}

	if len(words) > 0 {
		b.sendMessage(chatID, fmt.Sprintf("🌅 Good morning! You have *%d words* to review today.", len(words)))
		b.startReviewSession(chatID, words)

		b.logger.Info("Daily review session started",
			zap.Int64("chat_id", chatID),
			zap.Int("word_count", len(words)),
			zap.Duration("latency", time.Since(start)),
		)
	} else {
		b.logger.Debug("No words due for user, skipping",
			zap.Int64("chat_id", chatID),
		)
	}
}

func (b *TelegramBot) handleUpdate(ctx context.Context, update tgbotapi.Update) {
	if update.Message != nil && update.Message.Text != "" {
		b.handleTextMessage(ctx, update.Message)
	} else if update.CallbackQuery != nil {
		b.handleCallbackQuery(ctx, update.CallbackQuery)
	}
}

func (b *TelegramBot) handleTextMessage(ctx context.Context, msg *tgbotapi.Message) {
	chatID := msg.Chat.ID
	text := msg.Text

	// Check if awaiting token
	if state, ok := b.userStates.Load(chatID); ok {
		if userState := state.(*UserState); userState.State == "AWAITING_TOKEN" {
			b.authenticateWithToken(ctx, chatID, text)
			return
		}
	}

	if strings.HasPrefix(text, "/") {
		if strings.HasPrefix(text, "/start") {
			parts := strings.SplitN(text, " ", 2)
			token := ""
			if len(parts) > 1 {
				token = strings.TrimSpace(parts[1])
			}
			b.handleStartCommand(ctx, chatID, token)
		} else {
			switch text {
			case "/random_word":
				b.handleRandomWord(ctx, chatID)
			case "/review":
				b.handleReview(ctx, chatID)
			case "/show_progress":
				b.handleShowProgress(ctx, chatID)
			default:
				b.sendMessage(chatID, "Unknown command.")
			}
		}
	}
}

func (b *TelegramBot) handleStartCommand(ctx context.Context, chatID int64, token string) {
	if token != "" {
		b.authenticateWithToken(ctx, chatID, token)
	} else if _, ok := b.userStates.Load(chatID); !ok {
		b.userStates.Store(chatID, AwaitingToken())
		b.sendMessage(chatID, "👋 Welcome! Please enter your authentication token from the website.")
	} else {
		b.sendMessage(chatID, "Welcome back! Use /review to start learning.")
	}
}

func (b *TelegramBot) authenticateWithToken(ctx context.Context, chatID int64, token string) {
	user, err := b.botService.Authenticate(ctx, token)
	if err != nil {
		b.logger.Error("Auth failed", zap.Error(err))
		b.sendMessage(chatID, "❌ Authentication error.")
		return
	}

	if user != nil {
		b.userStates.Store(chatID, Authenticated(user.ID))
		
		// Persist to database
		telegramUser := &model.TelegramUser{
			ChatID:   chatID,
			UserID:   user.ID,
			IsActive: true,
		}
		if err := b.telegramRepo.Save(ctx, telegramUser); err != nil {
			b.logger.Error("Failed to save telegram user to database", 
				zap.Int64("chatID", chatID), 
				zap.Error(err))
		}
		
		b.sendMessage(chatID, "✅ Successfully authenticated!")
	} else {
		b.sendMessage(chatID, "❌ Invalid token.")
	}
}

func (b *TelegramBot) handleRandomWord(ctx context.Context, chatID int64) {
	userID := b.getUserID(chatID)
	if userID == nil {
		return
	}

	word, err := b.botService.GetRandomWord(ctx, *userID)
	if err != nil {
		b.logger.Error("Failed to get random word", zap.Error(err))
		b.sendMessage(chatID, "Error fetching word.")
		return
	}

	if word != nil {
		b.startReviewSession(chatID, []dto.DictionaryItemResponse{*word})
	}
}

func (b *TelegramBot) handleReview(ctx context.Context, chatID int64) {
	userID := b.getUserID(chatID)
	if userID == nil {
		return
	}

	words, err := b.botService.GetSrsCardsForToday(ctx, *userID)
	if err != nil {
		b.logger.Error("Failed to get review words", zap.Error(err))
		b.sendMessage(chatID, "Error fetching words.")
		return
	}

	if len(words) == 0 {
		b.sendMessage(chatID, "🪹 No words to review today!")
	} else {
		b.startReviewSession(chatID, words)
	}
}

func (b *TelegramBot) startReviewSession(chatID int64, words []dto.DictionaryItemResponse) {
	session := NewReviewSession(words)
	b.reviewSessions.Store(chatID, session)
	b.sendMessage(chatID, fmt.Sprintf("Starting review session for %d words...", len(words)))
	b.sendNextWord(chatID, session)
}

func (b *TelegramBot) sendNextWord(chatID int64, session *ReviewSession) {
	if !session.HasNext() {
		b.finishSession(chatID, session)
		return
	}

	word := session.Next()
	if word == nil {
		return
	}

	session.SetWordStartTime(word.ID)

	text := fmt.Sprintf("📝 Word %d/%d\n\n*%s*",
		session.GetCurrentIndex(), session.GetTotal(), escapeMarkdown(word.HighlightedText))

	if word.Transcription != "" {
		text += " (" + word.Transcription + ")"
	}
	if word.Context != "" {
		text += "\n\n" + escapeMarkdown(word.Context)
	}

	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("👁️ Show Answer", fmt.Sprintf("show_answer_%d", word.ID)),
		),
	)

	b.sendMessageWithKeyboard(chatID, text, keyboard)
}

func (b *TelegramBot) handleCallbackQuery(ctx context.Context, callback *tgbotapi.CallbackQuery) {
	chatID := callback.Message.Chat.ID
	data := callback.Data

	// Answer callback to remove loading state
	b.api.Request(tgbotapi.NewCallback(callback.ID, ""))

	if strings.HasPrefix(data, "show_answer_") {
		wordID, _ := strconv.ParseInt(strings.TrimPrefix(data, "show_answer_"), 10, 64)
		b.showAnswer(chatID, wordID)
	} else if strings.HasPrefix(data, "rate_") {
		b.handleRating(ctx, chatID, data)
	}
}

func (b *TelegramBot) showAnswer(chatID int64, wordID int64) {
	sessionVal, ok := b.reviewSessions.Load(chatID)
	if !ok {
		return
	}
	session := sessionVal.(*ReviewSession)

	word := session.GetCurrentWord()
	if word == nil {
		return
	}

	session.ShowAnswer(wordID)

	// Format: definition (translation) or just translation if no definition
	var text string
	if word.Definition != "" {
		text = fmt.Sprintf("*%s*\n\n%s (%s)",
			escapeMarkdown(word.HighlightedText),
			escapeMarkdown(word.Definition),
			escapeMarkdown(word.TranslatedText))
	} else {
		text = fmt.Sprintf("*%s*\n\n%s",
			escapeMarkdown(word.HighlightedText),
			escapeMarkdown(word.TranslatedText))
	}

	if word.ImageURL != "" {
		b.sendPhoto(chatID, word.ImageURL, text)
	} else {
		b.sendMessage(chatID, text)
	}

	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("😞 Forgot", fmt.Sprintf("rate_forgot_%d", wordID)),
			tgbotapi.NewInlineKeyboardButtonData("😊 Remember", fmt.Sprintf("rate_remember_%d", wordID)),
		),
	)
	b.sendMessageWithKeyboard(chatID, "Do you remember this word?", keyboard)
}

func (b *TelegramBot) handleRating(ctx context.Context, chatID int64, data string) {
	sessionVal, ok := b.reviewSessions.Load(chatID)
	if !ok {
		return
	}
	session := sessionVal.(*ReviewSession)

	parts := strings.Split(data, "_")
	if len(parts) < 3 {
		return
	}

	rating := parts[1]
	wordID, _ := strconv.ParseInt(parts[2], 10, 64)

	durationMs := session.GetWordDuration(wordID)
	session.RecordAnswer(rating)

	userID := b.getUserID(chatID)
	if userID != nil {
		// Record answer and capture response to check for learning steps
		resp, err := b.botService.RecordAnswer(ctx, *userID, wordID, rating, durationMs)
		if err == nil && resp != nil {
			// Mimic web frontend logic:
			// 1. If forgot, always add to end (optimistic)
			// 2. If remember, check repeatInSession flag
			word := session.GetCurrentWord()
			if word != nil {
				if rating == "forgot" {
					// Add the updated card from response if available
					session.AddWordToEnd(resp.Card)
				} else if rating == "remember" && resp.RepeatInSession {
					// Learning steps: card needs to be reviewed again in this session
					session.AddWordToEnd(resp.Card)
				}
			}
		} else {
			// Fallback optimistic logic if API fails
			if rating == "forgot" {
				word := session.GetCurrentWord()
				if word != nil {
					session.AddWordToEnd(*word)
				}
			}
		}
	}

	b.sendNextWord(chatID, session)
}

func (b *TelegramBot) finishSession(chatID int64, session *ReviewSession) {
	b.sendMessage(chatID, fmt.Sprintf("🏁 Session Complete!\nAccuracy: %.1f%%", session.GetAccuracyPercent()))
	b.reviewSessions.Delete(chatID)
}

func (b *TelegramBot) handleShowProgress(ctx context.Context, chatID int64) {
	userID := b.getUserID(chatID)
	if userID == nil {
		return
	}

	stats, err := b.botService.GetDictionaryStats(ctx, *userID)
	if err != nil {
		b.logger.Error("Failed to fetch progress", zap.Error(err))
		b.sendMessage(chatID, "Error fetching progress.")
		return
	}

	text := fmt.Sprintf("📊 *Your Progress*\n\n"+
		"🔥 Streak: %d days\n"+
		"📚 Total words: %d\n"+
		"🆕 New words: %d\n"+
		"🧠 Learning: %d\n"+
		"🔔 Due for review today: %d",
		stats.StreakDays, stats.TotalWords, stats.NewWords, stats.LearningWords, stats.DueToday)

	b.sendMessage(chatID, text)
}

func (b *TelegramBot) getUserID(chatID int64) *uuid.UUID {
	stateVal, ok := b.userStates.Load(chatID)
	if !ok {
		b.sendMessage(chatID, "Please authenticate first using /start")
		return nil
	}

	state := stateVal.(*UserState)
	if state.UserID == uuid.Nil {
		b.sendMessage(chatID, "Please authenticate first using /start")
		return nil
	}

	return &state.UserID
}

func (b *TelegramBot) sendMessage(chatID int64, text string) {
	msg := tgbotapi.NewMessage(chatID, text)
	msg.ParseMode = "Markdown"
	if _, err := b.api.Send(msg); err != nil {
		b.logger.Error("Failed to send message", zap.Error(err))
	}
}

func (b *TelegramBot) sendMessageWithKeyboard(chatID int64, text string, keyboard tgbotapi.InlineKeyboardMarkup) {
	msg := tgbotapi.NewMessage(chatID, text)
	msg.ParseMode = "Markdown"
	msg.ReplyMarkup = keyboard
	if _, err := b.api.Send(msg); err != nil {
		b.logger.Error("Failed to send message", zap.Error(err))
	}
}

func (b *TelegramBot) sendPhoto(chatID int64, url, caption string) {
	photo := tgbotapi.NewPhoto(chatID, tgbotapi.FileURL(url))
	photo.Caption = caption
	photo.ParseMode = "Markdown"
	if _, err := b.api.Send(photo); err != nil {
		b.logger.Warn("Failed to send photo, falling back to text", zap.Error(err))
		b.sendMessage(chatID, caption)
	}
}

// escapeMarkdown escapes special markdown characters.
func escapeMarkdown(text string) string {
	replacer := strings.NewReplacer(
		"_", "\\_",
		"*", "\\*",
		"[", "\\[",
		"]", "\\]",
	)
	return replacer.Replace(text)
}
