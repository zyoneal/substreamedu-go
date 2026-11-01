# AGENTS.md: Developer & AI Agent Operating System

Welcome to the **SubStreamEdu** repository. This codebase is managed under **Senior Engineer Spec-Driven Development (SDD)** with machine-enforced guardrails.

> [!IMPORTANT]
> **MANDATORY PROTOCOL FOR ALL AI AGENTS & PAIR-PROGRAMMING ASSISTANTS**
> Before writing, modifying, refactoring, or deleting ANY file in this repository, you MUST follow the instructions below without exception.

---

## 1. Pre-Flight Context Checklist (Progressive Disclosure)

Do not ingest unnecessary files. Load context strictly based on your task domain:

### Always Ingest (All Tasks):
1. [`/context/project_overview.md`](file:///Users/test/Desktop/substreamedu-go/context/project_overview.md) — Product scope, core user flows, and system boundaries.
2. [`/context/architecture.md`](file:///Users/test/Desktop/substreamedu-go/context/architecture.md) — System layers, communication patterns, storage, and architectural invariants.
3. [`/context/progress_tracker.md`](file:///Users/test/Desktop/substreamedu-go/context/progress_tracker.md) — Active phase, currently assigned task, and architectural decision log.
4. Active specification in [`/context/feature_specs/`](file:///Users/test/Desktop/substreamedu-go/context/feature_specs/) (e.g. `54_ai_harness_workflow_modernization.md`).

### Domain-Specific Ingestion:
- **Go Microservices Tasks** (`substreamedu-*-go/`):
  - [`/context/code_standards.md`](file:///Users/test/Desktop/substreamedu-go/context/code_standards.md) (Section 1 & 3) — Go backend standards, error formats, and database rules.
  - [`/context/api_specs/`](file:///Users/test/Desktop/substreamedu-go/context/api_specs/) — Formal OpenAPI service contracts and gateway route mappings.
  - [`/context/expected_load.md`](file:///Users/test/Desktop/substreamedu-go/context/expected_load.md) — System capacity, latency SLAs, and resource bounds.
- **Frontend Client Tasks** (`substreamedu-frontend/`):
  - [`/context/code_standards.md`](file:///Users/test/Desktop/substreamedu-go/context/code_standards.md) (Section 2) — TypeScript/React guidelines and Humble Object pattern.
  - [`/context/ui_context.md`](file:///Users/test/Desktop/substreamedu-go/context/ui_context.md) — Design tokens, typography, bento grid layout rules, and UI anti-patterns.

---

## 2. Core Execution Rules

1. **One Task / Spec at a Time**: Never attempt to tackle multiple feature specs simultaneously. Stick solely to the active spec's boundary.
2. **Machine-Enforced File Boundaries**:
   - Touch only the files explicitly listed under `## Allowed files` in the active spec.
   - Enforced automatically by `.harness/scripts/check-spec-scope.sh`. Violations will fail the build.
3. **Fast-Path Workflow (≤ 100 LOC)**:
   - For micro-fixes, typos, or single-concern bug fixes touching $\le 100$ lines, a full spec is waived.
   - Requires a deterministic failing test (RED) $\to$ minimal fix (GREEN) $\to$ `./verify.sh`.
4. **Tooling Immutability & Anti-Tamper Guard**:
   - AI agents are strictly forbidden from altering compiler configs, linters, or build scripts to force checks to pass (`.golangci.yml`, `tsconfig.json`, `package.json`, `go.mod`, `.harness/*`).
   - Enforced by `.harness/scripts/check-protected-files.sh`.
5. **Task Classification (Ship vs Scout)**:
   - **Ship Tasks**: Deliver production code, migrations, or UI improvements through approved specs.
   - **Scout Tasks**: Research, bug reproduction, architectural discovery. Strictly read-only on source files, delivering output in markdown. Skill: `scout`.
6. **Bug Diagnosis — Feedback Loop First**:
   - Never guess or patch code blindly. Build a single-command reproducible test (unit test or integration script) that turns **RED** before touching implementation code. Skill: `diagnosing-bugs`.
7. **Deep Modules & Design It Twice**:
   - Encapsulate complexity behind clean seams. For non-trivial architectural decisions, formulate 2–3 alternatives at the spec stage before coding. Skill: `codebase-design`.
8. **Never Tear Down Unlanded Work**:
   - Never run destructive git commands (`reset --hard`, `checkout .`, `clean -fd`, `push --force`, `--no-verify`).
   - Monitored and blocked by `.harness/scripts/devin-pre-exec.sh` PreToolUse hook.
9. **Single Definition of Done (`make verify` or `./verify.sh`)**:
   - Every task must pass `./verify.sh` cleanly before being considered complete.
   - Runs anti-tamper check, spec boundary check, Go lint/tests, and Frontend lint/tests.
10. **Progress Tracker Synchronization**:
    - **Start**: Update `In Progress` in `/context/progress_tracker.md`.
    - **Finish**: Move to `Recent Completed` and log ADR.

---

<!-- autopilot:start -->
# SubStreamEdu — Память проекта (Autopilot)

AI-платформа изучения языков по стриминговому медиа (YouTube, фильмы, субтитры SRT/VTT, книги EPUB/TXT) с интервальным повторением FSRS и Telegram-ботом.

## Команды

| Команда | Что делает |
|---------|------------|
| `cd substreamedu-frontend && npm ci` | Установить зависимости фронтенда |
| `cd substreamedu-frontend && npm start` | Запустить фронтенд локально (`:3000`) |
| `./verify.sh` | Полная проверка: anti-tamper, spec-scope, Go vet/tests, Frontend tsc/tests |
| `cd substreamedu-frontend && npm test -- --watchAll=false <путь>` | Запустить один тестовый файл фронтенда |
| `cd substreamedu-dictionary-service-go && go test ./...` | Запустить тесты микросервиса словаря |

## Где что

- `substreamedu-gateway-go/` — единая точка входа (`:8080`), маршрутизация, rate-limit, проверка отозванных JWT в Redis.
- `substreamedu-iam-service-go/` — пользователи, Google OAuth2, выдача JWT, квоты и промокоды (`:3002`, БД `sse_iam`).
- `substreamedu-dictionary-service-go/` — словарь, карточки FSRS (Recognition/Production), экспорт Anki/CSV, AI-перевод и генерация упражнений (`:3003`, БД `substreamedu_dictionary`).
- `substreamedu-media-service-go/` — парсинг SRT/VTT, метаданные YouTube, поиск субтитров SubDL (`:3004`, БД `substreamedu_media`).
- `substreamedu-notification-service-go/` — Telegram-бот, ежедневные карточки, Kafka-консьюмер (`:3005`).
- `substreamedu-frontend/src/` — React 18 + TypeScript SPA (Cinematic Espresso UI, интерактивный плеер, карточки `/learning`, книги `/books`).
- `context/feature_specs/` — спецификации SDD с обязательным списком `## Allowed files`.

## Подводные камни

- `.harness/scripts/check-spec-scope.sh` блокирует сборку, если изменено >100 строк без активной спецификации в `context/feature_specs/` или если затронут файл вне `## Allowed files`.
- `.harness/scripts/check-protected-files.sh` запрещает менять конфиги компиляторов, линтеров и `package.json` / `go.mod` без `ALLOW_PROTECTED_CHANGES=true`.
- Во всех мутирующих маршрутах (`POST`, `PUT`, `PATCH`, `DELETE`) `userId` берётся строго из проверенного JWT-контекста (`c.Get("userId")`), никогда из query/headers.
- Во фронтенде запрещены сырые hex-цвета вне токенов темы Cinematic Espresso (`#0d0c0b`) и UI-эмодзи.

## Окружение

- `JWT_SECRET`, `INTERNAL_SERVICE_KEY` — подпись JWT и ключ межсервисных вызовов.
- `DEEPSEEK_API_KEY`, `GROQ_API_KEY`, `GEMINI_API_KEY` — провайдеры LLM в `substreamedu-dictionary-service-go`.
- `SUBDL_API_KEY`, `YOUTUBE_API_KEY` — внешние источники субтитров и метаданных в `substreamedu-media-service-go`.
- `TELEGRAM_BOT_TOKEN` — токен бота в `substreamedu-notification-service-go`.
- `SRS_GATE_PRODUCTION_CARDS` — флаг гейтинга Production-карточек до освоения Recognition.

## Как здесь работает Autopilot

Сборка ведётся навыком `/autopilot` (`.agents/skills/autopilot/SKILL.md`). Требования, спецификация и таски — в `.autopilot/`.
Прогресс — `.autopilot/dashboard.html`. Требование из `manifest.md` может снять
только пользователь. Прерванную сборку продолжает «продолжи автопилот».

### Правка без автопилота

Мелкий баг или доводка после сборки — обычная сессия, без прогона.

Сначала прочитай:
1. `.autopilot/PROGRESS.md` — что не доделано, известные баги, о чём договорились с пользователем.
2. Что правили после последней сборки — первая строка таблицы в «История git».
3. Только если правка их касается: почему сделано так — `context/progress_tracker.md`; что значат слова — `CONTEXT.md`;
   что именно просили — `manifest.md` в папке сборки (указана в начале `PROGRESS.md`).

После правки:
- коммит — по правилам из «История git»;
- строка в «Правки без автопилота» в `PROGRESS.md`: дата — что — почему;
- починенный пункт из «Не доделано» или «Известные баги» — удали;
- договорились с пользователем о том, что следующая сборка не должна пересматривать, —
  строка в «Договорились», его словами.

### История git

Целиком не читай — бери срез под вопрос:

| Вопрос | Команда |
|---|---|
| что правили после последней сборки | `git log --oneline "$(git log -1 --format=%h --grep='^Autopilot: сборка сдана')"..HEAD -- . ':(exclude).autopilot'` |
| всё, что делали ради требования | `git log --oneline --grep="R02"` |
| история файла | `git log --oneline -10 -- <файл>` |
| когда появился или исчез код | `git log --oneline -S "<фрагмент>"` |
| почему строка такая | `git blame -L <с>,<по> <файл>`, затем `git show <sha>` |
| что внутри коммита | `git show --stat <sha>` |

Срез длиннее ~30 коммитов — отдай его субагенту и возьми выжимку в десять строк.

Коммит: заголовок — что (`fix: даты в одном формате`), тело — почему, трейлер
`--trailer "Requirements: R02"`, если правка касается требования из `manifest.md`.
Заголовок `Autopilot: сборка сдана` пишет только автопилот — по нему находят последнюю сборку.
<!-- autopilot:end -->
