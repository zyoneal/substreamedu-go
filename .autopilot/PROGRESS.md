<!-- autopilot:progress -->
# SubStreamEdu — что осталось

Последняя сборка: `.autopilot/2026-11-02-substreamedu-autopilot-integration/` — Установлен навык Autopilot v2.2.1 и настроен контур памяти, глоссария и дашборда для SubStreamEdu.

## Договорились — не пересматривать

- Все изменения свыше 100 строк обязаны сопровождаться спецификацией в `context/feature_specs/` со списком `## Allowed files` (`.harness/scripts/check-spec-scope.sh`).
- Конфигурационные файлы из `.harness/protected-files` (`.golangci.yml`, `go.work`, `go.mod`, `package.json`, `tsconfig.json`, `verify.sh`) неприкосновенны для агентов.
- Визуальная система фронтенда — строго Warm Cinematic Espresso (`#0d0c0b`, шрифты `e-Ukraine` и `JetBrains Mono`, без UI-эмодзи и сырых hex-цветов).
- Все мутирующие маршруты микросервисов извлекают `userId` строго из проверенного JWT-контекста.

## Не доделано

—

## Известные баги

—

## Правки без автопилота

<!-- дата — что — почему; пишет обычная сессия, следующая сборка разбирает -->
- 2026-11-02 — Spec 66: декомпозиция `HomePage.tsx` (1074 → 227 строк, Humble Object), интерактивный `Grammar Spotlight` + `3x Repeat` + клавиатурная доступность в `HeroCinemaPlayer`, добавление `/books` в демо-док, исправление контраста `.btnPrimary` и полировка по скиллам `emil-design-eng`, `landing-page-design`, `unslop`, `react-conventions`, `ub-mode` — комплексный аудит и доведение главной страницы до идеала.
- 2026-11-02 — Spec 67: декомпозиция `DashboardPage.tsx` (495 → 90 строк, Humble Object + `useDashboardData.ts` + `dashboardUtils.ts` + `DashboardFormatCards.tsx` + `DashboardTelemetryCards.tsx`), починка 1-клик продолжения просмотра видео (`/videos?videoUrl=...`), локализация счётчиков карточек `to review`/`new`, перевод `WelcomeModal.tsx` с инлайн-стилей на CSS Modules с `role="dialog"` и закрытием по `Escape`, гейтинг `:hover` и `prefers-reduced-motion` в `DashboardPage.module.css`.
- 2026-11-02 — Spec 68: полный редизайн `/books` (`BooksCatalogPage.tsx`, `BookContinueDesk.tsx`, `BookFolioCard.tsx`, `BooksCatalog.module.css`, `BookReader.module.css`) в стиле Pixzen Literary Studio — устранено обрезание шапки фиксированным навбаром (`padding-top: 96px`), добавлен герой-блок Reading Desk с живым превью главы, карточки переведены на 3D-обложки книг с корешком (`.bookSpineCrease`) и умным футером (прогресс-бар только при `percentage > 0`), `BooksCatalogPage.tsx` декомпозирован до 249 строк (Humble Object).
- 2026-11-02 — Fast-fix навигации после прохождения карточек (`Flashcards.tsx`, `Header.tsx`) — добавлена кнопка `Back to Dashboard` на экран завершения карточек и исправлено скрытие верхнего меню навигации в `Header.tsx`, когда `substreamedu_onboarding_completed` не задан в `localStorage` вне режима `?onboarding=true`.
- 2026-11-02 — Fast-fix вёрстки телеметрии и панели фильтров на `/dictionary` (`DictionaryPage.tsx`, `DictionaryPage.test.tsx`) — восстановлены классы CSS Modules (`.statsGrid`, `.statCard`, `.controlsContainer`, `.categoryFilterList`, `.rightActionsGroup`, `.mainContentArea`, `.groupsListWrapper`) и отображение табов фильтрации источников (`filterCategories`), слетевшие при декомпозиции в Spec 58.
- 2026-11-03 — Spec 69: перевод страницы коллекции словаря `/dictionary/resources/:resourceName` (`DictionaryItemsPage.tsx`, `DictionaryItemsPage.module.css`) на светлую тему Pixzen Monochrome Editorial (`usePixzenTheme()`, фон `#f5f3ef`, карточки `#eae7e1`, текст `#0a0a0a`) и декомпозиция `DictionaryItemsPage.tsx` (564 → 233 строки, Humble Object + `useDictionaryItemsSession.ts` + `DictionaryTermsList.tsx`).


