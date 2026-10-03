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

	json "github.com/goccy/go-json" // FAANG Optimization
	"github.com/redis/go-redis/v9"

	"github.com/sony/gobreaker"
	"github.com/substreamedu/wordstream-dictionary-service/internal/dto"
	"github.com/substreamedu/wordstream-dictionary-service/internal/resilience"
	"go.uber.org/zap"
)

type AIService struct {
	deepseekKey   string
	groqKey       string
	geminiKey     string
	deepseekURL   string
	groqURL       string
	geminiURL     string
	httpClient    *http.Client
	languageCache map[string]string
	redis         *redis.Client
	logger        *zap.Logger
	breaker       *gobreaker.CircuitBreaker
	groqBreaker   *gobreaker.CircuitBreaker
	geminiBreaker *gobreaker.CircuitBreaker
}

// NewRedisClient removed (moved to redis_service.go)

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
		deepseekKey:   deepseekKey,
		groqKey:       groqKey,
		geminiKey:     geminiKey,
		deepseekURL:   "https://api.deepseek.com",
		groqURL:       "https://api.groq.com/openai/v1",
		geminiURL:     "https://generativelanguage.googleapis.com/v1beta/openai",
		httpClient:    &http.Client{Timeout: 60 * time.Second},
		languageCache: cache,
		redis:         rdb,
		logger:        logger,
		breaker:       resilience.NewCircuitBreaker("deepseek-api", logger),
		groqBreaker:   resilience.NewCircuitBreaker("groq-api", logger),
		geminiBreaker: resilience.NewCircuitBreaker("gemini-api", logger),
	}
}

func (s *AIService) getLogger(ctx context.Context) *zap.Logger {
	if l, ok := ctx.Value("logger").(*zap.Logger); ok {
		return l
	}
	return s.logger
}
func (s *AIService) TranslateWithContext(ctx context.Context, req dto.DictionaryRequest) (string, string, error) {
	resolvedTarget := req.FluentLanguage
	if val, ok := s.languageCache[req.FluentLanguage]; ok {
		resolvedTarget = val
	}
	resolvedSource := req.LearningLanguage
	if val, ok := s.languageCache[req.LearningLanguage]; ok {
		resolvedSource = val
	}

	// FAANG Optimization: Cache Check (v2.1 - Fix phrase lemmatization bugs)
	cacheKey := fmt.Sprintf("ai:translation:v2.1:%s:%s:%s", req.HighlightedText, req.FluentLanguage, req.Context)
	if val, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
		s.logger.Info("AI Cache Hit", zap.String("key", cacheKey))
		provider, _ := s.redis.Get(ctx, cacheKey+":provider").Result()
		if provider == "" {
			provider = "cached"
		}
		return val, provider, nil
	}

	isPartial := false
	wordCount := len(strings.Split(strings.TrimSpace(req.HighlightedText), " "))

	if req.Context != "" && req.HighlightedText != "" && wordCount == 1 {
		// Clean the context for tokenization
		cleanCtx := strings.ToLower(req.Context)
		target := strings.ToLower(req.HighlightedText)
		
		// FAANG Architecture Check: Is this a full word match in context?
		// We check if it exists as a standalone token. If not, it's a partial selection.
		tokens := strings.FieldsFunc(cleanCtx, func(r rune) bool {
			return !((r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r > 127 || r == '\'' || r == '-') // Keep alphanumeric, non-ascii, apostrophes and hyphens
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

	prompt := s.createTranslationPrompt(
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
			{Role: "user", Content: prompt},
		},
		MaxTokens:   s.calculateOptimalMaxTokens(req.HighlightedText),
		Temperature: 0.1, // Lower temperature for more consistent, clinical translation
		TopP:        0.95,
	}

	var resp string
	var err error
	var errs []string
	var activeProvider string

	// Try DeepSeek first if configured
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

	// Fallback to Gemini if DeepSeek fails or is not configured
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

	// Fallback to Groq if Gemini fails or is not configured
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
		// Cache for 24 hours
		s.redis.Set(ctx, cacheKey, resp, 24*time.Hour)
		s.redis.Set(ctx, cacheKey+":provider", activeProvider, 24*time.Hour)
	}
	return resp, activeProvider, nil
}

// createTranslationPrompt generates an expert-level prompt for accurate AI translation.
func (s *AIService) createTranslationPrompt(text, sourceLang, targetLang, context, extendedContext string, isPartial bool) string {
	words := strings.Split(strings.TrimSpace(text), " ")
	wordCount := len(words)
	wordOrPhrase := "word"
	if wordCount > 1 {
		wordOrPhrase = "phrase"
	}
	// Sentence mode: 4+ words → simplified translation, no dictionary-style output
	isSentenceMode := wordCount >= 4

	var sb strings.Builder

	sb.WriteString("You are a precise translation API. Return ONLY valid JSON with no markdown, no preamble, no explanation.\n\n")

	if extendedContext != "" {
		sb.WriteString("[BROADER CONTEXT (if available):]\n")
		fmt.Fprintf(&sb, "\"%s\"\n\n", extendedContext)
	}

	if context != "" {
		sb.WriteString("[IMMEDIATE SENTENCE (if available):]\n")
		fmt.Fprintf(&sb, "\"%s\"\n\n", context)
	}

	sb.WriteString("TASK:\n")
	fmt.Fprintf(&sb, "Translate the %s highlighted %s \"%s\" to %s.\n\n", sourceLang, wordOrPhrase, text, targetLang)

	sb.WriteString("CRITICAL RULES:\n")
	if isSentenceMode {
		sb.WriteString("!!! SENTENCE/LONG PHRASE MODE !!!\n")
		sb.WriteString("1. The highlight is a SENTENCE or LONG PHRASE. Translate it naturally and idiomatically as a whole.\n")
		sb.WriteString("2. DO NOT define individual words. Translate the ENTIRE expression cohesively.\n")
		sb.WriteString("3. Preserve tense, mood, and intent of the original.\n")
		sb.WriteString("4. 'definition' should be a SHORT paraphrase of the whole phrase in English (max 5 words).\n")
		sb.WriteString("5. 'hint', 'recommended_selections' MUST be empty (\"\" and []).\n\n")
	} else if isPartial || wordOrPhrase == "word" {
		sb.WriteString("!!! LEMMA PRIORITY: ON !!!\n")
		sb.WriteString("1. The highlight is a SINGLE WORD or ROOT. You MUST return the absolute BASE FORM (infinitive for verbs, nominative singular for nouns/adjectives).\n")
		sb.WriteString("2. CONTEXT IS ONLY FOR MEANING: Use the sentence context to choose the correct semantic meaning, but do NOT let the sentence's grammar (case, tense, number) affect the translation form.\n")
		sb.WriteString("3. LITERALISM: Match characters exactly. If highlight is 'idiot' in 'idiots', translate 'idiot' (singular). If 'want' in 'wanted', translate 'want' (infinitive).\n")
		sb.WriteString("4. TRANSCRIPTION: MUST match 'Text' character-for-character. No extra phonemes from the surrounding word.\n")
	} else {
		sb.WriteString("1. PHRASE MODE: Translate the phrase as a cohesive unit. Match its grammatical role in the context.\n")
		sb.WriteString("2. SEMANTIC ALIGNMENT: Ensure translation and definition are perfectly aligned.\n")
	}

	if !isSentenceMode {
		sb.WriteString("5. If \"" + text + "\" is part of an idiom/phrasal verb/collocation, identify the COMPLETE expression in 'hint'\n")
		sb.WriteString("6. STRICT HINT RULE: 'recommended_selections' MUST be empty [] unless it is a PHRASAL VERB or IDIOM.\n\n")
	}

	sb.WriteString("OUTPUT SCHEMA:\n")
	sb.WriteString("{\n")
	fmt.Fprintf(&sb, "  \"translation\": \"string\",  // %s translation of the ENTIRE highlighted text.\n", targetLang)
	if isSentenceMode {
		sb.WriteString("  \"definition\": \"string\",      // Short English paraphrase of the full phrase (max 5 words).\n")
	} else {
		sb.WriteString("  \"definition\": \"string\",      // Concise English meaning (3-6 words) for the SPECIFIC usage in context.\n")
	}
	fmt.Fprintf(&sb, "  \"transcription\": \"string\",  // IPA of original %s text\n", sourceLang)
	sb.WriteString("  \"partOfSpeech\": \"string\",   // noun|verb|adjective|adverb|preposition|conjunction|pronoun|interjection|phrase\n")
	sb.WriteString("  \"style\": \"string\",          // formal|informal|slang|neutral\n")
	sb.WriteString("  \"hint\": \"string\",           // Max 20 chars. Use full idiom/expression if applicable. Empty if none.\n")
	fmt.Fprintf(&sb, "  \"recommended_selections\": [\"string\"], // 1 contextually relevant larger unit (idiom/phrasal verb). MUST be empty [] for normal single words.\n")
	sb.WriteString("  \"visual_keyword\": \"string\"   // A SINGLE concrete, highly drawable English noun representing the SPECIFIC contextual meaning (e.g., 'woman' for 'little number' (meaning a woman), 'devil' or 'blush' for 'lewd', 'rain' or 'tear' for 'melancholy', 'runner' for 'running'). MUST be a single concrete noun. NO abstract terms. Empty if not drawable.\n")
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

	return sb.String()
}

func (s *AIService) GenerateTextByLevel(ctx context.Context, cefrLevel, language, topic string) (string, error) {
	resolvedLanguage := language
	if val, ok := s.languageCache[language]; ok {
		resolvedLanguage = val
	}

	// FAANG Optimization: Cache Check
	cacheKey := fmt.Sprintf("ai:text:%s:%s:%s", cefrLevel, language, topic)
	if val, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
		s.logger.Info("AI Cache Hit", zap.String("key", cacheKey))
		return val, nil
	}

	prompt := s.createCEFRLevelPrompt(cefrLevel, resolvedLanguage, topic)

	dsReq := dto.DeepSeekRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []dto.DeepSeekMessage{
			{Role: "user", Content: prompt},
		},
		MaxTokens:   s.getMaxTokensForLevel(cefrLevel),
		Temperature: 1.5,
		TopP:        0.95,
	}

	// Try Groq first
	resp, err := s.callGroq(ctx, dsReq)
	if err != nil {
		s.logger.Warn("Groq R1 failed in GenerateTextByLevel, falling back to DeepSeek Chat", zap.Error(err))
		dsReq.Model = "deepseek-chat"
		resp, err = s.callDeepSeek(ctx, dsReq)
	}
	if err == nil {
		// Cache for 1 hour
		s.redis.Set(ctx, cacheKey, resp, 1*time.Hour)
	}
	return resp, err
}

func (s *AIService) GenerateCohesiveText(ctx context.Context, req dto.GenerateCohesiveTextRequest) (string, error) {
	resolvedLanguage := req.Language
	if val, ok := s.languageCache[req.Language]; ok {
		resolvedLanguage = val
	}

	// FAANG Optimization: Cache Check
	var wordsToIdentify []string
	if len(req.Items) > 0 {
		for _, item := range req.Items {
			wordsToIdentify = append(wordsToIdentify, item.Word)
		}
	} else if len(req.Words) > 0 {
		wordsToIdentify = req.Words
	}

	cacheKey := fmt.Sprintf("ai:cohesive:%s:%s:%v", strings.Join(wordsToIdentify, ","), req.Language, req.MixedMode)
	if val, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
		s.logger.Info("AI Cache Hit", zap.String("key", cacheKey))
		return val, nil
	}

	var sb strings.Builder

	if req.MixedMode {
		if req.BaseText != "" {
			// ADAPTATION MODE: Translate/Adapt existing story
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
			// GENERATION MODE (Fall back to Story-First if no base text)
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
		// ORIGINAL PROMPT FOR STANDARD MODE
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
		Model: "llama-3.3-70b-versatile",
		Messages: []dto.DeepSeekMessage{
			{Role: "user", Content: sb.String()},
		},
		MaxTokens:   1500,
		Temperature: 0.7,
	}

	// Try Groq first
	resp, err := s.callGroq(ctx, dsReq)
	if err != nil {
		s.logger.Warn("Groq R1 failed in GenerateCohesiveText, falling back to DeepSeek Chat", zap.Error(err))
		dsReq.Model = "deepseek-chat"
		resp, err = s.callDeepSeek(ctx, dsReq)
	}

	if err == nil {
		// Cache for 24 hours
		s.redis.Set(ctx, cacheKey, resp, 24*time.Hour)
	}
	return resp, err
}

func (s *AIService) GenerateQuestions(ctx context.Context, req dto.GenerateCohesiveTextRequest) (string, error) {
	resolvedLanguage := req.Language
	if val, ok := s.languageCache[req.Language]; ok {
		resolvedLanguage = val
	}

	// FAANG Optimization: Cache Check
	var wordsToIdentify []string
	if len(req.Items) > 0 {
		for _, item := range req.Items {
			wordsToIdentify = append(wordsToIdentify, item.Word)
		}
	} else if len(req.Words) > 0 {
		wordsToIdentify = req.Words
	}

	cacheKey := fmt.Sprintf("ai:questions:%s:%s", strings.Join(wordsToIdentify, ","), req.Language)
	if val, err := s.redis.Get(ctx, cacheKey).Result(); err == nil {
		s.logger.Info("AI Cache Hit", zap.String("key", cacheKey))
		return val, nil
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
		Model: "llama-3.3-70b-versatile",
		Messages: []dto.DeepSeekMessage{
			{Role: "user", Content: sb.String()},
		},
		MaxTokens:   1000,
		Temperature: 0.7,
	}

	// Try Groq first
	resp, err := s.callGroq(ctx, dsReq)
	if err != nil {
		s.logger.Warn("Groq R1 failed in GenerateQuestions, falling back to DeepSeek Chat", zap.Error(err))
		dsReq.Model = "deepseek-chat"
		resp, err = s.callDeepSeek(ctx, dsReq)
	}

	if err == nil {
		// Cache for 24 hours
		s.redis.Set(ctx, cacheKey, resp, 24*time.Hour)
	}
	return resp, err
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

	model := "llama-3.3-70b-versatile"

	// FAANG Optimization: Narrative Quality Control
	// If the session is too large (e.g. 100 words), we truncate the items used for the story
	// to the first 15 to ensure a coherent and high-quality narrative.
	items := req.Items
	if len(items) > 15 {
		s.logger.Info("Truncating session summary items for story generation to maintain quality",
			zap.Int("original_count", len(items)),
			zap.Int("limit", 15))
		items = items[:15]
	}

	// STAGE 1: Generate Original Story (Conflict-Driven Narrative)
	var storyPrompt strings.Builder
	storyPrompt.WriteString(fmt.Sprintf("You are a fiction writer. Write a short story (150–220 words) entirely in %s.\n\n", resolvedLearning))
	storyPrompt.WriteString("NARRATIVE STRUCTURE (mandatory):\n")
	storyPrompt.WriteString("1. ONE clear conflict — a problem, mystery, dare, misunderstanding, or moral dilemma.\n")
	storyPrompt.WriteString("2. Escalation — tension rises, stakes feel real.\n")
	storyPrompt.WriteString("3. Surprise twist or emotional payoff at the end (humor, irony, relief).\n")
	storyPrompt.WriteString("4. At least TWO emotional shifts: e.g. curiosity→fear→laughter, tension→relief→surprise.\n\n")

	storyPrompt.WriteString("VOCABULARY TO WEAVE IN:\n")
	for _, item := range items {
		fmt.Fprintf(&storyPrompt, "- \"%s\" (meaning: %s)\n", item.Word, item.Meaning)
	}

	storyPrompt.WriteString("\nWORD INTEGRATION RULES (critical):\n")
	storyPrompt.WriteString("- Each word must be NEEDED by the plot — it should be impossible to remove the word without breaking the story logic.\n")
	storyPrompt.WriteString("- Embed words through CHARACTER ACTIONS, DIALOGUE, and SITUATIONS — never through narration that merely showcases the word.\n")
	storyPrompt.WriteString("- BAD: 'He made a remark about the weather.' (word is decorative)\n")
	storyPrompt.WriteString("- GOOD: 'His remark stung — she turned away without a word.' (word drives the scene)\n")
	storyPrompt.WriteString("- Characters must have NATURAL REASONS for their actions. No unmotivated behavior.\n")
	storyPrompt.WriteString("- Prefer vivid, lived-in sentences over dictionary-style phrasing.\n")
	storyPrompt.WriteString("- SELF-CHECK: if any vocabulary word can be deleted without the story losing meaning → rewrite that sentence.\n\n")

	storyPrompt.WriteString("STYLE:\n")
	storyPrompt.WriteString("- Keep non-target vocabulary at A2–B1 level so the target words stand out by contrast.\n")
	storyPrompt.WriteString("- Use short, punchy sentences for tense moments; longer ones for calm moments.\n")
	storyPrompt.WriteString("- Include at least one line of dialogue.\n\n")

	storyPrompt.WriteString("Return ONLY the story text. No titles, no preamble, no explanation.")

	dsReq := dto.DeepSeekRequest{
		Model:       model,
		Messages:    []dto.DeepSeekMessage{{Role: "user", Content: storyPrompt.String()}},
		MaxTokens:   800,
		Temperature: 0.7,
	}

	originalStory, err := s.callGroq(ctx, dsReq)
	if err != nil {
		s.logger.Warn("Groq failed in SessionSummary (Stage 1), falling back to DeepSeek", zap.Error(err))
		dsReq.Model = "deepseek-chat"
		originalStory, err = s.callDeepSeek(ctx, dsReq)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to generate original story: %v", err)
	}

	// STAGE 2: Parallel Adaptation and Questions (Concurrency Optimization)
	var (
		fluentStory string
		questions   []string
		errFluent   error
		errQue      error
		wg          sync.WaitGroup
	)

	wg.Add(2)

	// Goroutine A: Adaptation to Fluent Language (Mixed Mode)
	go func() {
		defer wg.Done()
		var adaptPrompt strings.Builder
		fmt.Fprintf(&adaptPrompt, "ADAPT THIS STORY INTO %s:\n\"%s\"\n\n", resolvedFluent, originalStory)
		adaptPrompt.WriteString("CRITICAL RULES:\n")
		adaptPrompt.WriteString(fmt.Sprintf("1. Translate the bulk of the text into %s.\n", resolvedFluent))
		adaptPrompt.WriteString("2. PRESERVE the emotional arc, conflict, and twist — do not flatten the drama.\n")
		adaptPrompt.WriteString("3. Keep these exact words in their ORIGINAL English form (Code-Switching):\n")
		for _, item := range items {
			fmt.Fprintf(&adaptPrompt, "   - %s\n", item.Word)
		}
		adaptPrompt.WriteString("4. The English words must sit naturally in the sentence flow — adjust surrounding grammar so the sentence reads smoothly.\n")
		adaptPrompt.WriteString("5. Do NOT put translations in parentheses next to English words. Do NOT double-word (e.g. 'шансы slim chances').\n")
		adaptPrompt.WriteString("6. Keep the same paragraph breaks as the original.\n\n")
		adaptPrompt.WriteString("Return ONLY the adapted story text.")

		reqA := dto.DeepSeekRequest{
			Model:       model,
			Messages:    []dto.DeepSeekMessage{{Role: "user", Content: adaptPrompt.String()}},
			MaxTokens:   800,
			Temperature: 0.3,
		}
		fluentStory, errFluent = s.callGroq(ctx, reqA)
		if errFluent != nil {
			reqA.Model = "deepseek-chat"
			fluentStory, errFluent = s.callDeepSeek(ctx, reqA)
		}
	}()

	// Goroutine B: Questions Generation
	go func() {
		defer wg.Done()
		var quePrompt strings.Builder
		fmt.Fprintf(&quePrompt, "BASED ON THIS STORY:\n\"%s\"\n\n", originalStory)
		fmt.Fprintf(&quePrompt, "TASK: Generate exactly 20 conversational questions in %s.\n\n", resolvedLearning)
		quePrompt.WriteString("QUESTION TYPES (mix all of these):\n")
		quePrompt.WriteString("- 'Why' questions about character motivations (e.g. 'Why did X do Y?')\n")
		quePrompt.WriteString("- 'What would you do' questions that put the student in the character's situation\n")
		quePrompt.WriteString("- Questions about emotions ('How do you think X felt when...?')\n")
		quePrompt.WriteString("- Prediction/opinion questions ('What do you think happened next?', 'Do you agree with X's decision?')\n")
		quePrompt.WriteString("- Questions that naturally use these vocabulary words:\n")
		for _, item := range items {
			fmt.Fprintf(&quePrompt, "  - %s\n", item.Word)
		}
		quePrompt.WriteString("\nRULES:\n")
		quePrompt.WriteString("- Root questions in the STORY'S CONFLICT and EMOTIONS, not just vocabulary definitions.\n")
		quePrompt.WriteString("- Each question should make the student THINK and SPEAK, not just recall a word.\n")
		quePrompt.WriteString("- Use vocabulary words naturally inside the question — do not make the question ABOUT the word itself.\n\n")
		quePrompt.WriteString("RETURN ONLY a JSON array of strings. No markdown, no preamble.")

		reqB := dto.DeepSeekRequest{
			Model:       model,
			Messages:    []dto.DeepSeekMessage{{Role: "user", Content: quePrompt.String()}},
			MaxTokens:   1200,
			Temperature: 0.7,
		}
		queResp, err := s.callGroq(ctx, reqB)
		if err != nil {
			reqB.Model = "deepseek-chat"
			queResp, err = s.callDeepSeek(ctx, reqB)
		}

		if err == nil {
			cleanResp := strings.TrimSpace(queResp)
			if strings.HasPrefix(cleanResp, "```json") {
				cleanResp = strings.TrimPrefix(cleanResp, "```json")
				cleanResp = strings.TrimSuffix(cleanResp, "```")
			}
			errQue = json.Unmarshal([]byte(cleanResp), &questions)
		} else {
			errQue = err
		}
	}()

	wg.Wait()

	if errFluent != nil {
		s.logger.Error("Failed to generate fluent story", zap.Error(errFluent))
	}
	if errQue != nil {
		s.logger.Error("Failed to generate questions", zap.Error(errQue))
	}

	return &dto.SessionSummaryResponse{
		OriginalStory: originalStory,
		FluentStory:   fluentStory,
		Questions:     questions,
	}, nil
}

func (s *AIService) GenerateLeechAid(ctx context.Context, word, context string) (string, error) {
	prompt := fmt.Sprintf(
		"The word \"%s\" is difficult for me to remember in this context: \"%s\".\n"+
			"Please provide a mnemonically helpful explanation and a DIFFERENT, very simple sentence to help me understand and remember it.\n"+
			"Format your response as a JSON object with: \"mnemonic\", \"simpleDefinition\", \"newContext\". English only.",
		word, context)

	dsReq := dto.DeepSeekRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []dto.DeepSeekMessage{
			{Role: "user", Content: prompt},
		},
		MaxTokens:   300,
		Temperature: 1.2,
	}

	// Try Groq first
	resp, err := s.callGroq(ctx, dsReq)
	if err != nil {
		s.logger.Warn("Groq R1 failed in GenerateLeechAid, falling back to DeepSeek Chat", zap.Error(err))
		dsReq.Model = "deepseek-chat"
		resp, err = s.callDeepSeek(ctx, dsReq)
	}
	return resp, err
}

func (s *AIService) callDeepSeek(ctx context.Context, dsReq dto.DeepSeekRequest) (string, error) {
	logger := s.getLogger(ctx)

	result, err := s.breaker.Execute(func() (interface{}, error) {
		if s.deepseekKey == "" {
			return "", fmt.Errorf("DeepSeek API key is not configured")
		}

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
	logger := s.getLogger(ctx)

	result, err := s.groqBreaker.Execute(func() (interface{}, error) {
		if s.groqKey == "" {
			return "", fmt.Errorf("Groq API key is not configured")
		}

		// Groq uses OpenAI-compatible format
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
	logger := s.getLogger(ctx)

	result, err := s.geminiBreaker.Execute(func() (interface{}, error) {
		if s.geminiKey == "" {
			return "", fmt.Errorf("Gemini API key is not configured")
		}

		// Extract user prompt from messages
		var userPrompt string
		for _, msg := range dsReq.Messages {
			if msg.Role == "user" {
				userPrompt = msg.Content
				break
			}
		}

		// Construct native Gemini API payload
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
			"generationConfig": map[string]interface{}{
				"temperature":      dsReq.Temperature,
				"maxOutputTokens":  dsReq.MaxTokens,
				"responseMimeType": "application/json",
			},
		}

		jsonData, err := json.Marshal(payload)
		if err != nil {
			return "", err
		}

		// Native Gemini URL with API key query parameter
		url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=%s", s.geminiKey)

		req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(jsonData))
		if err != nil {
			return "", err
		}

		req.Header.Set("Content-Type", "application/json")

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
			return "", fmt.Errorf("Gemini API returned status %d: %s", resp.StatusCode, string(body))
		}

		// Parse native Gemini response
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
	// PERF: Reduced tokens for faster response with compact prompt.
	// The simplified schema requires fewer tokens for complete JSON.
	if wordCount <= 3 {
		return 400
	}
	if wordCount <= 10 {
		return 500
	}
	return 600
}
