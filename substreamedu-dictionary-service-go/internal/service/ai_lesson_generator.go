package service

import (
	"fmt"
	"strings"

	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

func (s *AIService) generateAlgorithmicLessonPlan(req dto.GenerateLessonRequest) *dto.LessonPlan {
	level := req.TargetLevel
	if level == "" {
		level = "B1"
	}
	title := req.Title
	if title == "" {
		title = "Video English Immersion Lesson"
	}

	vocabList := make([]dto.LessonVocabularyItem, 0)
	stopWords := map[string]bool{
		"the": true, "and": true, "for": true, "that": true, "this": true, "with": true,
		"from": true, "have": true, "were": true, "will": true, "been": true, "there": true,
		"what": true, "when": true, "where": true, "which": true, "about": true, "their": true,
		"would": true, "could": true, "should": true, "they": true, "your": true, "some": true,
	}

	seenWords := make(map[string]bool)
	if len(req.Subtitles) > 0 {
		for _, cue := range req.Subtitles {
			words := strings.Fields(cue.Text)
			for _, w := range words {
				cleanWord := strings.ToLower(strings.Trim(w, ",.?!\"'`:;()[]{}"))
				if len(cleanWord) >= 5 && !stopWords[cleanWord] && !seenWords[cleanWord] {
					seenWords[cleanWord] = true
					vocabList = append(vocabList, dto.LessonVocabularyItem{
						Word:         cleanWord,
						Definition:   fmt.Sprintf("Key contextual term observed in video segment: \"%s\"", cleanWord),
						Context:      cue.Text,
						TimestampSec: cue.Start,
						CEFR:         level,
					})
					if len(vocabList) >= 6 {
						break
					}
				}
			}
			if len(vocabList) >= 6 {
				break
			}
		}
	}

	if len(vocabList) == 0 {
		vocabList = []dto.LessonVocabularyItem{
			{
				Word:         "perspective",
				Definition:   "A particular attitude towards or way of regarding something; a point of view.",
				Context:      "Examining key points from different perspectives.",
				TimestampSec: 10.0,
				CEFR:         level,
			},
			{
				Word:         "clarification",
				Definition:   "The action of making a statement or situation less confused and more comprehensible.",
				Context:      "Seeking clarification on key dialogue lines.",
				TimestampSec: 25.0,
				CEFR:         level,
			},
			{
				Word:         "nuance",
				Definition:   "A subtle difference in or shade of meaning, expression, or sound.",
				Context:      "Notice the cultural nuance in the phrasing.",
				TimestampSec: 45.0,
				CEFR:         level,
			},
		}
	}

	return &dto.LessonPlan{
		Title:            title,
		Level:            level,
		EstimatedTimeMin: 45,
		Summary:          fmt.Sprintf("Interactive lesson exploring authentic language patterns, targeted vocabulary, and comprehension nuances based on \"%s\".", title),
		Vocabulary:       vocabList,
		ComprehensionQuestions: []dto.LessonQuestion{
			{
				Question:     fmt.Sprintf("What is the central focus of the video discussion in \"%s\"?", title),
				Type:         "multiple-choice",
				Options:      []string{"Exploring key contextual ideas and authentic dialogue", "Discussing unrelated historical facts", "Reviewing technical mathematics", "Practicing silence and quiet reading"},
				CorrectIndex: 0,
				Explanation:  "The video centers on conversational English and meaningful dialogue exchange.",
			},
			{
				Question:     "The speaker uses authentic conversational pacing and vocabulary throughout the segment.",
				Type:         "true-false",
				Options:      []string{"True", "False"},
				CorrectIndex: 0,
				Explanation:  "The video provides authentic, natural target-language speech samples.",
			},
			{
				Question:     "Why is paying attention to timestamped context clues beneficial when reviewing this video?",
				Type:         "multiple-choice",
				Options:      []string{"It anchors word meaning to real-world visual and emotional cues", "It allows you to skip watching the video", "It replaces the need for dictionary definitions", "It makes the video playback slower"},
				CorrectIndex: 0,
				Explanation:  "Contextual cues anchor vocabulary in episodic memory.",
			},
		},
		GrammarFocus: []dto.LessonGrammarPoint{
			{
				Pattern:          "Contextual Discourse & Clause Linkers",
				Rule:             "Use connecting adverbs and subordinating conjunctions to link causes, contrasts, and narrative events naturally.",
				ExampleFromVideo: "Authentic dialogue extracted from video playback.",
				ExerciseGapFill:  "She wanted to understand the speaker clearly, ___ she paused and reviewed the subtitle cue.",
				ExerciseAnswer:   "so",
			},
		},
		SpeakingPrompts: []string{
			fmt.Sprintf("In your own words, how would you summarize the main event or message of \"%s\" to a friend?", title),
			"Have you encountered a similar situation or conversation in your own daily life? Describe what happened.",
			"Which new word or phrase from this video will you try to use in your next English conversation?",
		},
		HomeworkIdea: fmt.Sprintf("Write a 4-5 sentence journal entry or record a 60-second voice note using at least 2 target vocabulary words from \"%s\".", title),
	}
}
