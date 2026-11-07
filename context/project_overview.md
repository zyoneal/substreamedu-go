# SubStreamEdu: Project Overview

## 1. High-Level Project Goal & Target Users
**SubStreamEdu** is an enterprise-grade, AI-powered language acquisition ecosystem that bridges entertainment streaming media (YouTube, Spotify, video clips, subtitles, and external subtitle sources) with cognitive memory retention. It translates in-context vocabulary and schedules reinforcement via a state-of-the-art Spaced Repetition System (SRS) powered by the **Free Spaced Repetition Scheduler (FSRS)** algorithm.

### Target Users
1. **Self-Directed Language Learners**: Intermediate to advanced students who learn through authentic native streaming content (podcasts, YouTube video essays, music lyrics, films) rather than traditional textbook drills.
2. **Spaced Repetition & Anki Power Users**: Learners seeking automated card creation, context capture, and bidirectional card types (Recognition: L2→L1, Production: L1→L2) with automatic export to Anki (`.apkg`) and CSV.
3. **Mobile & On-the-Go Learners**: Learners using Telegram for daily flashcard reviews, streak retention, and audio pronunciation practice.
4. **Content Creators & Teachers**: Educators who share custom vocabulary collections and promo access with students.

---

## 2. Core User Flows (Step-by-Step)

### Flow A: Interactive Video & Media Vocabulary Discovery
1. **Source Ingestion**: The user submits a YouTube URL, selects a film subtitle file, or streams media within the web application.
2. **Real-Time Synchronized Subtitles**: The system parses SRT/VTT captions, aligning phrases with media playback timecodes.
3. **In-Context Lexeme Interaction**: The user clicks/selects an unfamiliar word or phrase in the subtitles.
4. **Enriched Translation**: The system retrieves translation, transliteration, POS, morphological context, definitions, and sample sentences (via AI context translation).
5. **Instant SRS Card Generation**: Saving the word automatically creates two linked SRS cards in the dictionary:
   - **Recognition Card (Type 0)**: Front displays target word + context snippet; user recalls native meaning.
   - **Production Card (Type 1)**: Front displays native translation + cloze sentence; user recalls target word.

### Flow B: FSRS Spaced Repetition Review Cycle
1. **Daily Due Queue**: The system computes cards due today based on FSRS parameters (Stability, Retrievability, Difficulty).
2. **Active Recall**: The user completes reviews in the Web App (`/learning`) or via Telegram Bot.
3. **Rating & Scheduling**: User grades recall (Again=1, Hard=2, Good=3, Easy=4). The algorithm updates interval, stability, and next repetition timestamp.
4. **Transactional Event Propagation**: The review triggers an Outbox event (`WordReviewedEvent`) published to Kafka, keeping streak metrics and mobile bots synchronized.

### Flow C: Cross-Platform Telegram Bot Workflow
1. **Account Pairing**: User generates a unique pairing token on the Web App and links their Telegram handle.
2. **Review Notifications**: Scheduled cron notifications ping the user with daily due cards.
3. **Inline Audio & Flashcards**: User reviews items directly in Telegram, receiving audio pronunciation and instant feedback.

---

## 3. Scope Boundaries: In-Scope vs. Out-of-Scope

| Feature Area | In-Scope (Strict Priority) | Out-of-Scope (Forbidden Scope Creep) |
| :--- | :--- | :--- |
| **Media Parsing** | SRT, VTT parsing, YouTube metadata & captions, Spotify track sync | Re-encoding video files, hosting raw 4K video files on local server |
| **SRS Algorithm** | FSRS v4 implementation, dual-card generation (Recognition/Production), Leech detection | Custom bespoke neural-network SRS models that diverge from FSRS standards |
| **Identity & Access** | Google OAuth2, Email verification, JWT access tokens, role-based access (`USER`, `SYSTEM_ADMIN`) | Decentralized Web3 auth, phone SMS OTP gateways |
| **Telegram Integration** | Flashcard review, audio pronunciations, streak tracking, account linking | Building a standalone mini-app store inside Telegram |
| **Data Export** | Anki `.apkg` generation, CSV export of dictionaries and resource sets | Direct AnkiWeb sync integration via unofficial reverse-engineered APIs |
| **AI Processing** | Contextual translation, definition generation, CEFR text generation | Self-hosted 70B LLMs running locally on application servers |

---

## 4. Concrete, Testable Success Criteria

1. **Sub-Millisecond Route Dispatch**: Reverse proxy and Go Gateway dispatch overhead stays below `5ms` at p95 under standard load.
2. **Zero-Trust Auth Enforcement**: 100% of mutation routes (`POST`, `PUT`, `PATCH`, `DELETE`) across all microservices require authenticated and validated identity; no route trusts arbitrary `userId` query params or spoofed headers.
3. **Zero UI Emojis & Strict Token Compliance**: Frontend strictly adheres to the Cinematic Espresso theme (`#0d0c0b` canvas, `e-Ukraine` typography, JetBrains Mono metrics, zero un-themed raw hex values).
4. **Zero-Downtime Rollouts**: Automated deployment completes via `deploy.sh` without HTTP 502/503 dropped requests, utilizing rolling container swaps and dynamic Caddy TLS reload.
5. **Deterministic Database State**: All databases (`sse_iam`, `substreamedu_dictionary`, `substreamedu_media`) execute versioned, idempotent migrations tracked in `schema_migrations`.
