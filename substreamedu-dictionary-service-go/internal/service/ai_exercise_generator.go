package service

import (
	"fmt"
	"math/rand"
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

func shuffleStrings(slice []string) []string {
	if len(slice) <= 1 {
		return slice
	}
	res := make([]string, len(slice))
	copy(res, slice)
	rand.Shuffle(len(res), func(i, j int) {
		res[i], res[j] = res[j], res[i]
	})
	return res
}


func extractTargetWordGap(contextText, target string) (before, matchedToken, after string, found bool) {
	ctxLower := strings.ToLower(contextText)
	targetLower := strings.ToLower(target)
	if ctxLower == "" || targetLower == "" {
		return "", "", "", false
	}

	searchStart := 0
	for searchStart < len(ctxLower) {
		idx := strings.Index(ctxLower[searchStart:], targetLower)
		if idx == -1 {
			break
		}
		matchIdx := searchStart + idx

		// Check word boundary at the start:
		// Preceding character must NOT be a letter or digit (to avoid matching "in" in "beginning")
		startIsBoundary := matchIdx == 0
		if !startIsBoundary {
			r, _ := utf8.DecodeLastRuneInString(contextText[:matchIdx])
			startIsBoundary = !unicode.IsLetter(r) && !unicode.IsDigit(r)
		}

		if startIsBoundary {
			tokenStart := matchIdx
			tokenEnd := matchIdx + len(target)

			// Scan forward while subsequent characters are letters to capture word suffixes/inflections
			// (e.g. demolish -> demolished, blindside -> blindsided)
			runesAfter := []rune(contextText[tokenEnd:])
			extraLen := 0
			for _, r := range runesAfter {
				if unicode.IsLetter(r) {
					extraLen += utf8.RuneLen(r)
				} else {
					break
				}
			}
			tokenEnd += extraLen

			matched := contextText[tokenStart:tokenEnd]
			return contextText[:tokenStart], matched, contextText[tokenEnd:], true
		}

		searchStart = matchIdx + 1
	}

	// Fallback if no word-boundary match found: try simple substring
	idx := strings.Index(ctxLower, targetLower)
	if idx != -1 {
		return contextText[:idx], target, contextText[idx+len(target):], true
	}

	return "", "", "", false
}

func (s *AIService) generateAlgorithmicExercises(items []dto.WordWithMeaning) *dto.PracticeExercisesResponse {
	var exercises []dto.PracticeExercise
	for i, item := range items {
		target := strings.TrimSpace(item.Word)
		if target == "" {
			continue
		}

		ctxText := strings.TrimSpace(item.Context)
		var prompt, before, after string
		var matchedToken string
		if b, matched, a, ok := extractTargetWordGap(ctxText, target); ok {
			before = b
			matchedToken = matched
			after = a
			prompt = before + "______" + after
		} else {
			prompt = "She tried to ______ but found it harder than expected."
			before = "She tried to "
			after = " but found it harder than expected."
		}

		isMultiWord := strings.Contains(strings.TrimSpace(target), " ")
		var sameTypePool, otherTypePool []string
		seenPoolWords := make(map[string]bool)
		seenPoolWords[strings.ToLower(target)] = true
		if matchedToken != "" {
			seenPoolWords[strings.ToLower(matchedToken)] = true
		}

		for _, other := range items {
			otherWord := strings.TrimSpace(other.Word)
			if otherWord == "" {
				continue
			}
			lowerOther := strings.ToLower(otherWord)
			if seenPoolWords[lowerOther] {
				continue
			}
			seenPoolWords[lowerOther] = true

			if strings.Contains(otherWord, " ") == isMultiWord {
				sameTypePool = append(sameTypePool, otherWord)
			} else {
				otherTypePool = append(otherTypePool, otherWord)
			}
		}

		// Randomize distractor pools so every exercise has varied, unpredictable options
		sameTypePool = shuffleStrings(sameTypePool)
		otherTypePool = shuffleStrings(otherTypePool)

		options := []string{target}
		for _, o := range append(sameTypePool, otherTypePool...) {
			if len(options) >= 4 {
				break
			}
			options = append(options, o)
		}

		if len(options) < 4 {
			var fallbacks []string
			if isMultiWord {
				fallbacks = []string{"look into", "carry out", "give up", "bring up", "stand out", "figure out"}
			} else {
				fallbacks = []string{"consider", "resolve", "approach", "maintain", "indicate", "evaluate"}
			}
			fallbacks = shuffleStrings(fallbacks)
			for _, f := range fallbacks {
				if len(options) >= 4 {
					break
				}
				if !seenPoolWords[strings.ToLower(f)] {
					seenPoolWords[strings.ToLower(f)] = true
					options = append(options, f)
				}
			}
		}

		shuffledOptions := shuffleStrings(options)

		// Build deduplicated accepted answers (target, lowercase target, matchedToken in context)
		rawAnswers := []string{target}
		if lower := strings.ToLower(target); lower != target {
			rawAnswers = append(rawAnswers, lower)
		}
		if matchedToken != "" && !strings.EqualFold(matchedToken, target) {
			rawAnswers = append(rawAnswers, matchedToken)
			if lowerMatched := strings.ToLower(matchedToken); lowerMatched != matchedToken {
				rawAnswers = append(rawAnswers, lowerMatched)
			}
		}

		var acceptedAnswers []string
		seenAnswers := make(map[string]bool)
		for _, ans := range rawAnswers {
			trimmed := strings.TrimSpace(ans)
			if trimmed != "" && !seenAnswers[trimmed] {
				seenAnswers[trimmed] = true
				acceptedAnswers = append(acceptedAnswers, trimmed)
			}
		}

		hint := strings.TrimSpace(item.Meaning)
		var explanation string
		if hint != "" {
			explanation = fmt.Sprintf("Target word: '%s' (%s)", target, hint)
		} else {
			explanation = fmt.Sprintf("Target word: '%s'", target)
		}

		exercises = append(exercises, dto.PracticeExercise{
			ID:              fmt.Sprintf("ex_%d", i+1),
			Type:            "gap_fill",
			TargetWord:      target,
			Prompt:          prompt,
			SentenceBefore:  before,
			SentenceAfter:   after,
			Hint:            hint,
			Options:         shuffledOptions,
			AcceptedAnswers: acceptedAnswers,
			Explanation:     explanation,
		})
	}

	return &dto.PracticeExercisesResponse{Exercises: exercises}
}

var (
	bracketTagRegex = regexp.MustCompile(`(?s)\[[^\]]*\]|\([^\)]*\)|\{[^\}]*\}`)
	multiSpaceRegex = regexp.MustCompile(`\s+`)
)

func cleanContextSnippet(rawContext, targetWord string) string {
	cleaned := bracketTagRegex.ReplaceAllString(rawContext, " ")
	cleaned = strings.ReplaceAll(cleaned, "♪", " . ")
	cleaned = strings.ReplaceAll(cleaned, "♫", " . ")
	cleaned = strings.ReplaceAll(cleaned, "\n", " ")
	cleaned = multiSpaceRegex.ReplaceAllString(cleaned, " ")
	cleaned = strings.TrimSpace(cleaned)

	if cleaned == "" {
		return ""
	}

	targetLower := strings.ToLower(targetWord)
	sentences := splitIntoSentenceUnits(cleaned)

	var selectedSentence string
	for _, s := range sentences {
		sTrim := strings.TrimSpace(s)
		if sTrim == "" {
			continue
		}
		if containsWordBoundary(sTrim, targetLower) {
			selectedSentence = sTrim
			break
		}
	}

	if selectedSentence == "" {
		if len(sentences) > 0 {
			selectedSentence = sentences[0]
		} else {
			selectedSentence = cleaned
		}
	}

	selectedSentence = strings.TrimLeft(selectedSentence, "-–— \t\"“”'’.:,;")
	selectedSentence = strings.TrimRight(selectedSentence, "-–— \t\"“”'’,;")
	selectedSentence = strings.TrimSpace(selectedSentence)

	if selectedSentence == "" {
		return ""
	}

	r, size := utf8.DecodeRuneInString(selectedSentence)
	if unicode.IsLower(r) {
		selectedSentence = string(unicode.ToUpper(r)) + selectedSentence[size:]
	}

	if !strings.HasSuffix(selectedSentence, ".") &&
		!strings.HasSuffix(selectedSentence, "!") &&
		!strings.HasSuffix(selectedSentence, "?") &&
		!strings.HasSuffix(selectedSentence, ".\"") &&
		!strings.HasSuffix(selectedSentence, "!\"") &&
		!strings.HasSuffix(selectedSentence, "?\"") {
		selectedSentence += "."
	}

	return selectedSentence
}

func containsWordBoundary(text, targetLower string) bool {
	tLower := strings.ToLower(text)
	if targetLower == "" {
		return false
	}
	start := 0
	for {
		idx := strings.Index(tLower[start:], targetLower)
		if idx == -1 {
			return false
		}
		actualIdx := start + idx
		startOk := actualIdx == 0 || !unicode.IsLetter(rune(tLower[actualIdx-1]))
		if startOk {
			return true
		}
		start = actualIdx + 1
	}
}

func splitIntoSentenceUnits(text string) []string {
	var units []string
	var cur strings.Builder
	runes := []rune(text)
	for i := 0; i < len(runes); i++ {
		r := runes[i]
		cur.WriteRune(r)
		if r == '.' || r == '!' || r == '?' {
			if i+1 < len(runes) && runes[i+1] == '.' {
				continue
			}
			units = append(units, strings.TrimSpace(cur.String()))
			cur.Reset()
		} else if r == '-' && (i == 0 || unicode.IsSpace(runes[i-1])) && i+1 < len(runes) && unicode.IsLetter(runes[i+1]) {
			if cur.Len() > 1 {
				str := cur.String()
				units = append(units, strings.TrimSpace(str[:len(str)-1]))
				cur.Reset()
				cur.WriteRune('-')
			}
		}
	}
	if cur.Len() > 0 {
		units = append(units, strings.TrimSpace(cur.String()))
	}
	return units
}

func (s *AIService) generateAlgorithmicSessionStory(items []dto.WordWithMeaning, learningLang, fluentLang string) (string, string, []string) {
	if len(items) == 0 {
		return "Great job reviewing your vocabulary! Continue your daily practice to reinforce natural language fluency.",
			"Отличная работа с карточками! Продолжайте регулярные занятия для естественного закрепления слов.",
			[]string{"How can you apply these words in your daily conversations?"}
	}

	type processedItem struct {
		word         string
		cleanSnippet string
		hasSnippet   bool
	}

	processed := make([]processedItem, 0, len(items))
	for _, item := range items {
		w := strings.TrimSpace(item.Word)
		if w == "" {
			continue
		}
		snippet := cleanContextSnippet(item.Context, w)
		hasWord := containsWordBoundary(snippet, strings.ToLower(w))
		processed = append(processed, processedItem{
			word:         w,
			cleanSnippet: snippet,
			hasSnippet:   hasWord && snippet != "",
		})
	}

	if len(processed) == 0 {
		return "Great session! Every review step builds your natural language confidence.",
			"Отличная сессия! Каждое повторение приближает вас к свободному общению.",
			[]string{"Which vocabulary item felt most useful today?"}
	}

	n := len(processed)
	act1End := (n + 2) / 3
	act2End := (2*n + 2) / 3
	if act1End < 1 {
		act1End = 1
	}
	if act2End <= act1End {
		act2End = act1End + 1
	}
	if act2End > n {
		act2End = n
	}

	// 1. Original Story in Learning Language (English)
	var origStory strings.Builder
	origStory.WriteString("It began on an unusually eventful morning when an unexpected turn of events shook up the usual routine. ")
	act1Carriers := []string{
		"Alex looked around the room in utter disbelief: \"%s\"",
		"Elena sighed, trying to restore order before things escalated: \"%s\"",
		"Before anyone could object, a voice chimed in: \"%s\"",
		"They noticed the first sign of surprise right away: \"%s\"",
	}
	for i := 0; i < act1End; i++ {
		pi := processed[i]
		cIdx := i % len(act1Carriers)
		if pi.hasSnippet {
			origStory.WriteString(fmt.Sprintf(act1Carriers[cIdx], pi.cleanSnippet) + " ")
		} else {
			origStory.WriteString(fmt.Sprintf("Facing the situation required immediate attention to \"%s\", which nobody had anticipated. ", pi.word))
		}
	}

	origStory.WriteString("\n\nAs the afternoon progressed, the situation grew even more intriguing, bringing unexpected discoveries and lively discussions. ")
	act2Carriers := []string{
		"From just down the corridor, the conversation grew lively: \"%s\"",
		"Maya couldn't hold back a laugh despite the frantic pace: \"%s\"",
		"\"%s,\" came the quick response, shifting the entire mood in an instant.",
		"Stepping closer to the doorway, someone noted: \"%s\"",
	}
	for i := act1End; i < act2End; i++ {
		pi := processed[i]
		cIdx := (i - act1End) % len(act2Carriers)
		if pi.hasSnippet {
			origStory.WriteString(fmt.Sprintf(act2Carriers[cIdx], pi.cleanSnippet) + " ")
		} else {
			origStory.WriteString(fmt.Sprintf("Every conversation seemed to naturally circle back to \"%s\", sparking curious debate. ", pi.word))
		}
	}

	origStory.WriteString("\n\nBy evening, the initial confusion finally melted into genuine warmth and clarity. ")
	act3Carriers := []string{
		"Looking back at the whole adventure, someone finally admitted: \"%s\"",
		"Elena nodded with an affectionate smile: \"%s\"",
		"With a sense of hard-won relief, the final remark echoed through the room: \"%s\"",
		"As the dust settled, they couldn't help but laugh: \"%s\"",
	}
	for i := act2End; i < n; i++ {
		pi := processed[i]
		cIdx := (i - act2End) % len(act3Carriers)
		if pi.hasSnippet {
			origStory.WriteString(fmt.Sprintf(act3Carriers[cIdx], pi.cleanSnippet) + " ")
		} else {
			origStory.WriteString(fmt.Sprintf("It became clear that learning to embrace \"%s\" was the real turning point of the day. ", pi.word))
		}
	}
	origStory.WriteString("In the end, what had started as an unpredictable morning turned into an unforgettable story, proving that navigating life's surprises is what makes every experience worthwhile.")

	// 2. Fluent Story with Code-Switching
	var fluentStory strings.Builder
	isRussian := strings.HasPrefix(strings.ToLower(fluentLang), "ru") || strings.EqualFold(fluentLang, "russian")
	isUkrainian := strings.HasPrefix(strings.ToLower(fluentLang), "uk") || strings.EqualFold(fluentLang, "ukrainian")

	if isRussian {
		fluentStory.WriteString("Всё началось в один необычайно насыщенный день, когда привычный распорядок внезапно дал сбой. ")
		ruAct1 := []string{
			"Алекс окинул взглядом комнату в полном изумлении: «%s». ",
			"Елена с улыбкой поддержала разговор, пытаясь разрядить обстановку: «%s». ",
			"Не успели они сделать паузу, как раздалась забавная реплика: «%s». ",
			"С первых же минут всё привлекало внимание: «%s». ",
		}
		for i := 0; i < act1End; i++ {
			pi := processed[i]
			cIdx := i % len(ruAct1)
			if pi.hasSnippet {
				fluentStory.WriteString(fmt.Sprintf(ruAct1[cIdx], pi.cleanSnippet))
			} else {
				fluentStory.WriteString(fmt.Sprintf("Любая попытка проанализировать ситуацию неизбежно касалась понятия %s, требовавшего особого внимания. ", pi.word))
			}
		}

		fluentStory.WriteString("\n\nК середине дня события приобрели ещё более живой и неожиданный оборот. ")
		ruAct2 := []string{
			"Из соседней комнаты донеслось: «%s». ",
			"Майя лишь развела руками, не скрывая искреннего смеха: «%s». ",
			"«%s», — последовал быстрый и точный ответ, мгновенно сменивший тон беседы. ",
			"Каждая новая деталь добавляла интриги: «%s». ",
		}
		for i := act1End; i < act2End; i++ {
			pi := processed[i]
			cIdx := (i - act1End) % len(ruAct2)
			if pi.hasSnippet {
				fluentStory.WriteString(fmt.Sprintf(ruAct2[cIdx], pi.cleanSnippet))
			} else {
				fluentStory.WriteString(fmt.Sprintf("В центре внимания снова оказалось слово %s, вызвавшее бурное обсуждение среди всех присутствующих. ", pi.word))
			}
		}

		fluentStory.WriteString("\n\nК вечеру все недоразумения наконец прояснились, уступив место теплу и взаимопониманию. ")
		ruAct3 := []string{
			"Вспоминая события дня, кто-то с улыбкой заметил: «%s». ",
			"Елена согласно кивнула, подытожив: «%s». ",
			"С чувством искреннего облегчения прозвучала финальная фраза: «%s». ",
			"Взглянув на всё с высоты прошедшего дня, они рассмеялись: «%s». ",
		}
		for i := act2End; i < n; i++ {
			pi := processed[i]
			cIdx := (i - act2End) % len(ruAct3)
			if pi.hasSnippet {
				fluentStory.WriteString(fmt.Sprintf(ruAct3[cIdx], pi.cleanSnippet))
			} else {
				fluentStory.WriteString(fmt.Sprintf("Стало очевидно, что способность правильно воспринять %s помогла расставить всё по своим местам. ", pi.word))
			}
		}
		fluentStory.WriteString("В конечном счёте этот день доказал: умение с юмором встречать любые неожиданности превращает любую неразбериху в прекрасную историю.")
	} else if isUkrainian {
		fluentStory.WriteString("Усе розпочалося одного насиченого дня, коли звичний порядок несподівано змінився. ")
		ukAct1 := []string{
			"Алекс із подивом озирнувся довкола: «%s». ",
			"Олена з усмішкою підтримала розмову, намагаючись розрядити атмосферу: «%s». ",
			"Не встигли вони перевести подих, як пролунала дотепна репліка: «%s». ",
		}
		for i := 0; i < act1End; i++ {
			pi := processed[i]
			cIdx := i % len(ukAct1)
			if pi.hasSnippet {
				fluentStory.WriteString(fmt.Sprintf(ukAct1[cIdx], pi.cleanSnippet))
			} else {
				fluentStory.WriteString(fmt.Sprintf("Ситуація вимагала звернути особливу увагу на %s, чого ніхто заздалегідь не очікував. ", pi.word))
			}
		}

		fluentStory.WriteString("\n\nПо обіді події набули ще більш жвавого та несподіваного оберту. ")
		ukAct2 := []string{
			"Із сусідньої кімнати долинуло: «%s». ",
			"Майя щиро розсміялася, додавши: «%s». ",
			"«%s», — прозвучала влучна відповідь, яка миттєво підняла настрій усім присутнім. ",
		}
		for i := act1End; i < act2End; i++ {
			pi := processed[i]
			cIdx := (i - act1End) % len(ukAct2)
			if pi.hasSnippet {
				fluentStory.WriteString(fmt.Sprintf(ukAct2[cIdx], pi.cleanSnippet))
			} else {
				fluentStory.WriteString(fmt.Sprintf("У центрі кожної розмови природно виринало поняття %s, викликаючи цікаві міркування. ", pi.word))
			}
		}

		fluentStory.WriteString("\n\nНадвечір усі непорозуміння нарешті розвіялися, залишивши по собі приємне відчуття гармонії. ")
		ukAct3 := []string{
			"Згадуючи пригоди дня, хтось із усмішкою зазначив: «%s». ",
			"Олена впевнено підсумувала: «%s». ",
			"Зі щирим полегшенням пролунало: «%s». ",
		}
		for i := act2End; i < n; i++ {
			pi := processed[i]
			cIdx := (i - act2End) % len(ukAct3)
			if pi.hasSnippet {
				fluentStory.WriteString(fmt.Sprintf(ukAct3[cIdx], pi.cleanSnippet))
			} else {
				fluentStory.WriteString(fmt.Sprintf("Зрештою стало зрозуміло, що саме досвід із %s допоміг знайти ідеальне рішення. ", pi.word))
			}
		}
		fluentStory.WriteString("Зрештою цей день довів: уміння з гумором приймати будь-які несподіванки перетворює сум'яття на незабутню пригоду.")
	} else {
		fluentStory.WriteString(origStory.String())
	}

	questions := s.generateAlgorithmicQuestions(items, learningLang)
	return origStory.String(), fluentStory.String(), questions
}

func (s *AIService) generateAlgorithmicQuestions(items []dto.WordWithMeaning, learningLang string) []string {
	if len(items) == 0 {
		return []string{
			"How can you apply the vocabulary learned today in your daily conversations?",
			"Which phrase or concept from today's session was the most memorable for you?",
		}
	}

	questionTemplates := []string{
		"In the story, the characters encountered a situation with \"%s\". Have you ever experienced something similar in your own life?",
		"If you were suddenly faced with a moment where you had to \"%s\", how would you handle it?",
		"Why do you think people often react so strongly when dealing with \"%s\" in everyday conversations?",
		"What is your most memorable personal story or thought connected to \"%s\"?",
		"If a close friend asked for your perspective on \"%s\", what advice would you share?",
		"In your opinion, what is the biggest misconception people have about \"%s\"?",
		"How does navigating \"%s\" challenge or shape someone's character?",
		"Looking back at today's story, which character's reaction to \"%s\" resonated with you the most?",
		"When faced with a frantic or unexpected moment involving \"%s\", what helps you stay grounded?",
		"How can actively using \"%s\" elevate your natural fluency and confidence when speaking?",
	}

	var questions []string
	seen := make(map[string]bool)

	for i, item := range items {
		w := strings.TrimSpace(item.Word)
		if w == "" {
			continue
		}
		tmpl := questionTemplates[i%len(questionTemplates)]
		q := fmt.Sprintf(tmpl, w)
		if !seen[q] {
			seen[q] = true
			questions = append(questions, q)
		}
		if len(questions) >= 10 {
			break
		}
	}

	if len(questions) < 4 {
		generalQuestions := []string{
			"Which phrase or situation in today's story did you find the most relatable?",
			"How would you explain the key turning point in the story in your own words?",
			"What strategies help you incorporate newly learned words into your daily active vocabulary?",
		}
		for _, gq := range generalQuestions {
			if !seen[gq] && len(questions) < 6 {
				seen[gq] = true
				questions = append(questions, gq)
			}
		}
	}

	return questions
}

