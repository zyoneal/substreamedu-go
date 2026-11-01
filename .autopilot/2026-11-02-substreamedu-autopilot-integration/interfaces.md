# Границы, швы и правила проекта (`interfaces.md`)

## 1. Правила проекта
- **Стек**: Go 1.26 (`go.work` из 5 микросервисов) + React 18 / TypeScript (`substreamedu-frontend`).
- **Единая команда полной проверки**: `./verify.sh` (запускает `check-protected-files.sh`, `check-spec-scope.sh`, Go `vet`/`test` по всем 5 микросервисам и Frontend `tsc --noEmit` + Jest).
- **Запуск одного теста фронтенда**: `cd substreamedu-frontend && npm test -- --watchAll=false <путь>`.
- **Запуск тестов Go-сервиса**: `cd substreamedu-dictionary-service-go && go test ./...`.
- **Неприкосновенные файлы (`.harness/protected-files`)**: `.golangci.yml`, `go.work`, `*/go.mod`, `substreamedu-frontend/package.json`, `substreamedu-frontend/tsconfig.json`, `.harness/`, `verify.sh`, `Makefile`.
- **Границы спецификации**: Все изменяемые файлы обязаны входить в `## Allowed files` активной спецификации `context/feature_specs/65_autopilot_skill_and_project_integration.md`.

## 2. Границы, решённые в спецификации
1. **Модуль навыка Autopilot (`.agents/skills/autopilot/`, `.agents/workflows/autopilot.md`, `skills-lock.json`)**:
   - Владеет: оркестратором `SKILL.md`, правилами фаз `phases/*.md`, шаблоном `phases/dashboard-template.html`, промптами субагентов `prompts/*.md` и CLI-инструментом `tools/ap.py`.
   - Выставляет наружу: команду `/autopilot` и CLI `python3 .autopilot/ap.py`.
2. **Модуль памяти и словаря проекта (`AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`)**:
   - Владеет: блоком `<!-- autopilot:start --> ... <!-- autopilot:end -->` в `AGENTS.md`, ссылкой `@AGENTS.md` в `CLAUDE.md` и глоссарием домена в `CONTEXT.md`.
   - Гарантирует: 100% сохранность пользовательских правил SDD вне меток Autopilot.
3. **Модуль приборов и состояния сборки (`.autopilot/`, `.gitignore`)**:
   - Владеет: `state.js`, `dashboard.html`, `index.html`, `ap.py`, `README.md`, `PROGRESS.md` и папкой прогона.
   - Шов проверки: `python3 .autopilot/ap.py check-plan` и `./verify.sh`.
