# Разведка кодовой базы SubStreamEdu (`notes.md`)

## 1. Стек и структура репозитория
- **Go 1.26 Microservices (`go.work`)**:
  - `substreamedu-gateway-go` (`:8080`) — входной шлюз, маршрутизация, rate-limit, проверка отозванных JWT в Redis.
  - `substreamedu-iam-service-go` (`:3002`) — аутентификация, OAuth2, JWT, лимиты и промокоды.
  - `substreamedu-dictionary-service-go` (`:3003`) — лексемы, интервальное повторение FSRS v4 (Recognition/Production карточки), AI-перевод и генерация упражнений, экспорт Anki/CSV, Transactional Outbox в Kafka.
  - `substreamedu-media-service-go` (`:3004`) — парсинг субтитров SRT/VTT, метаданные YouTube, поиск субтитров SubDL.
  - `substreamedu-notification-service-go` (`:3005`) — Telegram-бот, ежедневные карточки, Kafka-консьюмер.
- **Frontend (`substreamedu-frontend/`)**:
  - React 18, TypeScript, Tailwind CSS + CSS Modules, тема **Warm Cinematic Espresso** (`#0d0c0b`, шрифты `e-Ukraine` и `JetBrains Mono`).
  - Архитектурный паттерн **Humble Object**: доменная логика вынесена в хуки (`useVideoSubtitles`, `useFlashcardsSession`, `useDictionaryData`) и чистые утилиты (`textUtils.tsx`, `dictionaryUtils.tsx`, `storyHighlightUtils.ts`).

## 2. Существующие охранные механизмы (`.harness/`)
- `.harness/scripts/check-protected-files.sh` — запрещает изменять конфигурационные файлы сборки и линтеров из `.harness/protected-files`.
- `.harness/scripts/check-spec-scope.sh` — проверяет, что все затронутые файлы входят в `## Allowed files` активной спецификации в `context/feature_specs/`.
- `./verify.sh` — единая команда Definition of Done (protected-files + spec-scope + Go vet/test + Frontend tsc/test).

## 3. Точки интеграции Autopilot
- Навыки проекта живут в `.agents/skills/<name>/` и фиксируются в `skills-lock.json`; воркфлоу живут в `.agents/workflows/<name>.md`.
- Память проекта находится в `AGENTS.md`, глоссарий — в `CONTEXT.md`. Оба файла уже содержат правила проекта, поэтому Autopilot обязан сохранить существующий текст неприкосновенным и записывать свой блок строго внутри маркеров `<!-- autopilot:start --> ... <!-- autopilot:end -->`.
