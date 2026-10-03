package com.substreamedu.notification.bot;

import com.substreamedu.notification.dto.response.DictionaryItemResponse;
import com.substreamedu.notification.dto.response.UserResponse;
import com.substreamedu.notification.service.BotService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.bots.TelegramLongPollingBot;
import org.telegram.telegrambots.meta.api.methods.commands.SetMyCommands;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.methods.send.SendPhoto;
import org.telegram.telegrambots.meta.api.objects.InputFile;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.api.objects.commands.BotCommand;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.buttons.InlineKeyboardButton;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class SubstreamEduBot extends TelegramLongPollingBot {

    private final String username;
    private final BotService botService;

    private final Map<Long, UserState> userStates = new ConcurrentHashMap<>();
    private final Map<Long, ReviewSession> reviewSessions = new ConcurrentHashMap<>();

    public SubstreamEduBot(
            @Value("${telegram.bot.token}") String botToken,
            @Value("${telegram.bot.username}") String username,
            BotService botService) {
        super(botToken);
        this.username = username;
        this.botService = botService;
        initializeMenu();
    }

    private void initializeMenu() {
        List<BotCommand> commands = Arrays.asList(
                new BotCommand("/start", "Start the bot and authenticate"),
                new BotCommand("/random_word", "Get a random word to learn"),
                new BotCommand("/review", "Review previously learned words"),
                new BotCommand("/show_progress", "View your learning progress"));
        try {
            execute(new SetMyCommands(commands, null, null));
        } catch (TelegramApiException e) {
            log.error("Failed to set bot commands", e);
        }
    }

    @Override
    public String getBotUsername() {
        return username;
    }

    @Override
    public void onUpdateReceived(Update update) {
        if (update.hasMessage() && update.getMessage().hasText()) {
            handleTextMessage(update);
        } else if (update.hasCallbackQuery()) {
            handleCallbackQuery(update);
        }
    }

    private void handleTextMessage(Update update) {
        String text = update.getMessage().getText();
        Long chatId = update.getMessage().getChatId();

        UserState userState = userStates.get(chatId);
        if (userState != null && "AWAITING_TOKEN".equals(userState.state())) {
            handleTelegramTokenInput(chatId, text);
            return;
        }

        if (text.startsWith("/")) {
            if (text.startsWith("/start")) {
                String[] parts = text.split("\\s+", 2);
                handleStartCommand(chatId, parts.length > 1 ? parts[1].trim() : null);
            } else {
                switch (text) {
                    case "/random_word" -> handleRandomWord(chatId);
                    case "/review" -> handleReview(chatId);
                    case "/show_progress" -> handleShowProgress(chatId);
                    default -> sendMessage(chatId, "Unknown command.");
                }
            }
        }
    }

    private void handleStartCommand(Long chatId, String token) {
        if (token != null && !token.isEmpty()) {
            authenticateWithToken(chatId, token);
        } else if (!userStates.containsKey(chatId)) {
            userStates.put(chatId, UserState.awaitingToken());
            sendMessage(chatId, "👋 Welcome! Please enter your authentication token from the website.");
        } else {
            sendMessage(chatId, "Welcome back! Use /review to start learning.");
        }
    }

    private void authenticateWithToken(Long chatId, String token) {
        try {
            UserResponse user = botService.authenticate(token);

            if (user != null) {
                userStates.put(chatId, UserState.empty(user.id()));
                sendMessage(chatId, "✅ Successfully authenticated!");
            } else {
                sendMessage(chatId, "❌ Invalid token.");
            }
        } catch (Exception e) {
            log.error("Auth failed", e);
            sendMessage(chatId, "❌ Authentication error.");
        }
    }

    private void handleTelegramTokenInput(Long chatId, String token) {
        authenticateWithToken(chatId, token);
    }

    private void handleRandomWord(Long chatId) {
        UUID userId = getUserId(chatId);
        if (userId == null)
            return;

        try {
            DictionaryItemResponse word = botService.getRandomWord(userId);

            if (word != null) {
                startReviewSession(chatId, Collections.singletonList(word));
            }
        } catch (Exception e) {
            log.error("Failed to get random word", e);
            sendMessage(chatId, "Error fetching word.");
        }
    }

    private void handleReview(Long chatId) {
        UUID userId = getUserId(chatId);
        if (userId == null)
            return;

        try {
            List<DictionaryItemResponse> words = botService.getSrsCardsForToday(userId);

            if (words == null || words.isEmpty()) {
                sendMessage(chatId, "🪹 No words to review today!");
            } else {
                startReviewSession(chatId, words);
            }
        } catch (Exception e) {
            log.error("Failed to get review words", e);
            sendMessage(chatId, "Error fetching words.");
        }
    }

    private void startReviewSession(Long chatId, List<DictionaryItemResponse> words) {
        ReviewSession session = new ReviewSession(words);
        reviewSessions.put(chatId, session);
        sendMessage(chatId, "Starting review session for " + words.size() + " words...");
        sendNextWord(chatId, session);
    }

    private void sendNextWord(Long chatId, ReviewSession session) {
        if (!session.hasNext()) {
            finishSession(chatId, session);
            return;
        }

        DictionaryItemResponse word = session.next();
        Long wordId = word.id();
        session.setWordStartTime(wordId, System.currentTimeMillis());

        String text = String.format("📝 Word %d/%d\n\n* %s *",
                session.getCurrentIndex(), session.getTotal(), word.highlightedText());

        if (word.transcription() != null)
            text += "\n[" + word.transcription() + "]";
        if (word.context() != null)
            text += "\n\n💡 Example:\n" + word.context();

        InlineKeyboardMarkup markup = new InlineKeyboardMarkup();
        markup.setKeyboard(Collections.singletonList(Collections.singletonList(
                InlineKeyboardButton.builder().text("👁️ Show Answer").callbackData("show_answer_" + wordId).build())));

        sendMessageWithMarkup(chatId, text, markup);
    }

    private void handleCallbackQuery(Update update) {
        String data = update.getCallbackQuery().getData();
        Long chatId = update.getCallbackQuery().getMessage().getChatId();

        if (data.startsWith("show_answer_")) {
            showAnswer(chatId, Long.parseLong(data.substring(12)));
        } else if (data.startsWith("rate_")) {
            handleRating(chatId, data);
        }
    }

    private void showAnswer(Long chatId, Long wordId) {
        ReviewSession session = reviewSessions.get(chatId);
        if (session == null || session.getCurrentWord() == null)
            return;

        DictionaryItemResponse word = session.getCurrentWord();
        session.showAnswer();

        String text = String.format("✅ *%s*\n\n📚 %s", word.highlightedText(), word.translatedText());
        if (word.definition() != null)
            text += "\n" + word.definition();

        String imageUrl = word.imageUrl();
        if (imageUrl != null && !imageUrl.isEmpty()) {
            sendPhoto(chatId, imageUrl, text);
        } else {
            sendMessage(chatId, text);
        }

        InlineKeyboardMarkup markup = new InlineKeyboardMarkup();
        markup.setKeyboard(Collections.singletonList(Arrays.asList(
                InlineKeyboardButton.builder().text("😞 Forgot").callbackData("rate_forgot_" + wordId).build(),
                InlineKeyboardButton.builder().text("😊 Remember").callbackData("rate_remember_" + wordId).build())));
        sendMessageWithMarkup(chatId, "Do you remember this word?", markup);
    }

    private void handleRating(Long chatId, String data) {
        ReviewSession session = reviewSessions.get(chatId);
        if (session == null)
            return;

        String[] parts = data.split("_");
        String rating = parts[1];
        Long wordId = Long.parseLong(parts[2]);

        int duration = session.getWordDuration(wordId);
        session.recordAnswer(rating, session.getCurrentWord());

        UUID userId = getUserId(chatId);
        if (userId != null) {
            botService.recordAnswer(userId, wordId, rating, duration);
        }

        if ("forgot".equals(rating)) {
            session.addWordToEnd(session.getCurrentWord());
        }

        sendNextWord(chatId, session);
    }

    private void finishSession(Long chatId, ReviewSession session) {
        sendMessage(chatId, String.format("🏁 Session Complete!\nAccuracy: %.1f%%", session.getAccuracyPercent()));
        reviewSessions.remove(chatId);
    }

    private void handleShowProgress(Long chatId) {
        UUID userId = getUserId(chatId);
        if (userId == null)
            return;

        try {
            Integer streak = botService.getStreak(userId);
            sendMessage(chatId, "🔥 Your current streak: " + (streak != null ? streak : 0) + " days");
        } catch (Exception e) {
            sendMessage(chatId, "Error fetching progress.");
        }
    }

    private UUID getUserId(Long chatId) {
        UserState state = userStates.get(chatId);
        if (state == null || state.userId() == null) {
            sendMessage(chatId, "Please authenticate first using /start");
            return null;
        }
        return state.userId();
    }

    private void sendMessage(Long chatId, String text) {
        SendMessage message = new SendMessage(chatId.toString(), text);
        message.setParseMode("Markdown");
        try {
            execute(message);
        } catch (TelegramApiException e) {
            log.error("Failed to send message", e);
        }
    }

    private void sendMessageWithMarkup(Long chatId, String text, InlineKeyboardMarkup markup) {
        SendMessage message = new SendMessage(chatId.toString(), text);
        message.setParseMode("Markdown");
        message.setReplyMarkup(markup);
        try {
            execute(message);
        } catch (TelegramApiException e) {
            log.error("Failed to send message with markup", e);
        }
    }

    private void sendPhoto(Long chatId, String url, String caption) {
        SendPhoto photo = new SendPhoto(chatId.toString(), new InputFile(url));
        photo.setCaption(caption);
        photo.setParseMode("Markdown");
        try {
            execute(photo);
        } catch (TelegramApiException e) {
            log.warn("Failed to send photo, falling back to text", e);
            sendMessage(chatId, caption);
        }
    }
}
