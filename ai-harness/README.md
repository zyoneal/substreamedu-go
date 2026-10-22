# ai-harness

> Переносимый, детерминированный AI-харнес для автономных агентов (**Devin**, **GPT-6 / Luna High Thinking**) в микросервисной архитектуре (**Java / Gradle** и **Python / uv**).

---

## 🎯 Что решает этот харнес

Обычные текстовые промпты (`AGENTS.md`) для AI-агентов имеют 4 критических изъяна в корпоративных микросервисах:
1. **Правила не проверяются машиной**: Агент нарушает лимиты строк, меняет чужие файлы или ослабляет линтер, если это не блокируется скриптами.
2. **Context Blowup (> 16 KiB)**: Devin автоматически загружает только первые **16 KiB** `AGENTS.md`. Огромные файлы правил просто обрезаются.
3. **Конфликты в Git при работе команды**: Единые файлы-монолиты (вроде общего трекера) вызывают merge-конфликты в каждом PR.
4. **Случайные мутации инфраструктуры**: Команды вроде `git reset --hard`, `git push --force`, `pkill`, удаление чужих докеров.

**ai-harness** решает эти проблемы через:
- **Core + Stacks**: Легковесное универсальное ядро (< 10 KiB) + специализированные стековые паки (`java`, `python`).
- **Спецификации с жесткими границами (`Allowed files`)**: Скрипт `check-spec-scope.sh` детерминированно проверяет git diff и ломает билд, если агент вышел за рамки спеки.
- **Fast-path (≤ 100 LOC)**: Мелкие фиксы и баги идут без бюрократии по циклу Red → Green, но строго до 100 строк.
- **Защита конфигов от правок (Anti-Tamper Guard)**: Скрипт `check-protected-files.sh` запрещает агенту ослаблять `build.gradle`, `pom.xml`, `checkstyle.xml`, `ruff.toml` и правила харнеса.
- **Devin PreToolUse Hooks**: `.devin/hooks.v1.json` перехватывает вызовы `exec` и блокирует опасные команды (`git reset --hard`, `pkill`, `--no-verify`).
- **One-Command Definition of Done**: `.harness/verify.sh` — единый критерий готовности задачи как для агента локально, так и в CI/CD пайплайне.

---

## 📂 Структура репозитория

```text
ai-harness/
├── core/
│   ├── AGENTS.core.md            # Универсальные правила поведения агента (< 8 KiB)
│   ├── AGENTS.project.tmpl       # Шаблон заголовка AGENTS.md под конкретный сервис
│   ├── protected-files           # Список файлов, защищенных от изменения агентом
│   ├── scripts/
│   │   ├── check-spec-scope.sh   # Проверка diff против Allowed files из спеки (или <=100 LOC)
│   │   ├── check-protected-files.sh # Блокировка попыток ослабить линтеры/билд
│   │   └── devin-pre-exec.sh     # Devin PreToolUse hook (блокирует git reset, pkill и др.)
│   ├── templates/
│   │   ├── spec.md               # Шаблон спецификации задачи (один файл на тикет)
│   │   ├── adr.md                # Шаблон архитектурного решения
│   │   ├── scout-report.md       # Шаблон отчета для read-only задач исследования
│   │   ├── cross-service-request.md # Handoff-запрос при необходимости изменений в другом сервисе
│   │   └── devin-hooks.json      # Конфигурация хуков Devin (.devin/hooks.v1.json)
│   └── skills/                   # 9 инженерных навыков по стандарту Agent Skills
│       ├── spec-writer           # Составление спеки с границами Allowed files
│       ├── fast-fix              # Быстрый путь Red -> Green для правок <= 100 строк
│       ├── diagnosing-bugs       # Поиск корня бага через воспроизводимый feedback loop
│       ├── tdd                   # Seam-based TDD (JUnit 5 / pytest)
│       ├── review-diff           # Поиск реальных багов в diff (== vs equals, None, транзакции)
│       ├── security-audit        # Report-only аудит безопасности (OWASP, SQLi, SSRF)
│       ├── codebase-design       # Проектирование deep modules и чистых швов
│       ├── cross-service-change  # Протокол межсервисных контрактов без правок чужих репо
│       └── scout                 # Read-only исследовательские задачи
├── packs/
│   ├── java/                     # Пак для Java (Gradle, Spring Boot / Micronaut)
│   │   ├── rules/java.md         # Правила: слойность ArchUnit, JPA N+1, Testcontainers
│   │   ├── verify.sh             # DoD: spotlessCheck + checkstyle + test
│   │   ├── blueprint.yaml.tmpl   # Devin Blueprint: JDK 21, кэширование Gradle, knowledge
│   │   └── pack.env              # Команды сборщика для AGENTS.md
│   └── python/                   # Пак для Python (uv, FastAPI, SQLAlchemy)
│       ├── rules/python.md       # Правила: Ruff, Mypy strict, import-linter, asyncio, pytest
│       ├── verify.sh             # DoD: ruff check/format + mypy + import-linter + pytest
│       ├── blueprint.yaml.tmpl   # Devin Blueprint: Python 3.12, uv sync, knowledge
│       └── pack.env              # Команды сборщика для AGENTS.md
└── install.sh                    # Скрипт быстрой установки харнеса в любой репозиторий
```

---

## 🚀 Установка в сервис на работе

Скрипт `install.sh` разворачивает харнес в целевой репозиторий за 1 секунду.

### Для Java / Gradle микросервиса:
```bash
cd /path/to/my-company-java-service
/path/to/ai-harness/install.sh --pack java --name payment-service
```

### Для Python микросервиса:
```bash
cd /path/to/my-company-python-service
/path/to/ai-harness/install.sh --pack python --name recommendation-service
```

### Что появится в целевом репозитории:
1. `AGENTS.md` — файл < 12 KiB с командами, правилами и стековой спецификой (Devin читает его автоматически).
2. `.harness/` — скрипты верификации (`verify.sh`, `check-spec-scope.sh`, `check-protected-files.sh`) и шаблоны.
3. `.agents/skills/` — 9 готовых навыков для Devin (`@skills:spec-writer`, `@skills:fast-fix`, `@skills:tdd`, и др.).
4. `.devin/hooks.v1.json` — PreToolUse хук, блокирующий деструктивные команды.
5. `.devin/blueprint.yaml` — профиль окружения Devin (JDK/Python, прогрев кэша, команды knowledge).
6. `docs/` — изолированная структура документации (`specs/`, `contracts/`, `adr/`, `scout/`, `ai/`).

---

## 🤖 Как работать с Devin и GPT-6 / Luna High Thinking

### 1. Обычная задача / Фича (Ship Task):
```text
Devin, реализуй тикет PROJ-452. Начни с составления спеки @skills:spec-writer
```
1. Devin исследует код и заполняет `docs/specs/PROJ-452-slug.md` с точным списком `## 4. Allowed files`.
2. Вы подтверждаете спеку.
3. Devin пишет тесты через `@skills:tdd` и реализует функциональность.
4. Devin запускает `.harness/verify.sh`. Скрипт проверяет, что:
   - Никакие файлы линтеров/билда не были ослаблены.
   - Diff строго укладывается в `Allowed files` из спеки.
   - Тесты, линтер и статический анализ зеленые.

### 2. Мелкий фикс / Багдо 100 строк (Fast-Path):
```text
Почини NPE при парсинге пустых метаданных заказа @skills:fast-fix
```
Devin создает воспроизводящий падающий тест (RED), вносит минимальный фикс (GREEN) и прогоняет `.harness/verify.sh`.

### 3. Исследование / Аудит (Scout Task):
```text
Devin, изучи как у нас работает ретрай в Kafka-консьюмере при падении БД @skills:scout
```
Devin работает в строго **read-only** режиме, ничего не коммитит в код и отдает отчет в `docs/scout/`.

### 4. Проверка PR / Diff перед мерджем:
```text
Проверь ветку на скрытые баги @skills:review-diff origin/main
```
Devin проверяет семантику `==` vs `.equals()`, утечки транзакций, пропущенный `await` и silent fallback exceptions.
