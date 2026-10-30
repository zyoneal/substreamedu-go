package service

import (
	"context"
	"fmt"
	"net/http"
	"strconv"
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
		httpClient:	resilience.NewResilientClient(resilience.DefaultClientOptions(4500 * time.Millisecond)),
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

	cacheKey := fmt.Sprintf("ai:translation:v3.3:%s:%s:%s", req.HighlightedText, req.FluentLanguage, req.Context)
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
		s.logger.Warn("All AI providers failed for story, generating structured algorithmic narrative fallback", zap.Error(err))
		origStory, flStory, questList := s.generateAlgorithmicSessionStory(items, resolvedLearning, resolvedFluent)
		return &dto.SessionSummaryResponse{
			OriginalStory: origStory,
			FluentStory:   flStory,
			Questions:     questList,
		}, nil
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
			s.logger.Warn("Fluent story generation failed, falling back to algorithmic code-switch story", zap.Error(errA))
			_, flStory, _ := s.generateAlgorithmicSessionStory(items, resolvedLearning, resolvedFluent)
			fluentStory = flStory
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
			s.logger.Warn("Question generation failed, preparing algorithmic questions", zap.Error(errB))
		} else {
			questions = parseQuestionsResponse(queResp)
		}

		if len(questions) == 0 {
			s.logger.Warn("No questions parsed from LLM, generating algorithmic questions")
			questions = s.generateAlgorithmicQuestions(items, resolvedLearning)
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


// GenerateEmbedding is a no-op placeholder since embedding-service was decommissioned.
func (s *AIService) GenerateEmbedding(ctx context.Context, text string) ([]float32, error) {
	return nil, nil
}

func (s *AIService) GeneratePracticeExercises(ctx context.Context, req dto.PracticeExercisesRequest) (*dto.PracticeExercisesResponse, error) {
	resolvedLearning := req.LearningLanguage
	if val, ok := s.languageCache[req.LearningLanguage]; ok {
		resolvedLearning = val
	}
	if resolvedLearning == "" {
		resolvedLearning = "English"
	}
	resolvedFluent := req.FluentLanguage
	if val, ok := s.languageCache[req.FluentLanguage]; ok {
		resolvedFluent = val
	}
	if resolvedFluent == "" {
		resolvedFluent = "Russian"
	}

	items := req.Items
	if len(items) > 20 {
		items = items[:20]
	}

	var prompt strings.Builder
	fmt.Fprintf(&prompt, "You are a professional language pedagogy specialist and curriculum designer.\n")
	fmt.Fprintf(&prompt, "Create engaging, authentic active vocabulary practice exercises for intermediate/advanced learners studying %s.\n", resolvedLearning)
	fmt.Fprintf(&prompt, "Native/fluent language for hints/translations: %s.\n\n", resolvedFluent)
	prompt.WriteString("Target words and collocations to practice:\n")
	for i, item := range items {
		if item.Context != "" {
			fmt.Fprintf(&prompt, "%d. \"%s\" (meaning: %s, original context: \"%s\")\n", i+1, item.Word, item.Meaning, item.Context)
		} else {
			fmt.Fprintf(&prompt, "%d. \"%s\" (meaning: %s)\n", i+1, item.Word, item.Meaning)
		}
	}

	prompt.WriteString("\nGenerate exactly 1 engaging, authentic exercise per word. Focus on \"gap_fill\": An authentic sentence where the target word/collocation is replaced with '______'. Provide 'sentence_before' and 'sentence_after', a helpful hint (in fluent language), 4 options (the correct word plus 3 plausible distractors of the same part of speech in randomized order, so the correct answer is NOT always the first option), accepted inflections in 'accepted_answers', and a brief pedagogical explanation.\n\n")

	prompt.WriteString("Return ONLY valid JSON matching this schema:\n")
	prompt.WriteString("{\n")
	prompt.WriteString("  \"exercises\": [\n")
	prompt.WriteString("    {\n")
	prompt.WriteString("      \"id\": \"ex_1\",\n")
	prompt.WriteString("      \"type\": \"gap_fill\",\n")
	prompt.WriteString("      \"target_word\": \"string\",\n")
	prompt.WriteString("      \"prompt\": \"sentence with ______ blank\",\n")
	prompt.WriteString("      \"sentence_before\": \"sentence part before blank\",\n")
	prompt.WriteString("      \"sentence_after\": \"sentence part after blank\",\n")
	prompt.WriteString("      \"hint\": \"concise hint\",\n")
	prompt.WriteString("      \"options\": [\"plausible_option_1\", \"plausible_option_2\", \"plausible_option_3\", \"plausible_option_4\"],\n")
	prompt.WriteString("      \"accepted_answers\": [\"exact word\", \"inflected form\"],\n")
	prompt.WriteString("      \"explanation\": \"brief pedagogical note\"\n")
	prompt.WriteString("    }\n")
	prompt.WriteString("  ]\n")
	prompt.WriteString("}\n")
	prompt.WriteString("Do NOT include markdown fences, code blocks, or preamble.")

	dsReq := dto.DeepSeekRequest{
		Model: "deepseek-chat",
		Messages: []dto.DeepSeekMessage{
			{Role: "system", Content: "You are an expert language pedagogy AI. You generate precise JSON exercises for active vocabulary production."},
			{Role: "user", Content: prompt.String()},
		},
		MaxTokens:   2500,
		Temperature: 0.5,
	}

	respStr, err := s.callWithFallback(ctx, dsReq)
	if err == nil {
		clean := strings.TrimSpace(respStr)
		if strings.HasPrefix(clean, "```json") {
			clean = strings.TrimPrefix(clean, "```json")
		} else if strings.HasPrefix(clean, "```") {
			clean = strings.TrimPrefix(clean, "```")
		}
		clean = strings.TrimSuffix(clean, "```")
		clean = strings.TrimSpace(clean)

		var result dto.PracticeExercisesResponse
		var unmarshalErr error
		if unmarshalErr = json.Unmarshal([]byte(clean), &result); unmarshalErr == nil && len(result.Exercises) > 0 {
			for i := range result.Exercises {
				result.Exercises[i].Options = shuffleStrings(result.Exercises[i].Options)
			}
			return &result, nil
		}
		s.logger.Warn("Failed to unmarshal AI practice exercises, falling back to algorithmic generator", zap.Error(unmarshalErr))
	} else {
		s.logger.Warn("AI call failed for practice exercises, using algorithmic fallback", zap.Error(err))
	}

	fallbackResult := s.generateAlgorithmicExercises(req.Items)
	return fallbackResult, nil
}

func (s *AIService) EvaluateSentence(ctx context.Context, req dto.EvaluateSentenceRequest) (*dto.EvaluateSentenceResponse, error) {
	resolvedLearning := req.LearningLanguage
	if val, ok := s.languageCache[req.LearningLanguage]; ok {
		resolvedLearning = val
	}
	if resolvedLearning == "" {
		resolvedLearning = "English"
	}

	var prompt strings.Builder
	fmt.Fprintf(&prompt, "You are an encouraging, expert language teacher evaluating a student's original sentence in %s.\n", resolvedLearning)
	fmt.Fprintf(&prompt, "Target word/phrase: \"%s\" (meaning: %s)\n", req.Word, req.Meaning)
	fmt.Fprintf(&prompt, "Student's sentence: \"%s\"\n\n", req.Sentence)
	prompt.WriteString("Analyze whether the target word is used correctly, idiomatically, and grammatically.\n")
	prompt.WriteString("Assign one of these statuses:\n")
	prompt.WriteString("- \"native\": Perfectly natural, native-level phrasing and grammar.\n")
	prompt.WriteString("- \"natural\": Grammatically sound, natural usage with minor or no stylistic quirks.\n")
	prompt.WriteString("- \"minor_issues\": Understandable and word used decently, but minor grammar/preposition/collocation mistake.\n")
	prompt.WriteString("- \"incorrect\": Target word misused in meaning, or severe grammatical breakdown.\n\n")
	prompt.WriteString("Return ONLY valid JSON matching this schema:\n")
	prompt.WriteString("{\n")
	prompt.WriteString("  \"is_correct\": true,\n")
	prompt.WriteString("  \"status\": \"native\" | \"natural\" | \"minor_issues\" | \"incorrect\",\n")
	prompt.WriteString("  \"feedback\": \"1-2 concise sentences of constructive feedback.\",\n")
	prompt.WriteString("  \"improved_version\": \"Native speaker phrasing of their intended meaning.\"\n")
	prompt.WriteString("}\n")
	prompt.WriteString("Do NOT include markdown formatting or commentary.")

	dsReq := dto.DeepSeekRequest{
		Model: "deepseek-chat",
		Messages: []dto.DeepSeekMessage{
			{Role: "system", Content: "You are a professional linguistic evaluator. You respond strictly in valid JSON."},
			{Role: "user", Content: prompt.String()},
		},
		MaxTokens:   500,
		Temperature: 0.3,
	}

	respStr, err := s.callWithFallback(ctx, dsReq)
	if err == nil {
		clean := strings.TrimSpace(respStr)
		if strings.HasPrefix(clean, "```json") {
			clean = strings.TrimPrefix(clean, "```json")
		} else if strings.HasPrefix(clean, "```") {
			clean = strings.TrimPrefix(clean, "```")
		}
		clean = strings.TrimSuffix(clean, "```")
		clean = strings.TrimSpace(clean)

		var evalResp dto.EvaluateSentenceResponse
		var unmarshalErr error
		if unmarshalErr = json.Unmarshal([]byte(clean), &evalResp); unmarshalErr == nil {
			return &evalResp, nil
		}
		s.logger.Warn("Failed to unmarshal sentence evaluation, falling back", zap.Error(unmarshalErr))
	} else {
		s.logger.Warn("Sentence evaluation AI call failed, using fallback", zap.Error(err))
	}

	hasWord := strings.Contains(strings.ToLower(req.Sentence), strings.ToLower(req.Word))
	if hasWord {
		return &dto.EvaluateSentenceResponse{
			IsCorrect:       true,
			Status:          "natural",
			Feedback:        fmt.Sprintf("Well done! Your sentence includes '%s'. Keep practicing using it in varied contexts.", req.Word),
			ImprovedVersion: req.Sentence,
		}, nil
	}

	return &dto.EvaluateSentenceResponse{
		IsCorrect:       false,
		Status:          "minor_issues",
		Feedback:        fmt.Sprintf("Make sure to include the target word '%s' in your sentence.", req.Word),
		ImprovedVersion: fmt.Sprintf("%s ...", req.Word),
	}, nil
}

type grammarAIResponse struct {
	RuleName           string               `json:"rule_name"`
	StructureTag       string               `json:"structure_tag"`
	CefrLevel          string               `json:"cefr_level"`
	Formula            string               `json:"formula"`
	Explanation        string               `json:"explanation"`
	NativeExplanation  string               `json:"native_explanation"`
	HighlightedSegment string               `json:"highlighted_segment"`
	Exercise           dto.PracticeExercise `json:"exercise"`
}

func (s *AIService) AnalyzeGrammar(ctx context.Context, req dto.AnalyzeGrammarRequest) (*dto.AnalyzeGrammarResponse, error) {
	resolvedLearning := req.LearningLanguage
	if val, ok := s.languageCache[req.LearningLanguage]; ok {
		resolvedLearning = val
	}
	if resolvedLearning == "" {
		resolvedLearning = "English"
	}

	resolvedFluent := req.FluentLanguage
	if val, ok := s.languageCache[req.FluentLanguage]; ok {
		resolvedFluent = val
	}
	if resolvedFluent == "" {
		resolvedFluent = "Russian"
	}

	var prompt strings.Builder
	fmt.Fprintf(&prompt, "You are a master linguistic professor and communicative grammar teacher.\n")
	fmt.Fprintf(&prompt, "Analyze the following %s sentence from authentic video subtitles:\n", resolvedLearning)
	fmt.Fprintf(&prompt, "Sentence: \"%s\"\n", req.Sentence)
	if req.RuleHint != "" {
		fmt.Fprintf(&prompt, "Detected Pattern Hint: %s\n", req.RuleHint)
	}
	fmt.Fprintf(&prompt, "Target learner native language: %s\n\n", resolvedFluent)

	prompt.WriteString("Perform a deep pedagogical breakdown of the primary advanced grammatical structure:\n")
	prompt.WriteString("1. SYNTACTIC ROLE ANALYSIS MANDATE: Always analyze the syntactic role of the target phrase within the FULL sentence before assigning a grammar topic (e.g., determine if a pronoun is subject or object, or whether an auxiliary verb precedes or follows the subject). Never classify a grammar category purely from isolated adjacent words.\n")
	prompt.WriteString("2. Identify the rule name (e.g., 'Third Conditional', 'Modal Perfect', 'Passive Voice', 'Causative Form', 'Negative Inversion').\n")
	prompt.WriteString("3. Provide the canonical formula (e.g., 'Modal + have + past participle (V3)', 'Negative/Restrictive Adverb + Auxiliary + Subject + Main Verb').\n")
	prompt.WriteString("4. Specify the CEFR level (B1, B2, C1, or C2).\n")
	prompt.WriteString("5. Explain in 1-2 sentences why this structure was used in this context (pragmatics, nuance).\n")
	prompt.WriteString("6. Provide a 1-2 sentence explanation in the student's native language.\n")
	prompt.WriteString("7. Extract the exact highlighted substring demonstrating the structure.\n")
	prompt.WriteString("8. Create 1 interactive mini-quiz question (gap_fill) testing this exact structure with 3 plausible, high-quality options and the correct answer (distractors must test real tense/modal differentiation rather than obvious nonsense).\n")
	prompt.WriteString("9. LINGUISTIC PRECISION MANDATE: NEVER classify regular word order (e.g. 'you would never have', 'I will never forget') as Negative Inversion. Negative Inversion strictly requires fronting a negative/restrictive adverbial (Never, Rarely, Seldom, Hardly, Little, Not only) to the beginning of the clause followed by subject-auxiliary inversion (Auxiliary + Subject). Also, do NOT confuse inverted questions ('Have you done your homework?') with Causative Form ('have something done').\n\n")

	prompt.WriteString("Return ONLY valid JSON matching this schema:\n")
	prompt.WriteString("{\n")
	prompt.WriteString("  \"rule_name\": \"Third Conditional\",\n")
	prompt.WriteString("  \"structure_tag\": \"third_conditional\",\n")
	prompt.WriteString("  \"cefr_level\": \"B2\",\n")
	prompt.WriteString("  \"formula\": \"If + had + V3, ... would have + V3\",\n")
	prompt.WriteString("  \"explanation\": \"Expresses an impossible past condition and its imagined past result.\",\n")
	prompt.WriteString("  \"native_explanation\": \"Выражает нереальное условие в прошлом.\",\n")
	prompt.WriteString("  \"highlighted_segment\": \"would have been\",\n")
	prompt.WriteString("  \"exercise\": {\n")
	prompt.WriteString("    \"id\": \"quiz-1\",\n")
	prompt.WriteString("    \"type\": \"gap_fill\",\n")
	prompt.WriteString("    \"target_word\": \"had known\",\n")
	prompt.WriteString("    \"prompt\": \"If I ___ about the delay, I would have taken the earlier flight.\",\n")
	prompt.WriteString("    \"sentence_before\": \"If I \",\n")
	prompt.WriteString("    \"sentence_after\": \" about the delay, I would have taken the earlier flight.\",\n")
	prompt.WriteString("    \"hint\": \"Past perfect form of 'know'\",\n")
	prompt.WriteString("    \"options\": [\"had known\", \"knew\", \"have known\"],\n")
	prompt.WriteString("    \"accepted_answers\": [\"had known\"],\n")
	prompt.WriteString("    \"explanation\": \"Third conditional requires 'had + past participle' in the if-clause.\"\n")
	prompt.WriteString("  }\n")
	prompt.WriteString("}\n")
	prompt.WriteString("Do NOT include markdown backticks or commentary.")

	dsReq := dto.DeepSeekRequest{
		Model: "deepseek-chat",
		Messages: []dto.DeepSeekMessage{
			{Role: "system", Content: "You are a professional linguistics and grammar analyzer. You respond strictly in valid JSON."},
			{Role: "user", Content: prompt.String()},
		},
		MaxTokens:   800,
		Temperature: 0.3,
	}

	respStr, err := s.callWithFallback(ctx, dsReq)
	if err == nil {
		clean := strings.TrimSpace(respStr)
		if strings.HasPrefix(clean, "```json") {
			clean = strings.TrimPrefix(clean, "```json")
		} else if strings.HasPrefix(clean, "```") {
			clean = strings.TrimPrefix(clean, "```")
		}
		clean = strings.TrimSuffix(clean, "```")
		clean = strings.TrimSpace(clean)

		var gResp grammarAIResponse
		if unmarshalErr := json.Unmarshal([]byte(clean), &gResp); unmarshalErr == nil && gResp.RuleName != "" {
			if gResp.Exercise.ID == "" {
				gResp.Exercise.ID = fmt.Sprintf("quiz-%d", time.Now().UnixNano())
			}
			gResp.Exercise.Options = shuffleStrings(gResp.Exercise.Options)
			return &dto.AnalyzeGrammarResponse{
				RuleName:           gResp.RuleName,
				StructureTag:       gResp.StructureTag,
				CefrLevel:          gResp.CefrLevel,
				Formula:            gResp.Formula,
				Explanation:        gResp.Explanation,
				NativeExplanation:  gResp.NativeExplanation,
				HighlightedSegment: gResp.HighlightedSegment,
				Exercise:           gResp.Exercise,
			}, nil
		}
		s.logger.Warn("Failed to unmarshal grammar analysis AI response, falling back", zap.Error(err))
	} else {
		s.logger.Warn("Grammar analysis AI call failed, using linguistic fallback", zap.Error(err))
	}

	return s.getGrammarFallback(req.Sentence, req.RuleHint, resolvedFluent), nil
}


func (s *AIService) GenerateLessonPlan(ctx context.Context, req dto.GenerateLessonRequest) (*dto.LessonPlan, error) {
	ctx, cancel := context.WithTimeout(ctx, 35*time.Second)
	defer cancel()

	level := req.TargetLevel
	if level == "" {
		level = "B1"
	}

	var transcriptBuilder strings.Builder
	if len(req.Subtitles) > 0 {
		limit := len(req.Subtitles)
		if limit > 60 {
			limit = 60
		}
		for i := 0; i < limit; i++ {
			cue := req.Subtitles[i]
			mins := int(cue.Start) / 60
			secs := int(cue.Start) % 60
			transcriptBuilder.WriteString(fmt.Sprintf("[%02d:%02d] %s\n", mins, secs, strings.TrimSpace(cue.Text)))
		}
	} else if req.Transcript != "" {
		t := req.Transcript
		if len(t) > 3500 {
			t = t[:3500] + "..."
		}
		transcriptBuilder.WriteString(t)
	}

	transcriptText := transcriptBuilder.String()
	if strings.TrimSpace(transcriptText) == "" {
		transcriptText = "Video lesson focusing on English communication, context clues, and authentic conversation."
	}

	systemPrompt := `You are an expert Cambridge CELTA/DELTA master language instructor.
Given a video transcript/subtitles with timestamps, target CEFR level, and video title, generate a high-quality, pedagogically sound, and engaging lesson plan for English language learners and teachers.

The output MUST be strictly valid JSON matching this exact structure:
{
  "title": "A concise, engaging lesson title",
  "level": "` + level + `",
  "estimated_time_min": 45,
  "summary": "2-3 sentences summarizing what learners will understand and achieve in this lesson",
  "vocabulary": [
    {
      "word": "authentic keyword or phrase",
      "definition": "clear definition suitable for ` + level + ` learners",
      "context": "the actual sentence or fragment from the video where it appears",
      "timestamp_sec": 14.5,
      "cefr": "` + level + `"
    }
  ],
  "comprehension_questions": [
    {
      "question": "Comprehension question testing meaning or detail?",
      "type": "multiple-choice",
      "options": ["Correct option", "Distractor 1", "Distractor 2", "Distractor 3"],
      "correct_index": 0,
      "explanation": "Why this answer is correct based on the video context."
    }
  ],
  "grammar_focus": [
    {
      "pattern": "Grammar Pattern Name",
      "rule": "Explanation of how and when to use this pattern",
      "example_from_video": "Example from transcript",
      "exercise_gap_fill": "Practice sentence with ___ gap",
      "exercise_answer": "correct word/phrase"
    }
  ],
  "speaking_prompts": [
    "Discussion question 1?",
    "Discussion question 2?"
  ],
  "homework_idea": "A creative, practical task learners can do outside class."
}

Rules:
1. Provide 5 to 7 high-utility vocabulary items or authentic idiomatic collocations from the video transcript with realistic timestamps.
2. Provide 3 to 5 comprehension questions (mix of multiple-choice and true/false) with valid correct_index.
3. Provide 1 or 2 authentic grammar points with clear rules and gap-fill practice.
4. Provide 2 to 4 speaking prompts for discussion.
5. Vocabulary and questions MUST relate directly to the provided video transcript.
6. Return ONLY valid raw JSON. No markdown code blocks, no preamble, no trailing text.`

	userPrompt := fmt.Sprintf("Title: %s\nTarget Level: %s\nLanguage: %s\nCustom Focus: %s\n\nSubtitles & Timestamps:\n%s",
		req.Title, level, req.Language, req.CustomFocus, transcriptText)

	dsReq := dto.DeepSeekRequest{
		Model: "deepseek-chat",
		Messages: []dto.DeepSeekMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userPrompt},
		},
		MaxTokens:   2000,
		Temperature: 0.4,
	}

	respStr, err := s.callWithFallback(ctx, dsReq)
	if err == nil {
		clean := strings.TrimSpace(respStr)
		if strings.HasPrefix(clean, "```json") {
			clean = strings.TrimPrefix(clean, "```json")
		} else if strings.HasPrefix(clean, "```") {
			clean = strings.TrimPrefix(clean, "```")
		}
		clean = strings.TrimSuffix(clean, "```")
		clean = strings.TrimSpace(clean)

		var plan dto.LessonPlan
		if unmarshalErr := json.Unmarshal([]byte(clean), &plan); unmarshalErr == nil && len(plan.Vocabulary) > 0 {
			if plan.Level == "" {
				plan.Level = level
			}
			if plan.Title == "" {
				plan.Title = req.Title
			}
			return &plan, nil
		}
	}

	return s.generateAlgorithmicLessonPlan(req), nil
}



func (s *AIService) CategorizePhrasesBatch(ctx context.Context, items []dto.PhraseItem) (map[int64]string, error) {
	if len(items) == 0 {
		return make(map[int64]string), nil
	}

	// Always compute heuristic as baseline fallback
	heuristicFallback := s.CategorizePhrasesHeuristic(items)

	// Build compact prompt
	var sb strings.Builder
	sb.WriteString("You are an ultra-fast semantic categorization engine.\n")
	sb.WriteString("Categories:\n")
	sb.WriteString("1: Emotions & Traits\n2: Work & Business\n3: Tech & Science\n4: Daily Life & Home\n5: Food & Dining\n6: Travel & Places\n7: Social & Communication\n8: Art, Media & Entertainment\n9: Nature & Environment\n10: Health & Fitness\n11: Slang, Idioms & Phrasal Verbs\n12: Abstract & Philosophy\n\n")
	sb.WriteString("Classify each English word, phrasal verb, or idiom into its single best category ID (1-12).\n")
	sb.WriteString("Return ONLY a strict JSON object mapping item ID to category ID, for example: {\"101\": 7, \"102\": 2}.\n")
	sb.WriteString("Do NOT wrap in markdown or backticks.\n\n")
	sb.WriteString("ITEMS TO CLASSIFY:\n")

	payloadBytes, err := json.Marshal(items)
	if err != nil {
		s.logger.Warn("Failed to marshal items for categorization, using heuristic fallback", zap.Error(err))
		return heuristicFallback, nil
	}
	sb.Write(payloadBytes)

	dsReq := dto.DeepSeekRequest{
		Model: "llama-3.3-70b-versatile",
		Messages: []dto.DeepSeekMessage{
			{Role: "user", Content: sb.String()},
		},
		MaxTokens:   1500,
		Temperature: 0.1,
	}

	resp, err := s.callWithFallback(ctx, dsReq)
	if err != nil || strings.TrimSpace(resp) == "" {
		s.logger.Warn("AI categorization failed, using heuristic fallback", zap.Error(err))
		return heuristicFallback, nil
	}

	cleanResp := strings.TrimSpace(resp)
	if start := strings.Index(cleanResp, "{"); start != -1 {
		if end := strings.LastIndex(cleanResp, "}"); end != -1 && end > start {
			cleanResp = cleanResp[start : end+1]
		}
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal([]byte(cleanResp), &parsed); err != nil {
		s.logger.Warn("Failed to unmarshal AI categorization response, using heuristic fallback", zap.Error(err), zap.String("raw", resp))
		return heuristicFallback, nil
	}

	results := make(map[int64]string, len(items))
	for k, v := range parsed {
		id, err := strconv.ParseInt(k, 10, 64)
		if err != nil {
			continue
		}
		var catID int
		switch val := v.(type) {
		case float64:
			catID = int(val)
		case int:
			catID = val
		case string:
			catID, _ = strconv.Atoi(val)
		}
		if catName, ok := CategoryTaxonomy[catID]; ok {
			results[id] = catName
		}
	}

	// For any item missing in AI response, fill from heuristic
	for _, item := range items {
		if _, exists := results[item.ID]; !exists {
			results[item.ID] = heuristicFallback[item.ID]
		}
	}

	return results, nil
}


