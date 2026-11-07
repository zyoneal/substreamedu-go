# Spec 26: High-Throughput Batch Vocabulary Categorization Engine

> **Status**: In Progress  
> **Author**: Senior AI Agent (Head of Engineering Top FAANG methodology)  
> **Date**: 2026-09-27  
> **Phase**: Phase 2: Product Feature Expansion  

---

## 1. Problem Statement & Motivation
Users frequently build personal dictionaries containing 5,000–10,000+ words and multi-word expressions (phrasal verbs like `blend in`, idioms like `spill the tea`, and conversational chunks like `by the way`). Currently, the dictionary only groups words by video source name (`resource_name`), which fragments vocabulary across hundreds of video clips and provides zero thematic coherence.

Attempting to categorize 10,000 items with traditional 1-by-1 LLM prompts would burn millions of tokens (~$15–$30 per user), trigger HTTP 429 rate limit bans, and take 30+ minutes. Furthermore, static dictionary wordlists (WordNet / Oxford 3000) fail on multi-word phrasal verbs (`blend in`) and contemporary slang.

We need a **high-throughput, zero-token-waste categorization engine** that can categorize 10,000 items in seconds with minimal AI tokens (<90k tokens for an entire 10k library = ~$0.015), cache categories globally across all users, and provide a sleek, responsive category explorer on the frontend.

---

## 2. Architectural Design (Zero-Waste 3-Tier Pipeline)

```
                    Uncategorized User Vocabulary (up to 10k items)
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tier 1: Global Pre-Seeded Phrase Cache (`global_phrase_categories`)         │
│ Direct SQL JOIN / Bulk Lookup. 0 AI tokens. ~10ms execution.                │
│ Pre-seeded with 1,000+ core phrasal verbs, idioms, and high-frequency roots.│
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Items not found in cache (~5-15%)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tier 2: Dense Array AI Micro-Batching (100 items per prompt)                │
│ Input: [{"i": id, "t": phrase}]                                             │
│ Output: {"id": category_id}                                                 │
│ Provider Fallback: Groq (Llama-3.3-70B) → DeepSeek → Gemini → Algorithmic   │
│ Persists newly classified phrases into `global_phrase_categories` forever.   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ Tier 3: Bulk PostgreSQL Update via (VALUES ...) & Instant Invalidation      │
│ Single-statement batch update for 100 rows at a time in `dictionary`.       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Taxonomy Categories (Standard 12 Themes)
1. `Emotions & Traits` (эмоции, характер, чувства)
2. `Work & Business` (работа, бизнес, карьера, финансы)
3. `Tech & Science` (технологии, IT, наука, digital)
4. `Daily Life & Home` (быт, дом, покупки, рутина)
5. `Food & Dining` (еда, напитки, кулинария)
6. `Travel & Places` (путешествия, город, транспорт)
7. `Social & Communication` (общение, социум, дискуссии, диалоги)
8. `Art, Media & Entertainment` (кино, музыка, хобби, искусство)
9. `Nature & Environment` (природа, животные, экология, погода)
10. `Health & Fitness` (здоровье, тело, спорт, медицина)
11. `Slang, Idioms & Phrasal Verbs` (сленг, идиомы, фразовые глаголы, идиоматические выражения)
12. `Abstract & Philosophy` (абстрактные понятия, время, идеи)

---

## 3. Scope Boundaries & Implementation Rules

### Allowed Files to Modify/Create:
- `substreamedu-dictionary-service-go/internal/repository/migrations/000007_add_category_and_global_phrase_cache.up.sql`
- `substreamedu-dictionary-service-go/internal/repository/migrations/000007_add_category_and_global_phrase_cache.down.sql`
- `substreamedu-dictionary-service-go/internal/model/models.go`
- `substreamedu-dictionary-service-go/internal/dto/dictionary.go`
- `substreamedu-dictionary-service-go/internal/repository/dictionary_repository.go`
- `substreamedu-dictionary-service-go/internal/service/ai_service.go`
- `substreamedu-dictionary-service-go/internal/service/categorization_service.go` (new)
- `substreamedu-dictionary-service-go/internal/handler/dictionary_handler.go`
- `substreamedu-dictionary-service-go/internal/router/router.go`
- `substreamedu-dictionary-service-go/cmd/server/main.go`
- `substreamedu-frontend/src/services/DictionaryService.ts`
- `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.tsx`
- `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.module.css`
- Unit test files for categorization in Go and React.

### Forbidden Mutations:
- No changes to `substreamedu-media-service-go` or `substreamedu-iam-service-go`.
- No dropping of existing columns or breaking existing `/dictionary/resources` endpoints.
- No unhandled goroutines (respect Rule 14 & Rule 15).

---

## 4. Verification Checklist
- [x] Migration 000007 applies cleanly and idempotently.
- [x] Unit tests for `CategorizePhrasesBatch` pass with simulated and algorithmic fallbacks.
- [x] `CategorizationService` correctly handles cache hits and dense AI micro-batches.
- [x] API endpoints `POST /api/dictionary/categorize`, `GET /api/dictionary/categories`, and `GET /api/dictionary/categories/:category/items` respond with valid schema.
- [x] Frontend `DictionaryPage.tsx` displays category tabs and organizes words into themes.
- [x] All Go tests (`go test ./...`) pass.
- [x] All 42+ frontend test suites pass with zero regressions.
- [x] Production build succeeds.
