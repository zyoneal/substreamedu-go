package com.substreamedu.notification.bot;

import com.substreamedu.notification.dto.response.DictionaryItemResponse;
import lombok.Getter;
import lombok.Setter;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Stack;

@Getter
public class ReviewSession {

    private final List<DictionaryItemResponse> words;
    private int currentIndex = 0;
    private final Instant startTime;
    private int difficultCount = 0;
    private int normalCount = 0;
    private int easyCount = 0;

    private final Stack<ReviewAction> history = new Stack<>();
    @Setter
    private DictionaryItemResponse currentWord;
    private boolean answerShown = false;
    private final Map<Long, Long> wordStartTimes = new HashMap<>();

    public ReviewSession(List<DictionaryItemResponse> words) {
        this.words = new ArrayList<>(words);
        this.startTime = Instant.now();
        if (!words.isEmpty()) {
            this.currentWord = words.get(0);
        }
    }

    public boolean hasNext() {
        return currentIndex < words.size();
    }

    public DictionaryItemResponse next() {
        if (!hasNext()) {
            return null;
        }
        currentWord = words.get(currentIndex);
        currentIndex++;
        answerShown = false;
        return currentWord;
    }

    public void showAnswer() {
        answerShown = true;
    }

    public void recordAnswer(String choice, DictionaryItemResponse word) {
        ReviewAction action = new ReviewAction(word, choice, currentIndex - 1);
        history.push(action);

        switch (choice.toLowerCase()) {
            case "hard", "forgot" -> difficultCount++;
            case "normal" -> normalCount++;
            case "easy", "remember" -> easyCount++;
        }
    }

    public boolean canUndo() {
        return !history.isEmpty() && currentIndex > 0;
    }

    public DictionaryItemResponse undo() {
        if (!canUndo()) {
            return null;
        }

        ReviewAction lastAction = history.pop();
        currentIndex = lastAction.index();
        currentWord = lastAction.word();
        answerShown = false;

        switch (lastAction.choice().toLowerCase()) {
            case "hard", "forgot" -> difficultCount--;
            case "normal" -> normalCount--;
            case "easy", "remember" -> easyCount--;
        }

        return currentWord;
    }

    public long getDurationMinutes() {
        return Duration.between(startTime, Instant.now()).toMinutes();
    }

    public long getDurationSeconds() {
        return Duration.between(startTime, Instant.now()).getSeconds();
    }

    public double getAccuracyPercent() {
        int total = difficultCount + normalCount + easyCount;
        if (total == 0)
            return 0.0;
        return ((double) (normalCount + easyCount) / total) * 100;
    }

    public int getTotal() {
        return words.size();
    }

    public void addWordToEnd(DictionaryItemResponse word) {
        words.add(word);
    }

    public void setWordStartTime(Long wordId, long startTime) {
        wordStartTimes.put(wordId, startTime);
    }

    public int getWordDuration(Long wordId) {
        Long start = wordStartTimes.get(wordId);
        if (start == null)
            return 0;
        return (int) ((System.currentTimeMillis() - start) / 1000);
    }

    public record ReviewAction(
            DictionaryItemResponse word,
            String choice,
            int index) {
    }
}
