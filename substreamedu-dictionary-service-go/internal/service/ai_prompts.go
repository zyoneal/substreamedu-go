package service

import (
	"encoding/json"
	"fmt"
	"strings"
)

func (s *AIService) createTranslationPrompt(text, sourceLang, targetLang, context, extendedContext string, isPartial bool) (string, string) {
	words := strings.Fields(strings.TrimSpace(text))
	wordCount := len(words)
	wordOrPhrase := "word"
	if wordCount > 1 {
		wordOrPhrase = "phrase"
	}

	isSentenceMode := wordCount >= 4

	systemPrompt := "You are an ultra-fast, production-grade linguistic analysis and translation engine.\n" +
		"Your mission is to provide accurate contextual translations, base dictionary lemmas, visual keywords, and rich contextual explanations for language learners.\n" +
		"You identify sociolinguistic register, suggest contextual alternatives, detect multi-word chunks (collocations, phrasal verbs, idioms), and note typical usage contexts.\n" +
		"Return ONLY a strictly valid JSON object matching the requested schema. Do NOT include markdown code blocks, backticks, preamble, or any conversational text."

	var sb strings.Builder

	if extendedContext != "" && extendedContext != context {
		sb.WriteString("[BROADER CONTEXT (if available):]\n")
		fmt.Fprintf(&sb, "\"%s\"\n\n", extendedContext)
	}

	sb.WriteString("TASK:\n")
	fmt.Fprintf(&sb, "Translate the %s highlighted %s \"%s\" into %s.\n\n", sourceLang, wordOrPhrase, text, targetLang)

	sb.WriteString("CRITICAL RULES:\n")
	sb.WriteString("MANDATORY SENSE COHERENCE (TRANSLATION & EXPLANATION MUST MATCH):\n")
	sb.WriteString("1. 'translation' (in " + targetLang + ") and 'definition' (in English) MUST DESCRIBE THE EXACT SAME SENSE IN CONTEXT.\n")
	sb.WriteString("2. 'translation' MUST be the natural " + targetLang + " translation of the specific CONTEXTUAL meaning, NEVER a literal or out-of-context word-for-word translation.\n")
	sb.WriteString("   - Example: 'sudden death' in sports/competition/gaming context means 'решающий раунд' or 'игра до первого гола/очка' -> 'translation' MUST be 'решающий раунд' or 'игра до первого гола', NEVER medical 'внезапная смерть'.\n")
	sb.WriteString("   - Example: 'strike' in baseball means 'страйк', in labor means 'забастовка', in combat means 'удар'. Choose the contextual meaning!\n")
	sb.WriteString("3. If a word or phrase has literal or other unrelated meanings, NEVER put them in 'translation' — put them strictly into 'other_meanings' with an identifying label (e.g. 'внезапная смерть (медицинский термин)').\n")
	sb.WriteString("4. 'definition' MUST be a concise English gloss (3-6 words) that directly explains 'translation' in this specific context.\n\n")

	if isSentenceMode {
		sb.WriteString("!!! SENTENCE / LONG PHRASE MODE !!!\n")
		sb.WriteString("1. The highlight is a SENTENCE or LONG PHRASE. Translate it naturally, idiomatically, and cohesively as a single complete unit into " + targetLang + ".\n")
		sb.WriteString("2. DO NOT translate word-by-word. Preserve tense, pragmatic intent, and nuance of the original.\n")
		sb.WriteString("3. 'definition' must be a concise English meaning/paraphrase of the whole expression (max 6 words).\n")
		sb.WriteString("4. 'recommended_selections' MUST be empty ([]).\n")
		sb.WriteString("5. 'visual_keyword' should be a single concrete English noun if strongly visual, otherwise \"\".\n")
		sb.WriteString("6. 'register': formal|informal|slang|neutral|academic|literary — the sociolinguistic register of this expression.\n")
		sb.WriteString("7. 'chunks', 'alternatives', 'typical_contexts' MUST be empty ([], [], []).\n\n")
	} else if isPartial || wordOrPhrase == "word" {
		sb.WriteString("!!! LEMMA PRIORITY: ON !!!\n")
		sb.WriteString("1. BASE FORM REQUIREMENT: The highlight is a SINGLE WORD or ROOT. You MUST return the absolute BASE DICTIONARY FORM in 'translation' (Infinitive for verbs, Nominative Singular for nouns/adjectives).\n")
		sb.WriteString("2. CONTEXT IS ONLY FOR MEANING: Use sentence context strictly to resolve semantic meaning (word sense disambiguation), but NEVER inflect the translation into the grammatical case, tense, or number of the sentence.\n")
		sb.WriteString("3. LITERAL MATCH: Match characters exactly. If highlight is 'idiot' in 'idiots', translate 'idiot' (singular). If 'want' in 'wanted', translate 'want' (infinitive).\n")
		sb.WriteString("4. TRANSCRIPTION: Provide exact, accurate IPA for the highlighted " + sourceLang + " text.\n")
		sb.WriteString("5. VISUAL KEYWORD: Exactly ONE concrete, physically drawable English noun representing the specific contextual meaning (e.g., 'runner' for 'running', 'sword' for 'betrayal', 'gavel' for 'verdict'). Return \"\" for abstract or grammatical words (e.g., 'however', 'almost', 'because', 'furthermore').\n")
		sb.WriteString("6. RECOMMENDED SELECTIONS: If \"" + text + "\" is part of a phrasal verb or idiom in the sentence, identify the complete expression in 'recommended_selections'. Otherwise MUST be empty ([]).\n")
		sb.WriteString("7. CONTEXTUAL EXPLANATION:\n")
		sb.WriteString("   - 'register': formal|informal|slang|neutral|academic|literary — the sociolinguistic register of the word in this context.\n")
		sb.WriteString("   - 'alternatives': 2-3 alternative translations into " + targetLang + " (or close contextual synonyms) that could replace this in context. Each MUST include its register and a brief English explanation note. Format: [{\"text\": \"string in " + targetLang + "\", \"register\": \"string\", \"usage_note\": \"brief note explaining this alternative\"}].\n")
		sb.WriteString("   - 'chunks': Multi-word units (collocations, phrasal verbs, idioms) containing this word found in the context. E.g., for 'make' in 'make a decision': [\"make a decision\", \"make up your mind\"].\n")
		sb.WriteString("   - 'typical_contexts': 2-3 typical situations/domains where this word is commonly used (e.g., [\"business meetings\", \"academic writing\", \"casual conversation\"]).\n\n")
	} else {
		sb.WriteString("!!! PHRASE MODE !!!\n")
		sb.WriteString("1. Translate the phrase as a cohesive linguistic unit into " + targetLang + " (matching its specific contextual sense).\n")
		sb.WriteString("2. 'definition' must be a concise English meaning (3-6 words) for this specific contextual usage.\n")
		sb.WriteString("3. 'visual_keyword': Single concrete drawable English noun representing the phrase, or \"\".\n")
		sb.WriteString("4. If the phrase is part of a larger idiom/phrasal verb, include it in 'recommended_selections'. Otherwise empty [].\n")
		sb.WriteString("5. 'register': formal|informal|slang|neutral|academic|literary — the sociolinguistic register.\n")
		sb.WriteString("6. 'alternatives': 2-3 alternative translations into " + targetLang + " with register labels and brief English explanation notes.\n")
		sb.WriteString("7. 'typical_contexts': 2-3 domains/situations where this phrase is commonly used.\n")
		sb.WriteString("8. 'chunks': If this phrase is part of a larger fixed expression, include it. Otherwise [].\n\n")
	}

	sb.WriteString("OUTPUT SCHEMA:\n")
	sb.WriteString("{\n")
	fmt.Fprintf(&sb, "  \"translation\": \"string\",  // Natural %s translation of the contextual meaning (MUST match 'definition'; NEVER an uncontextual literal translation)\n", targetLang)
	sb.WriteString("  \"definition\": \"string\",   // Concise English meaning (3-6 words) for this specific contextual usage\n")
	fmt.Fprintf(&sb, "  \"transcription\": \"string\",  // IPA transcription of original %s text\n", sourceLang)
	sb.WriteString("  \"partOfSpeech\": \"string\",   // noun|verb|adjective|adverb|preposition|conjunction|pronoun|interjection|phrase|idiom\n")
	sb.WriteString("  \"register\": \"string\",       // formal|informal|slang|neutral|academic|literary\n")
	sb.WriteString("  \"recommended_selections\": [\"string\"], // 1 contextually relevant larger unit (idiom/phrasal verb) or empty []\n")
	fmt.Fprintf(&sb, "  \"other_meanings\": [\"string\"],  // 2-3 alternative translations into %s for other senses (with qualifier in parentheses if applicable)\n", targetLang)
	fmt.Fprintf(&sb, "  \"alternatives\": [{\"text\": \"string\", \"register\": \"string\", \"usage_note\": \"string\"}], // 2-3 alternative translations in %s with register and brief note\n", targetLang)
	sb.WriteString("  \"chunks\": [\"string\"],        // Multi-word units (collocations, phrasal verbs, idioms) containing this word from context, or []\n")
	sb.WriteString("  \"typical_contexts\": [\"string\"], // 2-3 situations/domains where this word is commonly used, or []\n")
	sb.WriteString("  \"visual_keyword\": \"string\"   // Single concrete drawable English noun, or \"\"\n")
	sb.WriteString("}\n\n")

	if isSentenceMode {
		sb.WriteString("EXAMPLE:\n")
		sb.WriteString("Input: \"How low can you go\" in \"How low can you go?\"\n")
		sb.WriteString("Output:\n")
		sb.WriteString("{\n")
		sb.WriteString("  \"translation\": \"Как низко ты можешь опуститься\",\n")
		sb.WriteString("  \"definition\": \"questioning one's limits\",\n")
		sb.WriteString("  \"transcription\": \"/haʊ loʊ kæn juː ɡoʊ/\",\n")
		sb.WriteString("  \"partOfSpeech\": \"phrase\",\n")
		sb.WriteString("  \"register\": \"informal\",\n")
		sb.WriteString("  \"recommended_selections\": [],\n")
		sb.WriteString("  \"other_meanings\": [],\n")
		sb.WriteString("  \"alternatives\": [],\n")
		sb.WriteString("  \"chunks\": [],\n")
		sb.WriteString("  \"typical_contexts\": [],\n")
		sb.WriteString("  \"visual_keyword\": \"\"\n")
		sb.WriteString("}\n\n")
	} else {
		sb.WriteString("EXAMPLE:\n")
		sb.WriteString("Input: \"run\" in \"We need to run a test\"\n")
		sb.WriteString("Output:\n")
		sb.WriteString("{\n")
		sb.WriteString("  \"translation\": \"запустить\",\n")
		sb.WriteString("  \"definition\": \"execute or perform\",\n")
		sb.WriteString("  \"transcription\": \"/rʌn/\",\n")
		sb.WriteString("  \"partOfSpeech\": \"verb\",\n")
		sb.WriteString("  \"register\": \"neutral\",\n")
		sb.WriteString("  \"recommended_selections\": [\"run a test\"],\n")
		sb.WriteString("  \"other_meanings\": [\"бежать (физическое перемещение)\", \"управлять (бизнесом)\"],\n")
		sb.WriteString("  \"alternatives\": [{\"text\": \"выполнить\", \"register\": \"formal\", \"usage_note\": \"more formal contextual synonym\"}, {\"text\": \"провести\", \"register\": \"neutral\", \"usage_note\": \"general purpose contextual synonym\"}],\n")
		sb.WriteString("  \"chunks\": [\"run a test\", \"run an experiment\"],\n")
		sb.WriteString("  \"typical_contexts\": [\"software development\", \"scientific research\", \"quality assurance\"],\n")
		sb.WriteString("  \"visual_keyword\": \"runner\"\n")
		sb.WriteString("}\n\n")
	}

	sb.WriteString("INPUT:\n")
	fmt.Fprintf(&sb, "Text: \"%s\"\n", text)
	fmt.Fprintf(&sb, "Source: %s\n", sourceLang)
	fmt.Fprintf(&sb, "Target: %s\n", targetLang)
	if context != "" {
		fmt.Fprintf(&sb, "[Used in: \"%s\"]\n", context)
	}
	sb.WriteString("\nOUTPUT:\n")

	return systemPrompt, sb.String()
}

func (s *AIService) createCEFRLevelPrompt(cefrLevel, language, topic string) string {
	level := strings.ToUpper(cefrLevel)
	if level == "" {
		level = "B1"
	}
	topicInstruction := ""
	if strings.TrimSpace(topic) != "" {
		topicInstruction = fmt.Sprintf(" about the topic: %s", topic)
	}

	switch level {
	case "A1":
		return fmt.Sprintf("Write a unique, original text in %s%s. Use ONLY basic vocabulary. Simple present tense. Short sentences (5-7 words). 120-180 words total.", language, topicInstruction)
	case "A2":
		return fmt.Sprintf("Write an original text in %s%s. Use everyday vocabulary. Simple past, present, future tenses. 120-180 words total.", language, topicInstruction)
	case "B1":
		return fmt.Sprintf("Write a coherent text in %s%s. Use intermediate vocabulary and variety of tenses. 120-180 words total.", language, topicInstruction)
	case "B2":
		return fmt.Sprintf("Write a well-structured text in %s%s. Use advanced vocabulary and complex sentence structures. 120-180 words total.", language, topicInstruction)
	case "C1":
		return fmt.Sprintf("Write an original, sophisticated text in %s%s. Use highly advanced, nuanced vocabulary and idioms. 120-180 words total.", language, topicInstruction)
	default:
		return fmt.Sprintf("Write a unique text in %s%s. Write 120-180 words with appropriate complexity.", language, topicInstruction)
	}
}

func (s *AIService) getMaxTokensForLevel(cefrLevel string) int {
	level := strings.ToUpper(cefrLevel)
	switch level {
	case "A1":
		return 350
	case "A2":
		return 400
	case "B1":
		return 450
	case "B2":
		return 500
	case "C1":
		return 550
	default:
		return 450
	}
}

func (s *AIService) calculateOptimalMaxTokens(text string) int {
	words := strings.Fields(strings.TrimSpace(text))
	wordCount := len(words)

	// Calibrated token budget:
	// register, recommended_selections, other_meanings, alternatives, chunks, typical_contexts, visual_keyword
	// (top-level usage_note, style, and hint removed to optimize tokens & latency)
	if wordCount <= 3 {
		return 400
	}
	if wordCount <= 10 {
		return 500
	}
	return 600
}

func parseQuestionsResponse(raw string) []string {
	clean := strings.TrimSpace(raw)
	if strings.HasPrefix(clean, "```json") {
		clean = strings.TrimPrefix(clean, "```json")
	} else if strings.HasPrefix(clean, "```") {
		clean = strings.TrimPrefix(clean, "```")
	}
	clean = strings.TrimSuffix(clean, "```")
	clean = strings.TrimSpace(clean)

	var questions []string
	if err := json.Unmarshal([]byte(clean), &questions); err == nil && len(questions) > 0 {
		return cleanQuestionList(questions)
	}

	var wrapper struct {
		Questions []string `json:"questions"`
	}
	if err := json.Unmarshal([]byte(clean), &wrapper); err == nil && len(wrapper.Questions) > 0 {
		return cleanQuestionList(wrapper.Questions)
	}

	// Line-based fallback parsing
	lines := strings.Split(clean, "\n")
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		trimmed = strings.TrimPrefix(trimmed, "- ")
		trimmed = strings.TrimPrefix(trimmed, "* ")
		trimmed = strings.TrimLeft(trimmed, "0123456789.)- ")
		trimmed = strings.Trim(trimmed, "\",[] ")
		if len(trimmed) > 10 && strings.HasSuffix(trimmed, "?") {
			questions = append(questions, trimmed)
		}
	}

	return cleanQuestionList(questions)
}

func cleanQuestionList(input []string) []string {
	var result []string
	for _, q := range input {
		trimmed := strings.TrimSpace(q)
		trimmed = strings.TrimPrefix(trimmed, "- ")
		trimmed = strings.TrimPrefix(trimmed, "* ")
		trimmed = strings.TrimLeft(trimmed, "0123456789.) ")
		trimmed = strings.Trim(trimmed, "\"")
		trimmed = strings.TrimSpace(trimmed)
		if len(trimmed) > 5 {
			result = append(result, trimmed)
		}
	}
	return result
}
