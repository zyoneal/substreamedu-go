# SubStreamEdu: Feature Backlog (по итогам анализа форума Language Reactor)

> Источник инсайтов: [forum.languagelearningwithnetflix.com](https://forum.languagelearningwithnetflix.com/c/request/15) (категория Request).
> Отфильтровано специально под **изучение английского языка** и архитектуру веб-платформы **SubStreamEdu** (без языковой специфики CJK/DE/RTL и без out-of-scope фич вроде браузерных расширений или серверного перекодирования видео).

---

## P1 — Высокий приоритет (максимальный импакт на обучение и удержание)

- [x] **1. Кастомные фильтры SRS-сессии (`/learning`)**
  - **Запрос с форума:** [Customization to Focus Only on Words/Sentences/Items Saved (44 likes)](https://forum.languagelearningwithnetflix.com/t/additional-phrasepump-features-customization-to-focus-only-on-words-saved-sentences-saved-items-saved-in-the-phrasepump-settings-menu/14085)
  - **Что сделать:**
    - Добавить выбор режима/фильтра перед или внутри сессии `/learning`: все карточки к повторению, только из конкретного видео/книги (`resource_name`), только одиночные слова vs только фразы/идиомы, или конкретная категория словаря.
    - Поддержать query-параметры в `GET /srs/today` (`dictionary-service`) и UI-переключатель в `LearningPage`.

- [x] **2. Клик по слову в словаре -> прыжок к нужному таймкоду в видео**
  - **Запрос с форума:** Click-to-play saved item from vocabulary list
  - **Что сделать:**
    - Сохранять `timestamp_sec` (или `cue_start_ms`) при добавлении слова/фразы из видео (`POST /translated`).
    - В `DictionaryPage` / `DictionaryItemsPage` добавить кнопку перехода к моменту в видео (`/videos?videoUrl=...&t=...`) — плеер уже умеет читать `&t=`.

- [x] **3. Авто-пауза после каждой реплики и режим авто-повтора (Loop)**
  - **Запрос с форума:** [Auto repeat playback without pressing S key (20 likes)](https://forum.languagelearningwithnetflix.com/t/auto-repeat-playback-without-pressing-s-key/11897), [Autorepeat (6 likes)](https://forum.languagelearningwithnetflix.com/t/autorepeat/7901)
  - **Что сделать:**
    - В `VideoControlsOverlay.tsx` добавить 2 компактных переключателя:
      - **Auto-Pause:** автоматически ставить видео на паузу в конце каждого субтитра (удобно для shadowing и чтения).
      - **Auto-Loop:** автоматически зацикливать текущий субтитр до перехода пользователя дальше.

- [x] **4. Фильтрация Closed Captions (`[music]`, `(laughs)`, имена спикеров)**
  - **Запрос с форума:** [Filtering out closed captions (6 likes)](https://forum.languagelearningwithnetflix.com/t/filtering-out-closed-captions-probably-trivial-and-extremely-useful-feature-to-implement/9042), [Remove all text between brackets (6 likes)](https://forum.languagelearningwithnetflix.com/t/implement-a-way-to-remove-all-text-between-brackets/8696)
  - **Что сделать:**
    - Опция очистки служебных ремарок `[...]`, `(...)`, `♪ ... ♪` и префиксов вроде `SPEAKER:` при отображении субтитров и в режиме Auto-Pause (чтобы плеер не стопорился на `[sighs]`).

- [x] **5. Расширенный контекст для AI-перевода и грамматического разбора**
  - **Запрос с форума:** [Enhanced Context Analysis for Lexa AI (19 likes)](https://forum.languagelearningwithnetflix.com/t/enhanced-context-analysis-for-lexa-ai/28046)
  - **Что сделать:**
    - В `useSubtitleTranslation` / `useWordTooltip` передавать на бэкенд (`POST /translation/prod`, `POST /grammar/analyze`) не только текущую строку субтитров, но и 1–2 соседние реплики (prev/next cue), т.к. в авто-субтитрах YouTube предложения часто разорваны на несколько строк.

- [x] **6. Свои заметки, мнемоники и кастомное определение для сохранённого слова**
  - **Запрос с форума:** [Add custom definition for a saved word (6 likes)](https://forum.languagelearningwithnetflix.com/t/wip-request-add-custom-definition-for-a-saved-word/8129), [On words note (5 likes)](https://forum.languagelearningwithnetflix.com/t/on-words-note/15898)
  - **Что сделать:**
    - Добавить поле `user_note` / `custom_definition` в таблицу словаря (`dictionary-service` миграция).
    - Разрешить редактировать заметку в поповере, в словаре (`DictionaryEditModal`) и показывать её на обороте флеш-карточки в `/learning` и при экспорте в Anki/CSV.

- [x] **7. Массовый импорт слов (CSV / TXT / список)**
  - **Запрос с форума:** [IMPORT WORDS (14 likes)](https://forum.languagelearningwithnetflix.com/t/import-words/9851)
  - **Что сделать:**
    - Добавить эндпоинт импорта списка английских слов (CSV или построчный текст) с батчевым созданием карточек и дедупликацией в `dictionary-service`, плюс модалку импорта на `/dictionary`.

---

## P2 — Средний приоритет (полировка плеера, словаря и UX)

- [x] **8. Цветовая градация слов по SRS-статусу в субтитрах и книгах**
  - **Запрос с форума:** [I really want colored words back (29 likes)](https://forum.languagelearningwithnetflix.com/t/i-really-want-colored-words-back/9438)
  - **Что сделать:**
    - Разделять визуально в `SubtitleOverlay` и `BookContent`:
      - `new` / `learning` (в процессе изучения — тёплый янтарный акцент),
      - `mastered` / `known` (выучено — спокойный приглушённый/зелёный индикатор или отключаемая подсветка).

- [x] **9. Ускорение видео в паузах без субтитров (Skip/Speed-up silence)**
  - **Запрос с форума:** [Ability to speed up video while no subtitles are being played (5 likes)](https://forum.languagelearningwithnetflix.com/t/ability-to-speed-up-video-while-no-subtitles-are-being-played/7322)
  - **Что сделать:**
    - Переключатель в настройках плеера: если до следующего субтитра > 2.5–3 сек, временно поднимать `playbackRate` (например, до `2.0x`) и возвращать обратно к базовой скорости перед началом следующей реплики.

- [x] **10. Опция отключения лемматизации при сохранении (точная словоформа)**
  - **Запрос с форума:** [Disable lemmatization (6 likes)](https://forum.languagelearningwithnetflix.com/t/disable-lemmatization/17720)
  - **Что сделать:**
    - Переключатель «Сохранять точную форму слова / базовую форму (лемму)», чтобы при желании можно было учить конкретную форму или фразу (например, `took off` отдельно от `take off`).

- [x] **11. Отключение клавиатурных шорткатов и настройка фона субтитров**
  - **Запрос с форума:** [Option to Disable Shortcuts (13 likes)](https://forum.languagelearningwithnetflix.com/t/option-to-disable-shortcuts/7429), [Add opacity subtitle background setting (8 likes)](https://forum.languagelearningwithnetflix.com/t/add-opacity-subtitle-background-setting/20342)
  - **Что сделать:**
    - Чекбокс отключения горячих клавиш плеера (полезно при вводе заметок или на нестандартных раскладках).
    - Слайдер прозрачности подложки субтитров и размера шрифта прямо в настройках плеера (сохранение в `localStorage`).

- [x] **12. Режим «Только субтитры» (быстрое скрытие перевода/подсказок)**
  - **Запрос с форума:** [Subtitle only mode](https://forum.languagelearningwithnetflix.com/t/bring-back-subtitle-only-mode/356)
  - **Что сделать:**
    - Быстрый тумблер скрытия всех подсказок, грамматических бейджей и перевода, оставляя только чистый английский текст субтитров поверх видео.

---

## Что уже реализовано (для справки)
- Мультисловное выделение и сохранение фраз (`SubtitleOverlay`, `BookContent`).
- Импорт и чтение книг EPUB / TXT с прогрессом и кликом по слову (`/books`).
- Режимы `Blur` (Ghost-to-Ink) и `Delay` в видеоплеере, повтор фразы (`3x`).
- Экспорт в Anki `.apkg` и CSV с картинками-ассоциациями и озвучкой слов.
- Группировка словаря по ресурсам (видео/книги) и категориям.
- Мобильное повторение через Telegram-бота и адаптивный веб.
