package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	json "github.com/goccy/go-json"
	"github.com/redis/go-redis/v9"

	"github.com/sony/gobreaker"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
	"github.com/substreamedu/substreamedu-dictionary-service/internal/resilience"
	"go.uber.org/zap"
)

type AIService struct {
	deepseekKey	string
	groqKey		string
	geminiKey	string
	deepseekURL	string
	groqURL		string
	geminiURL	string
	httpClient	*http.Client
	languageCache	map[string]string
	redis		*redis.Client
	logger		*zap.Logger
	breaker		*gobreaker.CircuitBreaker
	groqBreaker	*gobreaker.CircuitBreaker
	geminiBreaker	*gobreaker.CircuitBreaker
}

func NewAIService(deepseekKey, groqKey, geminiKey string, rdb *redis.Client, logger *zap.Logger) *AIService {
	cache := make(map[string]string)
	cache["en"] = "English"
	cache["ru"] = "Russian"
	cache["uk"] = "Ukrainian"
	cache["pl"] = "Polish"
	cache["es"] = "Spanish"
	cache["pt"] = "Portuguese"
	cache["tr"] = "Turkish"
	cache["id"] = "Indonesian"
	cache["ar"] = "Arabic"
	cache["vi"] = "Vietnamese"

	return &AIService{
		deepseekKey:	deepseekKey,
		groqKey:	groqKey,
		geminiKey:	geminiKey,
		deepseekURL:	"https://api.deepseek.com",
		groqURL:	"https://api.groq.com/openai/v1",
		geminiURL:	"https://generativelanguage.googleapis.com/v1beta/openai",
		httpClient:	&http.Client{Timeout: 45 * time.Second},
		languageCache:	cache,
		redis:		rdb,
		logger:		logger,
		breaker:	resilience.NewCircuitBreaker("deepseek-api", logger),
		groqBreaker:	resilience.NewCircuitBreaker("groq-api", logger),
		geminiBreaker:	resilience.NewCircuitBreaker("gemini-api", logger),
	}
}

func (s *AIService) getLogger(ctx context.Context) *zap.Logger {
	if l, ok := ctx.Value("logger").(*zap.Logger); ok {
		return l
	}
	return s.logger
}
func (s *AIService) TranslateWithContext(ctx context.Context, req dto.DictionaryRequest) (string, string, error) {
	// Total deadline across all fallback providers (DeepSeek → Gemini → Groq)
	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	resolvedTarget := req.FluentLanguage
	if val, ok := s.languageCache[req.FluentLanguage]; ok {
		resolvedTarget = val
	}
	resolvedSource := req.LearningLanguage
	if val, ok := s.languageCache[req.LearningLanguage]; ok {
		resolvedSource = val
	}

	cacheKey := fmt.Sprintf("ai:translation:v2.1:%s:%s:%s", req.HighlightedText, req.FluentLanguage, req.Context)
	if s.redis != nil {
		if val, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
			s.logger.Info("AI Cache Hit", zap.String("key", cacheKey))
			provider, _ := s.redis.Get(ctx, cacheKey+":provider").Result()
			if provider == "" {
				provider = "cached"
			}
			return val, provider, nil
		}
	}

	isPartial := false
	wordCount := len(strings.Split(strings.TrimSpace(req.HighlightedText), " "))

	if req.Context != "" && req.HighlightedText != "" && wordCount == 1 {

		cleanCtx := strings.ToLower(req.Context)
		target := strings.ToLower(req.HighlightedText)

		tokens := strings.FieldsFunc(cleanCtx, func(r rune) bool {
			return !((r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r > 127 || r == '\'' || r == '-')
		})

		isFullMatch := false
		for _, t := range tokens {
			if t == target {
				isFullMatch = true
				break
			}
		}
		isPartial = !isFullMatch
	}

	systemPrompt, userPrompt := s.createTranslationPrompt(
		req.HighlightedText,
		resolvedSource,
		resolvedTarget,
		req.Context,
		req.ExtendedContext,
		isPartial,
	)

	dsReq := dto.DeepSeekRequest{
		Model: "deepseek-chat",
		Messages: []dto.DeepSeekMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		MaxTokens:   s.calculateOptimalMaxTokens(req.HighlightedText),
		Temperature: 0.1,
		TopP:        0.95,
	}

	var resp string
	var err error
	var errs []string
	var activeProvider string

	if s.deepseekKey != "" {
		dsReq.Model = "deepseek-chat"
		resp, err = s.callDeepSeek(ctx, dsReq)
		if err == nil {
			activeProvider = "deepseek"
		} else {
			errs = append(errs, fmt.Sprintf("DeepSeek failed: %v", err))
		}
	} else {
		err = fmt.Errorf("DeepSeek API key is not configured")
		errs = append(errs, "DeepSeek skipped (not configured)")
	}

	if err != nil {
		s.logger.Warn("DeepSeek translation failed, trying Gemini 1.5 Flash", zap.Error(err))
		if s.geminiKey != "" {
			dsReq.Model = "gemini-1.5-flash"
			resp, err = s.callGemini(ctx, dsReq)
			if err == nil {
				activeProvider = "gemini"
			} else {
				errs = append(errs, fmt.Sprintf("Gemini failed: %v", err))
			}
		} else {
			err = fmt.Errorf("Gemini API key is not configured")
			errs = append(errs, "Gemini skipped (not configured)")
		}
	}

	if err != nil {
		s.logger.Warn("Gemini translation failed, trying Groq Llama-3.3-70B", zap.Error(err))
		if s.groqKey != "" {
			dsReq.Model = "llama-3.3-70b-versatile"
			resp, err = s.callGroq(ctx, dsReq)
			if err == nil {
				activeProvider = "groq"
			} else {
				errs = append(errs, fmt.Sprintf("Groq failed: %v", err))
			}
		} else {
			err = fmt.Errorf("Groq API key is not configured")
			errs = append(errs, "Groq skipped (not configured)")
		}
	}

	if err != nil {
		return "", "", fmt.Errorf("all translation providers failed: %s", strings.Join(errs, " | "))
	}

	if err == nil {
		if s.redis != nil {
			s.redis.Set(ctx, cacheKey, resp, 24*time.Hour)
			s.redis.Set(ctx, cacheKey+":provider", activeProvider, 24*time.Hour)
		}
	}
	return resp, activeProvider, nil
}

func (s *AIService) createTranslationPrompt(text, sourceLang, targetLang, context, extendedContext string, isPartial bool) (string, string) {
	words := strings.Split(strings.TrimSpace(text), " ")
	wordCount := len(words)
	wordOrPhrase := "word"
	if wordCount > 1 {
		wordOrPhrase = "phrase"
	}

	isSentenceMode := wordCount >= 4

	systemPrompt := "You are an ultra-fast, production-grade linguistic analysis and translation engine.\n" +
		"Your mission is to provide accurate contextual translations, base dictionary lemmas, and visual keywords for language learners.\n" +
		"Return ONLY a strictly valid JSON object matching the requested schema. Do NOT include markdown code blocks, backticks, preamble, or any conversational text."

	var sb strings.Builder

	if extendedContext != "" {
		sb.WriteString("[BROADER CONTEXT (if available):]\n")
		fmt.Fprintf(&sb, "\"%s\"\n\n", extendedContext)
	}

	if context != "" {
		sb.WriteString("[IMMEDIATE SENTENCE (if available):]\n")
		fmt.Fprintf(&sb, "\"%s\"\n\n", context)
	}

	sb.WriteString("TASK:\n")
	fmt.Fprintf(&sb, "Translate the %s highlighted %s \"%s\" into %s.\n\n", sourceLang, wordOrPhrase, text, targetLang)

	sb.WriteString("CRITICAL RULES:\n")
	if isSentenceMode {
		sb.WriteString("!!! SENTENCE / LONG PHRASE MODE !!!\n")
		sb.WriteString("1. The highlight is a SENTENCE or LONG PHRASE. Translate it naturally, idiomatically, and cohesively as a single complete unit into " + targetLang + ".\n")
		sb.WriteString("2. DO NOT translate word-by-word. Preserve tense, pragmatic intent, and nuance of the original.\n")
		sb.WriteString("3. 'definition' must be a concise English meaning/paraphrase of the whole expression (max 6 words).\n")
		sb.WriteString("4. 'hint' and 'recommended_selections' MUST be empty (\"\" and []).\n")
		sb.WriteString("5. 'visual_keyword' should be a single concrete English noun if strongly visual, otherwise \"\".\n\n")
	} else if isPartial || wordOrPhrase == "word" {
		sb.WriteString("!!! LEMMA PRIORITY: ON !!!\n")
		sb.WriteString("1. BASE FORM REQUIREMENT: The highlight is a SINGLE WORD or ROOT. You MUST return the absolute BASE DICTIONARY FORM in 'translation' (Infinitive for verbs, Nominative Singular for nouns/adjectives).\n")
		sb.WriteString("2. CONTEXT IS ONLY FOR MEANING: Use sentence context strictly to resolve semantic meaning (word sense disambiguation), but NEVER inflect the translation into the grammatical case, tense, or number of the sentence.\n")
		sb.WriteString("3. LITERAL MATCH: Match characters exactly. If highlight is 'idiot' in 'idiots', translate 'idiot' (singular). If 'want' in 'wanted', translate 'want' (infinitive).\n")
		sb.WriteString("4. TRANSCRIPTION: Provide exact, accurate IPA for the highlighted " + sourceLang + " text.\n")
		sb.WriteString("5. VISUAL KEYWORD: Exactly ONE concrete, physically drawable English noun representing the specific contextual meaning (e.g., 'runner' for 'running', 'sword' for 'betrayal', 'gavel' for 'verdict'). Return \"\" for abstract or grammatical words (e.g., 'however', 'almost', 'because', 'furthermore').\n")
		sb.WriteString("6. HINT & RECOMMENDED SELECTIONS: If \"" + text + "\" is part of a phrasal verb or idiom in the sentence, identify the complete expression in 'hint' and 'recommended_selections'. Otherwise MUST be empty (\"\" and []).\n\n")
	} else {
		sb.WriteString("!!! PHRASE MODE !!!\n")
		sb.WriteString("1. Translate the phrase as a cohesive linguistic unit into " + targetLang + ".\n")
		sb.WriteString("2. 'definition' must be a concise English meaning (3-6 words) for this specific usage.\n")
		sb.WriteString("3. 'visual_keyword': Single concrete drawable English noun representing the phrase, or \"\".\n")
		sb.WriteString("4. If the phrase is part of a larger idiom/phrasal verb, include it in 'hint' and 'recommended_selections'. Otherwise empty.\n\n")
	}

	sb.WriteString("OUTPUT SCHEMA:\n")
	sb.WriteString("{\n")
	fmt.Fprintf(&sb, "  \"translation\": \"string\",  // %s translation of the highlighted text (in base lemma for single words)\n", targetLang)
	sb.WriteString("  \"definition\": \"string\",   // Concise English meaning (3-6 words) for this specific contextual usage\n")
	fmt.Fprintf(&sb, "  \"transcription\": \"string\",  // IPA transcription of original %s text\n", sourceLang)
	sb.WriteString("  \"partOfSpeech\": \"string\",   // noun|verb|adjective|adverb|preposition|conjunction|pronoun|interjection|phrase|idiom\n")
	sb.WriteString("  \"style\": \"string\",          // formal|informal|slang|neutral\n")
	sb.WriteString("  \"hint\": \"string\",           // Full idiom/phrasal verb if applicable (max 25 chars), otherwise \"\"\n")
	sb.WriteString("  \"recommended_selections\": [\"string\"], // 1 contextually relevant larger unit (idiom/phrasal verb) or empty []\n")
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
		sb.WriteString("  \"style\": \"informal\",\n")
		sb.WriteString("  \"hint\": \"\",\n")
		sb.WriteString("  \"recommended_selections\": [],\n")
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
		sb.WriteString("  \"style\": \"neutral\",\n")
		sb.WriteString("  \"hint\": \"run a test\",\n")
		sb.WriteString("  \"recommended_selections\": [\"run a test\"],\n")
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

func (s *AIService) GenerateTextByLevel(ctx context.Context, cefrLevel, language, topic string) (string, error) {
	resolvedLanguage := language
	if val, ok := s.languageCache[language]; ok {
		resolvedLanguage = val
	}

	cacheKey := fmt.Sprintf("ai:text:%s:%s:%s", cefrLevel, language, topic)
	if s.redis != nil {
		if val, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
			s.logger.Info("AI Cache Hit", zap.String("key", cacheKey))
			return val, nil
		}
	}

	prompt := s.createCEFRLevelPrompt(cefrLevel, resolvedLanguage, topic)

	dsReq := dto.DeepSeekRequest{
		Model:	"llama-3.3-70b-versatile",
		Messages: []dto.DeepSeekMessage{
			{Role: "user", Content: prompt},
		},
		MaxTokens:	s.getMaxTokensForLevel(cefrLevel),
		Temperature:	1.5,
		TopP:		0.95,
	}

	resp, err := s.callWithFallback(ctx, dsReq)
	if err == nil {
		if s.redis != nil {
			s.redis.Set(ctx, cacheKey, resp, 1*time.Hour)
		}
	}
	return resp, err
}

func (s *AIService) GenerateCohesiveText(ctx context.Context, req dto.GenerateCohesiveTextRequest) (string, error) {
	resolvedLanguage := req.Language
	if val, ok := s.languageCache[req.Language]; ok {
		resolvedLanguage = val
	}

	var wordsToIdentify []string
	if len(req.Items) > 0 {
		for _, item := range req.Items {
			wordsToIdentify = append(wordsToIdentify, item.Word)
		}
	} else if len(req.Words) > 0 {
		wordsToIdentify = req.Words
	}

	cacheKey := fmt.Sprintf("ai:cohesive:%s:%s:%v", strings.Join(wordsToIdentify, ","), req.Language, req.MixedMode)
	if s.redis != nil {
		if val, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
			s.logger.Info("AI Cache Hit", zap.String("key", cacheKey))
			return val, nil
		}
	}

	var sb strings.Builder

	if req.MixedMode {
		if req.BaseText != "" {

			sb.WriteString(fmt.Sprintf("You are an expert translator and language teacher. Your task is to ADAPT the provided English story into %s (Code-Switching Mode).\n\n", resolvedLanguage))

			sb.WriteString("SOURCE STORY:\n")
			sb.WriteString(req.BaseText + "\n\n")

			sb.WriteString("NON-NEGOTIABLE VOCABULARY ANCHORS (MUST APPEAR IN OUTPUT):\n")
			if len(req.Items) > 0 {
				for i, item := range req.Items {
					fmt.Fprintf(&sb, "%d. \"%s\"\n", i+1, item.Word)
				}
			}

			sb.WriteString("\nTRANSFORMATION RULES:\n")
			sb.WriteString(fmt.Sprintf("1. TRANSLATE the narrative into %s.\n", resolvedLanguage))
			sb.WriteString("2. CRITICAL: YOU MUST USE EVERY SINGLE WORD FROM THE LIST ABOVE. COUNT THEM.\n")
			sb.WriteString("3. STRUCTURE: Keep the exact same plot, character actions, and sequence as the Source Story.\n")
			sb.WriteString("4. INTEGRATION (PREVENTING DOUBLE WORDING & TRANSLATION):\n")
			sb.WriteString("   - When you reach an ANCHOR WORD in the source, STOP.\n")
			sb.WriteString(fmt.Sprintf("   - DO NOT translate it into %s. DO NOT put the %s equivalent next to it.\n", resolvedLanguage, resolvedLanguage))
			sb.WriteString("   - INSERT THE ENGLISH WORD DIRECTLY.\n")
			sb.WriteString("   - WRONG: \"Це була чудова marvellous вечірка\" (Double Wording)\n")
			sb.WriteString("   - WRONG: \"Ми хотіли врятувати (rescue) її\" (Parenthesis)\n")
			sb.WriteString("   - WRONG: \"Ми хотіли врятувати її\" (Translation Leakage)\n")
			sb.WriteString("   - CORRECT: \"Це була marvellous вечірка\"\n")
			sb.WriteString("   - CORRECT: \"Ми хотіли rescue її\"\n")
			sb.WriteString("5. GRAMMAR: You may use native endings only if it is common slang (e.g. 'пофіксити'). Otherwise, keep the English word intact.\n")
			fmt.Fprintf(&sb, "6. VERIFICATION: Before finishing, scan your text. Did you include ALL %d anchor words? If any are missing, rewrite the sentence to include them.\n", len(req.Items))
			sb.WriteString("7. OUTPUT: ONLY the adapted story text.\n")
		} else {

			sb.WriteString(fmt.Sprintf("You are an expert language teacher. Your task is to write a natural, engaging story in %s that incorporates specific English words as vocabulary learning targets.\n\n", resolvedLanguage))

			sb.WriteString("══════════════════════════════════════════════════════════════════\n")
			sb.WriteString("MANDATORY ENGLISH WORDS WITH REQUIRED MEANINGS:\n")
			sb.WriteString("══════════════════════════════════════════════════════════════════\n")
			if len(req.Items) > 0 {
				for i, item := range req.Items {
					fmt.Fprintf(&sb, "%d. \"%s\" → MUST MEAN: \"%s\"", i+1, item.Word, item.Meaning)
					if item.Context != "" {
						fmt.Fprintf(&sb, " (example: \"%s\")", item.Context)
					}
					sb.WriteString("\n")
				}
				fmt.Fprintf(&sb, "\nTOTAL: %d words. ALL %d MUST appear in the story!\n", len(req.Items), len(req.Items))
			} else {
				sb.WriteString(strings.Join(req.Words, ", ") + "\n")
			}
			sb.WriteString("══════════════════════════════════════════════════════════════════\n")

			sb.WriteString("\n🚨 CRITICAL MEANING CONSTRAINT (THIS IS THE MOST IMPORTANT RULE):\n")
			sb.WriteString("Each word MUST be used in the EXACT meaning specified above.\n")
			sb.WriteString("Many words have multiple meanings. You MUST use the meaning from the list, NOT another meaning.\n\n")
			sb.WriteString("EXAMPLES OF VIOLATIONS:\n")
			sb.WriteString("  ❌ WRONG: \"course\" as \"course of events\" when meaning is \"field/track\" (спортивная площадка)\n")
			sb.WriteString("  ❌ WRONG: \"lit\" as \"literature\" when meaning is \"cool/awesome\" (крутой)\n")
			sb.WriteString("  ❌ WRONG: \"mangle\" as \"press clothes\" when meaning is \"mutilate\" (изуродовать)\n")
			sb.WriteString("  ❌ WRONG: \"track meet\" as \"meeting on a path\" when meaning is \"athletics competition\" (соревнования по легкой атлетике)\n\n")
			sb.WriteString("CORRECT APPROACH:\n")
			sb.WriteString("  ✓ If \"course\" means \"поле\" → use it as \"golf course\", \"obstacle course\", \"race course\"\n")
			sb.WriteString("  ✓ If \"lit\" means \"крутой/зажечь\" → use it as slang \"the party was lit\"\n")
			sb.WriteString("  ✓ If \"mangle\" means \"изуродовать\" → use it as \"the machine mangled his hand\"\n\n")

			sb.WriteString("CORE WRITING PRINCIPLES:\n\n")
			sb.WriteString("1. STORY-FIRST APPROACH:\n")
			sb.WriteString("   - Create a compelling narrative with clear beginning, middle, and end\n")
			sb.WriteString("   - Let the story drive the word usage, not the other way around\n")
			sb.WriteString("   - Choose ONE cohesive theme/setting that can naturally accommodate most words\n")
			sb.WriteString("   - Build logical cause-and-effect connections between events\n\n")

			sb.WriteString("2. MIXED-LANGUAGE INTEGRATION (PRESERVE LATIN SCRIPT):\n")
			sb.WriteString(fmt.Sprintf("   - Write primarily in %s\n", resolvedLanguage))
			sb.WriteString("   - METHOD: \"Direct Substitution\". Replace the word with the English one.\n")
			sb.WriteString("   - CRITICAL: KEEP THE ENGLISH WORDS IN LATIN SCRIPT (Original Spelling).\n")
			sb.WriteString("   - FORBIDDEN: Do NOT transliterate English words into Cyrillic or other scripts.\n")
			sb.WriteString("   - WRONG: \"він був алармед\", \"прі оф\", \"skeдадл\"\n")
			sb.WriteString("   - CORRECT: \"він був alarmed\", \"pry off\", \"skedaddle\"\n")
			sb.WriteString("   - Integrate the English word grammatically without changing its spelling.\n\n")

			sb.WriteString("3. CONTEXTUAL CLUSTERING:\n")
			sb.WriteString("   - Group related words in the same scene (don't jump randomly between topics)\n")
			sb.WriteString("   - Use transitional sentences to bridge between word clusters\n")
			sb.WriteString("   - If words seem unrelated, use creative narrative devices (flashbacks, dreams, parallel storylines)\n\n")

			sb.WriteString("4. OPTIMAL LENGTH & PACING:\n")
			sb.WriteString("   - Target: 200-300 words (enough to integrate all words naturally).\n")
			sb.WriteString("   - Use 10-15 words of narrative for every 1 mandatory word.\n\n")

			sb.WriteString("5. GENRE FLEXIBILITY:\n")
			sb.WriteString("   - If words are random, use creative frames: dreams, fantasy, sci-fi, absurdist comedy.\n")
			sb.WriteString("   - Better to have a CRAZY but COHERENT story than a \"realistic\" but FORCED one.\n\n")

			sb.WriteString("✅ FINAL VERIFICATION (DO THIS BEFORE OUTPUT):\n")
			sb.WriteString("1. Count: Did you use ALL mandatory words? If any missing, REWRITE.\n")
			sb.WriteString("2. Meanings: Is each word used in the CORRECT meaning from the list? If not, FIX IT.\n")
			sb.WriteString("3. Script: Are all English words in Latin script? No Cyrillic transliterations?\n\n")

			sb.WriteString("OUTPUT: Only the story text (no meta-commentary, no explanations).")
		}

	} else {

		sb.WriteString(fmt.Sprintf("You are an expert language teacher. Write a short, coherent and natural paragraph in %s.\n\n", resolvedLanguage))

		if len(req.Items) > 0 {
			sb.WriteString("══════════════════════════════════════════════════════════════════\n")
			sb.WriteString("MANDATORY WORDS AND THEIR EXACT REQUIRED MEANINGS:\n")
			sb.WriteString("══════════════════════════════════════════════════════════════════\n")
			for i, item := range req.Items {
				fmt.Fprintf(&sb, "%d. \"%s\" → MUST MEAN: \"%s\"", i+1, item.Word, item.Meaning)
				if item.Context != "" {
					fmt.Fprintf(&sb, " (example usage: \"%s\")", item.Context)
				}
				sb.WriteString("\n")
			}
			fmt.Fprintf(&sb, "\nTOTAL WORDS TO USE: %d (You MUST use ALL %d words!)\n", len(req.Items), len(req.Items))
			sb.WriteString("══════════════════════════════════════════════════════════════════\n")
		} else {
			fmt.Fprintf(&sb, "MANDATORY WORDS:\n%s\n", strings.Join(req.Words, ", "))
		}

		sb.WriteString("\n🚨 ABSOLUTE REQUIREMENTS (VIOLATION = FAILURE):\n")
		sb.WriteString("1. Use 100% OF THE MANDATORY WORDS. Zero exceptions. If there are 20 words, all 20 MUST appear.\n")
		sb.WriteString("2. Each word MUST be used in the EXACT MEANING specified above (not a different meaning of the same word).\n")
		sb.WriteString("   - WRONG: Using \"course\" as \"course of events\" when the meaning is \"field/track\"\n")
		sb.WriteString("   - WRONG: Using \"track\" as \"music track\" when the meaning is \"path/trail\"\n")
		sb.WriteString("   - RIGHT: Use the word in the SPECIFIC context/meaning provided\n")
		sb.WriteString("3. Story length: 120-180 words (enough to naturally integrate all words).\n")
		sb.WriteString("4. The non-target vocabulary should be simple (A2-B1 level).\n")
		sb.WriteString("5. Create ONE COHESIVE STORY with a logical flow, not disjointed sentences.\n")
		sb.WriteString("6. Integrate words NATURALLY. If words seem unrelated, use creative narrative approaches (dreams, flashbacks, multiple scenes).\n")
		sb.WriteString("7. Do NOT explain what you're doing. Output ONLY the story text.\n")

		sb.WriteString("\n✅ BEFORE SUBMITTING - MANDATORY SELF-CHECK:\n")
		sb.WriteString("Count each mandatory word in your story. If ANY word is missing, REWRITE to include it.\n")
		sb.WriteString("Verify each word is used in the CORRECT meaning as specified above.\n")

		sb.WriteString("\nReturn ONLY the text of the story.")
	}

	dsReq := dto.DeepSeekRequest{
		Model:	"llama-3.3-70b-versatile",
		Messages: []dto.DeepSeekMessage{
			{Role: "user", Content: sb.String()},
		},
		MaxTokens:	1500,
		Temperature:	0.7,
	}

	resp, err := s.callWithFallback(ctx, dsReq)
	if err == nil {
		if s.redis != nil {
			s.redis.Set(ctx, cacheKey, resp, 24*time.Hour)
		}
	}
	return resp, err
}

func (s *AIService) GenerateQuestions(ctx context.Context, req dto.GenerateCohesiveTextRequest) (string, error) {
	resolvedLanguage := req.Language
	if val, ok := s.languageCache[req.Language]; ok {
		resolvedLanguage = val
	}

	var wordsToIdentify []string
	if len(req.Items) > 0 {
		for _, item := range req.Items {
			wordsToIdentify = append(wordsToIdentify, item.Word)
		}
	} else if len(req.Words) > 0 {
		wordsToIdentify = req.Words
	}

	cacheKey := fmt.Sprintf("ai:questions:%s:%s", strings.Join(wordsToIdentify, ","), req.Language)
	if s.redis != nil {
		if val, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
			s.logger.Info("AI Cache Hit", zap.String("key", cacheKey))
			return val, nil
		}
	}

	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("You are an expert language teacher. Your task is to generate 20 conversational questions in %s that help a student practice specific English vocabulary.\n\n", resolvedLanguage))

	sb.WriteString("MANDATORY WORDS AND THEIR EXACT REQUIRED MEANINGS:\n")
	sb.WriteString("══════════════════════════════════════════════════════════════════\n")
	if len(req.Items) > 0 {
		for i, item := range req.Items {
			fmt.Fprintf(&sb, "%d. \"%s\" → MUST MEAN: \"%s\"", i+1, item.Word, item.Meaning)
			if item.Context != "" {
				fmt.Fprintf(&sb, " (context: \"%s\")", item.Context)
			}
			sb.WriteString("\n")
		}
	} else {
		sb.WriteString(strings.Join(req.Words, ", ") + "\n")
	}
	sb.WriteString("══════════════════════════════════════════════════════════════════\n\n")

	sb.WriteString("TASK RULES:\n")
	sb.WriteString("1. Generate EXACTLY 20 questions.\n")
	sb.WriteString(fmt.Sprintf("2. Write the questions in %s.\n", resolvedLanguage))
	sb.WriteString("3. Use the English words provided above DIRECTLY in the questions (do not translate them).\n")
	sb.WriteString("4. Each question MUST focus on ONE of the target words. If you have fewer than 20 words, repeat some words in different question contexts to reach 20 questions.\n")
	sb.WriteString("5. Ensure each word is used in the EXACT meaning specified.\n")
	sb.WriteString("6. Questions should be natural, engaging, and suitable for a conversation or self-reflection.\n")
	sb.WriteString("7. FORMAT: Return a plain list of questions, one per line. No numbering, no extra text.\n")
	sb.WriteString("8. DO NOT use the word in the question if it's too obvious, try to make it a natural conversation.\n")
	sb.WriteString("   Example: if the word is 'spare time', a good question is 'What do you do in your spare time?'\n\n")

	sb.WriteString("OUTPUT: Only the 20 questions, one per line.")

	dsReq := dto.DeepSeekRequest{
		Model:	"llama-3.3-70b-versatile",
		Messages: []dto.DeepSeekMessage{
			{Role: "user", Content: sb.String()},
		},
		MaxTokens:	1000,
		Temperature:	0.7,
	}

	resp, err := s.callWithFallback(ctx, dsReq)
	if err == nil {
		if s.redis != nil {
			s.redis.Set(ctx, cacheKey, resp, 24*time.Hour)
		}
	}
	return resp, err
}

func (s *AIService) callWithFallback(ctx context.Context, dsReq dto.DeepSeekRequest) (string, error) {
	var errs []string

	// 1. Try DeepSeek (Primary: deepseek-chat)
	if s.deepseekKey != "" {
		dsReqCopy := dsReq
		dsReqCopy.Model = "deepseek-chat"
		resp, err := s.callDeepSeek(ctx, dsReqCopy)
		if err == nil && strings.TrimSpace(resp) != "" {
			return resp, nil
		}
		if err != nil {
			s.logger.Warn("DeepSeek call failed in callWithFallback, trying Groq fallback", zap.Error(err))
			errs = append(errs, fmt.Sprintf("DeepSeek: %v", err))
		}
	} else {
		errs = append(errs, "DeepSeek: not configured")
	}

	// 2. Try Groq (Fast Fallback: Llama-3.3-70B / 8B)
	if s.groqKey != "" {
		groqReq := dsReq
		if groqReq.Model == "" || groqReq.Model == "deepseek-chat" {
			groqReq.Model = "llama-3.3-70b-versatile"
		}
		resp, err := s.callGroq(ctx, groqReq)
		if err == nil && strings.TrimSpace(resp) != "" {
			return resp, nil
		}
		if err != nil {
			s.logger.Warn("Groq call failed in callWithFallback, trying Gemini fallback", zap.Error(err))
			errs = append(errs, fmt.Sprintf("Groq: %v", err))
		}
	} else {
		errs = append(errs, "Groq: not configured")
	}

	// 3. Try Gemini (Native Google Gemini 1.5/2.0 Flash)
	if s.geminiKey != "" {
		geminiReq := dsReq
		geminiReq.Model = "gemini-1.5-flash"
		resp, err := s.callGemini(ctx, geminiReq)
		if err == nil && strings.TrimSpace(resp) != "" {
			return resp, nil
		}
		if err != nil {
			s.logger.Warn("Gemini call failed in callWithFallback", zap.Error(err))
			errs = append(errs, fmt.Sprintf("Gemini: %v", err))
		}
	} else {
		errs = append(errs, "Gemini: not configured")
	}

	return "", fmt.Errorf("all AI providers failed: %s", strings.Join(errs, " | "))
}

func (s *AIService) GenerateSessionSummary(ctx context.Context, req dto.SessionSummaryRequest) (*dto.SessionSummaryResponse, error) {
	resolvedLearning := req.LearningLanguage
	if val, ok := s.languageCache[req.LearningLanguage]; ok {
		resolvedLearning = val
	}
	resolvedFluent := req.FluentLanguage
	if val, ok := s.languageCache[req.FluentLanguage]; ok {
		resolvedFluent = val
	}

	model := "deepseek-chat"

	items := req.Items
	if len(items) > 15 {
		s.logger.Info("Truncating session summary items for story generation to maintain quality",
			zap.Int("original_count", len(items)),
			zap.Int("limit", 15))
		items = items[:15]
	}

	// FAANG Analytical Optimization: Dynamic Word Budget based on vocabulary load
	itemCount := len(items)
	minWords := 140 + itemCount*10
	if minWords < 160 {
		minWords = 160
	}
	maxWords := minWords + 60

	// -------------------------------------------------------------
	// Stage 1: Narrative Story Generation (Target Language)
	// -------------------------------------------------------------
	var storyPrompt strings.Builder
	fmt.Fprintf(&storyPrompt, "TASK: Write a gripping, cohesive short story of %d–%d words entirely in %s.\n\n", minWords, maxWords, resolvedLearning)

	storyPrompt.WriteString("TARGET VOCABULARY TO WEAVE IN (plot-critical):\n")
	for _, item := range items {
		if item.Context != "" {
			fmt.Fprintf(&storyPrompt, "- \"%s\" (meaning: %s; context clue: %s)\n", item.Word, item.Meaning, item.Context)
		} else {
			fmt.Fprintf(&storyPrompt, "- \"%s\" (meaning: %s)\n", item.Word, item.Meaning)
		}
	}

	storyPrompt.WriteString("\nNARRATIVE ARCHITECTURE (mandatory):\n")
	storyPrompt.WriteString("1. Hook & Premise: Establish a clear conflict, dilemma, mystery, or high-stakes misunderstanding immediately.\n")
	storyPrompt.WriteString("2. Dynamic Escalation: Tension rises naturally with at least TWO distinct emotional shifts (e.g. curiosity → tension → relief, or skepticism → surprise → warmth).\n")
	storyPrompt.WriteString("3. Climax & Resolution: Deliver a sharp twist, ironic outcome, or emotional payoff at the end.\n\n")

	storyPrompt.WriteString("INTEGRATION & STYLE RULES:\n")
	storyPrompt.WriteString("- Every target word must drive the action, pivotal dialogue, or character decisions — never insert words as decorative commentary.\n")
	storyPrompt.WriteString("- Keep non-target vocabulary accessible (CEFR A2–B1) so target words stand out with crystal clarity.\n")
	storyPrompt.WriteString("- Include authentic, lively dialogue.\n")
	storyPrompt.WriteString("- SELF-CHECK: If any target vocabulary word can be removed without breaking the plot logic, rewrite that passage.\n")
	storyPrompt.WriteString("- Return ONLY the raw story text. Do NOT include titles, markdown formatting, preamble, or explanations.")

	dsReq := dto.DeepSeekRequest{
		Model: model,
		Messages: []dto.DeepSeekMessage{
			{Role: "system", Content: "You are a master fiction author and language pedagogy specialist. You write captivating, emotionally engaging micro-stories designed for vocabulary acquisition. Your prose is immersive, authentic, and naturally weaves target words into character choices, pivotal moments, and dialogue."},
			{Role: "user", Content: storyPrompt.String()},
		},
		MaxTokens:   1000,
		Temperature: 0.7,
	}

	originalStory, err := s.callWithFallback(ctx, dsReq)
	if err != nil {
		s.logger.Warn("Primary story generation failed, attempting light fallback prompt", zap.Error(err))
		// Try lighter fallback prompt with llama-3.1-8b-instant
		fallbackReq := dsReq
		fallbackReq.Model = "llama-3.1-8b-instant"
		fallbackReq.MaxTokens = 800
		originalStory, err = s.callWithFallback(ctx, fallbackReq)
	}

	if err != nil || strings.TrimSpace(originalStory) == "" {
		s.logger.Warn("All AI providers failed for story, generating structured pedagogical story fallback", zap.Error(err))
		var fallbackStory strings.Builder
		fallbackStory.WriteString("Today's review session brought together key vocabulary in context:\n\n")
		for _, item := range items {
			if item.Context != "" {
				fmt.Fprintf(&fallbackStory, "• In our story context: %s. Here, \"%s\" represents %s.\n", item.Context, item.Word, item.Meaning)
			} else {
				fmt.Fprintf(&fallbackStory, "• Understanding \"%s\" (%s) helps elevate your natural conversational fluency.\n", item.Word, item.Meaning)
			}
		}
		fallbackStory.WriteString("\nPractice using each word in your daily conversations to reinforce active memory retention.")
		originalStory = fallbackStory.String()
	}

	// -------------------------------------------------------------
	// Stage 2: Parallel Code-Switching Adaptation & Question Generation
	// -------------------------------------------------------------
	var (
		fluentStory string
		questions   []string
		wg          sync.WaitGroup
	)

	wg.Add(2)

	// Stage 2A: Fluent Code-Switching Adaptation
	go func() {
		defer wg.Done()
		var adaptPrompt strings.Builder
		fmt.Fprintf(&adaptPrompt, "ADAPT THIS STORY INTO %s (pedagogical code-switching):\n\"%s\"\n\n", resolvedFluent, originalStory)
		adaptPrompt.WriteString("CRITICAL RULES:\n")
		fmt.Fprintf(&adaptPrompt, "1. Translate the surrounding narrative into natural, fluent %s while preserving all emotional tension, dialogue tone, and the final twist.\n", resolvedFluent)
		adaptPrompt.WriteString("2. Keep these EXACT target words in their original form (Code-Switching):\n")
		for _, item := range items {
			fmt.Fprintf(&adaptPrompt, "   - %s\n", item.Word)
		}
		fmt.Fprintf(&adaptPrompt, "3. Adapt surrounding %s grammar so the English target words sit naturally in sentence flow without clumsy native case inflections.\n", resolvedFluent)
		adaptPrompt.WriteString("4. Strictly DO NOT put translations in parentheses and DO NOT double words (e.g. avoid 'шансы slim chances' or 'regret (сожаление)').\n")
		adaptPrompt.WriteString("5. Preserve the exact paragraph structure of the original.\n")
		adaptPrompt.WriteString("6. Return ONLY the adapted story text. No titles, greetings, or explanations.")

		reqA := dto.DeepSeekRequest{
			Model: model,
			Messages: []dto.DeepSeekMessage{
				{Role: "system", Content: "You are an expert literary translator and bilingual cognitive linguist specializing in pedagogical code-switching (comprehensible input)."},
				{Role: "user", Content: adaptPrompt.String()},
			},
			MaxTokens:   1000,
			Temperature: 0.3,
		}

		storyA, errA := s.callWithFallback(ctx, reqA)
		if errA != nil || strings.TrimSpace(storyA) == "" {
			s.logger.Warn("Fluent story generation failed, falling back to original story", zap.Error(errA))
			fluentStory = originalStory
		} else {
			fluentStory = storyA
		}
	}()

	// Stage 2B: Discussion Questions Generation
	go func() {
		defer wg.Done()
		numQuestions := 8
		if len(items) >= 10 {
			numQuestions = 10
		} else if len(items) <= 4 {
			numQuestions = 6
		}

		var quePrompt strings.Builder
		fmt.Fprintf(&quePrompt, "BASED ON THIS STORY:\n\"%s\"\n\n", originalStory)
		fmt.Fprintf(&quePrompt, "TASK: Generate exactly %d engaging, open-ended conversational questions in %s.\n\n", numQuestions, resolvedLearning)
		quePrompt.WriteString("QUESTION TYPES (balanced mix):\n")
		quePrompt.WriteString("- Character Psychology & Motives: 'Why did [Character] decide to...?'\n")
		quePrompt.WriteString("- Empathy & Ethics: 'What would you have done if you were in [Character]'s situation?'\n")
		quePrompt.WriteString("- Hypotheticals & Predictions: 'What do you think happened next?' / 'How would the situation change if...?'\n")
		quePrompt.WriteString("- Active Vocabulary Reinforcement: Questions that naturally prompt the learner to use these target words:\n")
		for _, item := range items {
			fmt.Fprintf(&quePrompt, "  - %s\n", item.Word)
		}
		quePrompt.WriteString("\nRULES:\n")
		quePrompt.WriteString("- Root every question in the story's conflict, emotions, and decisions (do NOT ask for definitions or trivia).\n")
		quePrompt.WriteString("- Each question should stimulate critical thinking and active speaking.\n")
		quePrompt.WriteString("- RETURN ONLY a JSON array of strings: [\"Question 1?\", \"Question 2?\", ...]\n")
		quePrompt.WriteString("- Strictly no markdown wrapping, no code fences, no extra text.")

		reqB := dto.DeepSeekRequest{
			Model: model,
			Messages: []dto.DeepSeekMessage{
				{Role: "system", Content: "You are a master conversational language coach. Return only a valid JSON array of question strings."},
				{Role: "user", Content: quePrompt.String()},
			},
			MaxTokens:   1000,
			Temperature: 0.6,
		}

		queResp, errB := s.callWithFallback(ctx, reqB)
		if errB != nil {
			s.logger.Warn("Question generation failed, preparing fallback questions", zap.Error(errB))
		} else {
			questions = parseQuestionsResponse(queResp)
		}

		if len(questions) == 0 {
			s.logger.Warn("No questions parsed from LLM, generating fallback questions")
			for _, item := range items {
				questions = append(questions, fmt.Sprintf("How would you use \"%s\" in a real-life conversation?", item.Word))
				if len(questions) >= numQuestions {
					break
				}
			}
			if len(questions) == 0 {
				questions = []string{
					"How can you apply the words learned today in your daily conversations?",
					"Which word or phrase was the most memorable for you in this session?",
				}
			}
		}
	}()

	wg.Wait()

	if fluentStory == "" {
		fluentStory = originalStory
	}

	return &dto.SessionSummaryResponse{
		OriginalStory: originalStory,
		FluentStory:   fluentStory,
		Questions:     questions,
	}, nil
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

func (s *AIService) GenerateLeechAid(ctx context.Context, word, context string) (string, error) {
	prompt := fmt.Sprintf(
		"The word \"%s\" is difficult for me to remember in this context: \"%s\".\n"+
			"Please provide a mnemonically helpful explanation and a DIFFERENT, very simple sentence to help me understand and remember it.\n"+
			"Format your response as a JSON object with: \"mnemonic\", \"simpleDefinition\", \"newContext\". English only.",
		word, context)

	dsReq := dto.DeepSeekRequest{
		Model:	"llama-3.3-70b-versatile",
		Messages: []dto.DeepSeekMessage{
			{Role: "user", Content: prompt},
		},
		MaxTokens:	300,
		Temperature:	1.2,
	}

	return s.callWithFallback(ctx, dsReq)
}

func (s *AIService) callDeepSeek(ctx context.Context, dsReq dto.DeepSeekRequest) (string, error) {
	if s.deepseekKey == "" {
		return "", fmt.Errorf("DeepSeek API key is not configured")
	}

	logger := s.getLogger(ctx)

	result, err := s.breaker.Execute(func() (interface{}, error) {
		jsonData, err := json.Marshal(dsReq)
		if err != nil {
			return "", err
		}

		req, err := http.NewRequestWithContext(ctx, "POST", s.deepseekURL+"/chat/completions", bytes.NewBuffer(jsonData))
		if err != nil {
			return "", err
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+s.deepseekKey)

		logger.Debug("Calling DeepSeek API", zap.String("model", dsReq.Model))

		resp, err := s.httpClient.Do(req)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			return "", fmt.Errorf("DeepSeek API returned status %d: %s", resp.StatusCode, string(body))
		}

		var dsResp dto.DeepSeekResponse
		if err := json.NewDecoder(resp.Body).Decode(&dsResp); err != nil {
			return "", err
		}

		if len(dsResp.Choices) > 0 {
			return dsResp.Choices[0].Message.Content, nil
		}

		return "", fmt.Errorf("DeepSeek returned an empty response")
	})

	if err != nil {
		logger.Error("DeepSeek API Call Failed", zap.Error(err))
		return "", err
	}

	return result.(string), nil
}

func (s *AIService) callGroq(ctx context.Context, dsReq dto.DeepSeekRequest) (string, error) {
	if s.groqKey == "" {
		return "", fmt.Errorf("Groq API key is not configured")
	}

	logger := s.getLogger(ctx)

	result, err := s.groqBreaker.Execute(func() (interface{}, error) {
		jsonData, err := json.Marshal(dsReq)
		if err != nil {
			return "", err
		}

		req, err := http.NewRequestWithContext(ctx, "POST", s.groqURL+"/chat/completions", bytes.NewBuffer(jsonData))
		if err != nil {
			return "", err
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", "Bearer "+s.groqKey)

		logger.Debug("Calling Groq API", zap.String("model", dsReq.Model))

		resp, err := s.httpClient.Do(req)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			body, _ := io.ReadAll(resp.Body)
			// Auto-fallback from 70B to 8B on 429 Rate Limit
			if resp.StatusCode == http.StatusTooManyRequests && dsReq.Model != "llama-3.1-8b-instant" {
				logger.Warn("Groq 70B rate limited (429), attempting fast fallback to llama-3.1-8b-instant")
				fallbackReq := dsReq
				fallbackReq.Model = "llama-3.1-8b-instant"
				fallbackJson, errFb := json.Marshal(fallbackReq)
				if errFb == nil {
					reqFb, errFbReq := http.NewRequestWithContext(ctx, "POST", s.groqURL+"/chat/completions", bytes.NewBuffer(fallbackJson))
					if errFbReq == nil {
						reqFb.Header.Set("Content-Type", "application/json")
						reqFb.Header.Set("Authorization", "Bearer "+s.groqKey)
						respFb, errDo := s.httpClient.Do(reqFb)
						if errDo == nil {
							defer respFb.Body.Close()
							if respFb.StatusCode == http.StatusOK {
								var fbResp dto.DeepSeekResponse
								if errDecode := json.NewDecoder(respFb.Body).Decode(&fbResp); errDecode == nil && len(fbResp.Choices) > 0 {
									return fbResp.Choices[0].Message.Content, nil
								}
							}
						}
					}
				}
			}
			return "", fmt.Errorf("Groq API returned status %d: %s", resp.StatusCode, string(body))
		}

		var dsResp dto.DeepSeekResponse
		if err := json.NewDecoder(resp.Body).Decode(&dsResp); err != nil {
			return "", err
		}

		if len(dsResp.Choices) > 0 {
			return dsResp.Choices[0].Message.Content, nil
		}

		return "", fmt.Errorf("Groq returned an empty response")
	})

	if err != nil {
		logger.Error("Groq API Call Failed", zap.Error(err))
		return "", err
	}

	return result.(string), nil
}

func (s *AIService) callGemini(ctx context.Context, dsReq dto.DeepSeekRequest) (string, error) {
	if s.geminiKey == "" {
		return "", fmt.Errorf("Gemini API key is not configured")
	}

	logger := s.getLogger(ctx)

	result, err := s.geminiBreaker.Execute(func() (interface{}, error) {
		var systemPrompt string
		var userPrompt string
		for _, msg := range dsReq.Messages {
			if msg.Role == "system" {
				systemPrompt = msg.Content
			} else if msg.Role == "user" {
				userPrompt = msg.Content
			}
		}

		generationConfig := map[string]interface{}{
			"temperature":     dsReq.Temperature,
			"maxOutputTokens": dsReq.MaxTokens,
		}

		combinedText := strings.ToLower(userPrompt + " " + systemPrompt)
		if strings.Contains(combinedText, "json") || strings.Contains(combinedText, "output schema") {
			generationConfig["responseMimeType"] = "application/json"
		}

		payload := map[string]interface{}{
			"contents": []map[string]interface{}{
				{
					"parts": []map[string]interface{}{
						{
							"text": userPrompt,
						},
					},
				},
			},
			"generationConfig": generationConfig,
		}

		if systemPrompt != "" {
			payload["system_instruction"] = map[string]interface{}{
				"parts": []map[string]interface{}{
					{
						"text": systemPrompt,
					},
				},
			}
		}

		jsonData, err := json.Marshal(payload)
		if err != nil {
			return "", err
		}

		url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"

		req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			return "", err
		}

		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("x-goog-api-key", s.geminiKey)

		logger.Debug("Calling Native Gemini API", zap.String("model", "gemini-1.5-flash"))

		resp, err := s.httpClient.Do(req)
		if err != nil {
			return "", err
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return "", err
		}

		if resp.StatusCode != http.StatusOK {
			// Fallback to gemini-2.0-flash
			url2 := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
			req2, err2 := http.NewRequestWithContext(ctx, "POST", url2, bytes.NewBuffer(jsonData))
			if err2 == nil {
				req2.Header.Set("Content-Type", "application/json")
				req2.Header.Set("x-goog-api-key", s.geminiKey)
				resp2, errDo2 := s.httpClient.Do(req2)
				if errDo2 == nil {
					defer resp2.Body.Close()
					if resp2.StatusCode == http.StatusOK {
						body2, _ := io.ReadAll(resp2.Body)
						var geminiResp2 struct {
							Candidates []struct {
								Content struct {
									Parts []struct {
										Text string `json:"text"`
									} `json:"parts"`
								} `json:"content"`
							} `json:"candidates"`
						}
						if errUnmarshal2 := json.Unmarshal(body2, &geminiResp2); errUnmarshal2 == nil && len(geminiResp2.Candidates) > 0 && len(geminiResp2.Candidates[0].Content.Parts) > 0 {
							return geminiResp2.Candidates[0].Content.Parts[0].Text, nil
						}
					}
				}
			}
			return "", fmt.Errorf("Gemini API returned status %d: %s", resp.StatusCode, string(body))
		}

		var geminiResp struct {
			Candidates []struct {
				Content struct {
					Parts []struct {
						Text string `json:"text"`
					} `json:"parts"`
				} `json:"content"`
			} `json:"candidates"`
		}

		if err := json.Unmarshal(body, &geminiResp); err != nil {
			return "", err
		}

		if len(geminiResp.Candidates) > 0 && len(geminiResp.Candidates[0].Content.Parts) > 0 {
			return geminiResp.Candidates[0].Content.Parts[0].Text, nil
		}

		return "", fmt.Errorf("Gemini returned an empty or malformed candidate response")
	})

	if err != nil {
		logger.Error("Gemini API Call Failed", zap.Error(err))
		return "", err
	}

	return result.(string), nil
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
	wordCount := len(strings.Split(strings.TrimSpace(text), " "))

	if wordCount <= 3 {
		return 400
	}
	if wordCount <= 10 {
		return 500
	}
	return 600
}

// GenerateEmbedding is a no-op placeholder since embedding-service was decommissioned.
func (s *AIService) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	return nil, nil
}

