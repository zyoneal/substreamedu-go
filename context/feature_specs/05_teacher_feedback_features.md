# Spec 05: Teacher Feedback — Feature Roadmap

> **Source**: Larysa Stepanyshyna (English Teacher), 2026-09-17
> **Status**: Backlog — Awaiting Prioritization & Breakdown into Individual Specs
> **Priority**: Phase 2 — Product Feature Expansion

---

## Teacher Assessment Summary

### ✅ What the Platform Does Well
- Video + subtitles
- Clickable words and phrases
- Contextual translation
- Personal vocabulary
- Flashcards
- Spaced repetition through Telegram
- YouTube integration
- Text-based learning

> *"the platform itself is amazing. good job!"* — Larysa Stepanyshyna

---

## Proposed Features (Teacher Recommendations)

### Feature 5A: Active Vocabulary Practice

**Problem**: After saving a word, the only practice is flashcards (passive recognition). Learners need to actively *produce* the word in context.

**Proposed Functionality**:
- **Gap-fills**: Sentence with the target word blanked out, learner types it in
- **Paraphrasing**: Given a sentence, learner rewrites it using the saved word
- **Sentence creation**: Learner writes an original sentence using the word
- **Mini-dialogues**: Short 2–4 turn dialogue exercises featuring the word in context

**Scope**: New exercise engine on the Learning page, new API endpoints for exercise generation (LLM-powered), new UI components for each exercise type.

**Dependencies**: Existing dictionary/vocabulary service, LLM integration (`/generate-text`).

---

### Feature 5B: Teacher Mode

**Problem**: Teachers want to use SubStreamEdu in their classrooms but have no tools to structure a lesson around a video.

**Proposed Functionality**:
- Teacher selects any 5–10 minute video (YouTube or uploaded)
- Platform auto-generates a **ready-made lesson plan** containing:
  - Pre-selected vocabulary list with definitions
  - Comprehension questions (multiple choice, true/false, open-ended)
  - Grammar focus tasks extracted from subtitles
  - Speaking task prompts related to video content
- Teacher can edit/customize the generated lesson before sharing
- Shareable lesson link for students

**Scope**: New Teacher role/dashboard, lesson generation pipeline (LLM), lesson editor UI, student lesson view, share system.

**Dependencies**: Auth system (teacher role), media service, LLM integration, new database tables.

---

### Feature 5C: Better Contextual Explanations

**Problem**: Current word translation is a simple definition. Learners need to understand *why* a phrase is used in that specific context.

**Proposed Functionality**:
- Explain **why** the phrase is used in this particular context
- Show **register** (formal, informal, slang, academic, etc.)
- Display **collocations** — what words commonly appear with this word
- Suggest **alternatives** — synonyms that could replace it in context
- Provide **typical contexts** — where else this phrase is commonly used

**Scope**: Enhanced translation popover, richer LLM prompts, updated dictionary item schema.

**Dependencies**: LLM integration, dictionary service schema extension.

---

### Feature 5D: Grammar Detection & Exercises

**Problem**: Subtitles contain rich, authentic grammar patterns but currently there's no way to learn from them.

**Proposed Functionality**:
- **Auto-detect** interesting grammar patterns in subtitles (conditionals, passive voice, reported speech, phrasal verbs, tense shifts, etc.)
- Generate **short explanations** of the grammar rule with the subtitle sentence as the example
- Create **targeted exercises** (fill-in, transformation, error correction) based on the detected pattern
- Link grammar points to specific timestamps in the video

**Scope**: Grammar detection engine (LLM/NLP), grammar exercise UI, grammar database, timestamp linking.

**Dependencies**: Subtitle parsing service, LLM integration, new exercise components.

---

### Feature 5E: Collocations & Chunks

**Problem**: Platform treats language as individual words, but learners need to acquire multi-word units (chunks) as whole entities.

**Proposed Functionality**:
- Detect and treat multi-word expressions as single units:
  - **Collocations**: "make a decision", "raise concerns"
  - **Phrasal verbs**: "brush something off", "come up with"
  - **Idioms**: "break the ice", "hit the nail on the head"
  - **Fixed phrases**: "as a matter of fact", "in terms of"
- Save chunks to vocabulary as single items (not individual words)
- Flashcard review treats chunks as atomic units
- Highlight chunks in subtitles with distinct styling

**Scope**: Chunk detection algorithm (NLP/LLM), subtitle highlighting for multi-word units, dictionary schema for chunk entries, updated flashcard system.

**Dependencies**: Dictionary service, subtitle rendering, LLM integration.

---

### Feature 5F: Writing Practice

**Problem**: No productive writing skill practice based on video content.

**Proposed Functionality**:
- After watching a video, present **short writing prompts** related to the content:
  - Summarize what happened
  - Express your opinion on the topic
  - Describe a similar experience
  - Use 5 saved vocabulary words in a paragraph
- **AI analysis** of the written response:
  - Grammar and spelling correction
  - Vocabulary usage feedback
  - Complexity and fluency assessment
  - Suggestions for improvement
- Track writing progress over time

**Scope**: Writing prompt generator (LLM), text editor UI, response analysis pipeline (LLM), writing history/progress tracking.

**Dependencies**: LLM integration, user progress service, new database tables.

---

## Suggested Implementation Priority

| Priority | Feature | Rationale |
|----------|---------|-----------|
| 🔴 P1 | **5C: Better Contextual Explanations** | Lowest effort, highest impact. Enhances existing translation flow without new UI pages. |
| 🔴 P1 | **5E: Collocations & Chunks** | Core linguistic improvement. Directly enhances subtitle interaction and vocabulary saving — the platform's main loop. |
| 🟡 P2 | **5A: Active Vocabulary Practice** | Transforms passive flashcard review into active production. Major learning outcome improvement. |
| 🟡 P2 | **5D: Grammar Detection** | Unlocks a whole new learning dimension from existing subtitle content. |
| 🟢 P3 | **5F: Writing Practice** | Valuable but requires significant new infrastructure (text editor, AI analysis pipeline). |
| 🟢 P3 | **5B: Teacher Mode** | Highest scope/effort. Opens B2B market but requires teacher role system, lesson builder, and sharing infrastructure. |

---

## Notes
- All features heavily depend on LLM integration — consider a unified **Exercise Generation Service** that powers 5A, 5D, 5F, and parts of 5B.
- Features 5C and 5E can likely be implemented by enhancing existing LLM prompts and the translation popover without major architectural changes.
- Feature 5B (Teacher Mode) is essentially a new product vertical — consider as a separate phase.
