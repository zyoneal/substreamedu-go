package bot

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/google/uuid"
	"github.com/substreamedu/substreamedu-notification-service/internal/config"
	"github.com/substreamedu/substreamedu-notification-service/internal/dto"
	"github.com/substreamedu/substreamedu-notification-service/internal/model"
	"github.com/substreamedu/substreamedu-notification-service/internal/repository"
	"github.com/substreamedu/substreamedu-notification-service/internal/service"
	"go.uber.org/zap"
)

const (
	defaultReviewHour	= 9
	maxRetryAttempts	= 3
	baseRetryDelay		= 2 * time.Second
	defaultTimezone		= "Europe/Kyiv"
)

type TelegramBot struct {
	api		*tgbotapi.BotAPI
	botService	*service.BotService
	telegramRepo	repository.TelegramUserRepository
	sessionRepo	*repository.SessionRepository
	logger		*zap.Logger
	userStates	sync.Map
	reviewSessions	sync.Map
}

func New(cfg *config.TelegramConfig, botService *service.BotService, telegramRepo repository.TelegramUserRepository, sessionRepo *repository.SessionRepository, logger *zap.Logger) (*TelegramBot, error) {
	api, err := tgbotapi.NewBotAPI(cfg.Token)
	if err != nil {
		return nil, fmt.Errorf("create bot api: %w", err)
	}

	bot := &TelegramBot{
		api:		api,
		botService:	botService,
		telegramRepo:	telegramRepo,
		sessionRepo:	sessionRepo,
		logger:		logger,
	}

	commands := tgbotapi.NewSetMyCommands(
		tgbotapi.BotCommand{Command: "start", Description: "Start the bot and authenticate"},
		tgbotapi.BotCommand{Command: "random_word", Description: "Get a random word to learn"},
		tgbotapi.BotCommand{Command: "review", Description: "Review previously learned words"},
		tgbotapi.BotCommand{Command: "show_progress", Description: "View your learning progress"},
	)
	if _, err := api.Request(commands); err != nil {
		logger.Warn("Failed to set commands", zap.Error(err))
	}

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

func (b *TelegramBot) Start(ctx context.Context) {

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

func loadTimezone() *time.Location {
	tzName := os.Getenv("TZ")
	if tzName == "" {
		tzName = defaultTimezone
	}

	loc, err := time.LoadLocation(tzName)
	if err != nil {

		return time.UTC
	}
	return loc
}

func (b *TelegramBot) StartDailyReviewJob(ctx context.Context) {
	loc := loadTimezone()

	b.logger.Info("Daily review scheduler started",
		zap.String("timezone", loc.String()),
		zap.Int("review_hour", defaultReviewHour),
	)

	now := time.Now().In(loc)
	scheduledToday := time.Date(now.Year(), now.Month(), now.Day(), defaultReviewHour, 0, 0, 0, loc)

	if now.After(scheduledToday) {
		b.logger.Info("Startup catch-up: scheduled time already passed today, triggering now",
			zap.Time("scheduled_time", scheduledToday),
			zap.Time("current_time", now),
		)
		b.triggerDailyReviews(ctx)
	}

	for {
		now = time.Now().In(loc)
		nextRun := time.Date(now.Year(), now.Month(), now.Day(), defaultReviewHour, 0, 0, 0, loc)

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

func (b *TelegramBot) triggerDailyReviews(ctx context.Context) {
	start := time.Now()
	b.logger.Info("Triggering daily reviews for all active users")

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
		streakMsg := ""
		stats, err := b.botService.GetDictionaryStats(ctx, userID)
		if err == nil && stats != nil && stats.StreakDays > 0 {
			streakMsg = fmt.Sprintf(" Keep your *%d-day streak* 🔥 alive!", stats.StreakDays)
		}

		b.sendMessage(chatID, fmt.Sprintf("🌅 Good morning! You have *%d words* to review today.%s", len(words), streakMsg))
		b.startReviewSession(ctx, chatID, words)

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

		telegramUser := &model.TelegramUser{
			ChatID:		chatID,
			UserID:		user.ID,
			IsActive:	true,
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
		b.startReviewSession(ctx, chatID, []dto.DictionaryItemResponse{*word})
	}
}

func (b *TelegramBot) handleReview(ctx context.Context, chatID int64) {

	if b.tryRestoreSession(ctx, chatID) {
		return
	}

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
		b.startReviewSession(ctx, chatID, words)
	}
}

func (b *TelegramBot) startReviewSession(ctx context.Context, chatID int64, words []dto.DictionaryItemResponse) {
	session := NewReviewSession(words)
	b.reviewSessions.Store(chatID, session)

	if err := b.sessionRepo.SaveSession(ctx, chatID, session.Snapshot(), 2*time.Hour); err != nil {
		b.logger.Error("Failed to persist review session", zap.Int64("chat_id", chatID), zap.Error(err))
	}

	b.sendMessage(chatID, fmt.Sprintf("Starting review session for %d words...", len(words)))
	b.sendNextWord(chatID, session)
}

func (b *TelegramBot) tryRestoreSession(ctx context.Context, chatID int64) bool {
	data, err := b.sessionRepo.GetSession(ctx, chatID, "review")
	if err != nil {
		return false
	}

	var snap ReviewSessionSnapshot
	if err := json.Unmarshal(data, &snap); err != nil {
		b.logger.Error("Failed to unmarshal review session", zap.Int64("chat_id", chatID), zap.Error(err))
		return false
	}

	session := RestoreReviewSession(&snap)
	b.reviewSessions.Store(chatID, session)

	b.logger.Info("Restored review session from DB", zap.Int64("chat_id", chatID),
		zap.Int("current_index", snap.CurrentIndex), zap.Int("total", len(snap.Words)))

	b.sendMessage(chatID, fmt.Sprintf("🔄 Resuming review (%d/%d words remaining)...",
		len(snap.Words)-snap.CurrentIndex, len(snap.Words)))
	b.sendNextWord(chatID, session)
	return true
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

	var text string
	if word.CardType == 1 {
		// Production/Recall card: Ask for English word by showing definition/translation
		defTrans := ""
		if word.Definition != "" {
			defTrans = fmt.Sprintf("*%s* (%s)", escapeMarkdown(word.Definition), escapeMarkdown(word.TranslatedText))
		} else {
			defTrans = fmt.Sprintf("*%s*", escapeMarkdown(word.TranslatedText))
		}

		text = fmt.Sprintf("📝 Word %d/%d (Recall)\n\n%s",
			session.GetCurrentIndex(), session.GetTotal(), defTrans)

		if word.Context != "" {
			// Hide the target English word in context with gaps
			gappedContext := word.Context
			lowerContext := strings.ToLower(word.Context)
			lowerHighlight := strings.ToLower(word.HighlightedText)
			if idx := strings.Index(lowerContext, lowerHighlight); idx != -1 {
				gappedContext = word.Context[:idx] + "_____" + word.Context[idx+len(word.HighlightedText):]
			}
			text += "\n\n" + escapeMarkdown(gappedContext)
		}
	} else {
		// Recognition card: Ask for translation by showing English word
		text = fmt.Sprintf("📝 Word %d/%d (Recognition)\n\n*%s*",
			session.GetCurrentIndex(), session.GetTotal(), escapeMarkdown(word.HighlightedText))

		if word.Transcription != "" {
			text += " (" + word.Transcription + ")"
		}
		if word.Context != "" {
			text += "\n\n" + escapeMarkdown(word.Context)
		}
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

	var text string
	if word.CardType == 1 {
		// Production/Recall card: Reveal the English word (HighlightedText)
		text = fmt.Sprintf("✅ Answer: *%s*", escapeMarkdown(word.HighlightedText))
		if word.Transcription != "" {
			text += " (" + word.Transcription + ")"
		}
		if word.Context != "" {
			text += "\n\n" + escapeMarkdown(word.Context)
		}
	} else {
		// Recognition card: Reveal the definition/translation
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
	}

	if word.ImageURL != "" {
		b.sendPhoto(chatID, word.ImageURL, text)
	} else {
		b.sendMessage(chatID, text)
	}

	// Dynamic text-to-speech voice pronunciation
	cleanWord := strings.TrimSpace(word.HighlightedText)
	if cleanWord != "" {
		if len(cleanWord) > 200 {
			cleanWord = cleanWord[:200]
		}
		ttsURL := fmt.Sprintf("https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=%s", url.QueryEscape(cleanWord))
		voiceMsg := tgbotapi.NewVoice(chatID, tgbotapi.FileURL(ttsURL))
		if _, err := b.api.Send(voiceMsg); err != nil {
			b.logger.Warn("Failed to send pronunciation voice note", zap.Error(err))
		}
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

		resp, err := b.botService.RecordAnswer(ctx, *userID, wordID, rating, durationMs)
		if err == nil && resp != nil {

			word := session.GetCurrentWord()
			if word != nil {
				if rating == "forgot" {

					session.AddWordToEnd(resp.Card)
				} else if rating == "remember" && resp.RepeatInSession {

					session.AddWordToEnd(resp.Card)
				}
			}
		} else {

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
	userID := b.getUserID(chatID)
	streakMsg := ""
	if userID != nil {
		stats, err := b.botService.GetDictionaryStats(context.Background(), *userID)
		if err == nil && stats != nil && stats.StreakDays > 0 {
			streakMsg = fmt.Sprintf("\n🔥 Current Streak: *%d days*!", stats.StreakDays)
		}
	}

	b.sendMessage(chatID, fmt.Sprintf("🏁 Session Complete!\nAccuracy: %.1f%%%s", session.GetAccuracyPercent(), streakMsg))
	b.reviewSessions.Delete(chatID)

	if err := b.sessionRepo.DeleteSession(context.Background(), chatID, "review"); err != nil {
		b.logger.Error("Failed to delete review session from DB", zap.Int64("chat_id", chatID), zap.Error(err))
	}
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

func escapeMarkdown(text string) string {
	replacer := strings.NewReplacer(
		"_", "\\_",
		"*", "\\*",
		"[", "\\[",
		"]", "\\]",
	)
	return replacer.Replace(text)
}
