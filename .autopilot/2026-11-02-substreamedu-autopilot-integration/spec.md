# Спецификация: Интеграция навыка Autopilot (`nick-vels/skills`) в SubStreamEdu

## Задача
Установить навык разработки `autopilot` из репозитория `https://github.com/nick-vels/skills/` и применить его оркестрацию, память проекта, словарь домена и приборы контроля сборки к монорепозиторию SubStreamEdu без нарушения существующих правил SDD и `.harness/`.

## Решение
В проекте появляется полный набор инструментов `/autopilot` (`v2.2.1`): навык и фазовые инструкции в `.agents/skills/autopilot/`, воркфлоу в `.agents/workflows/autopilot.md`, запись в `skills-lock.json`, размеченный блок памяти в `AGENTS.md` со ссылкой из `CLAUDE.md`, расширенный словарь терминов домена в `CONTEXT.md`, а также живой автономный дашборд `.autopilot/dashboard.html` и файл состояния `.autopilot/PROGRESS.md`.

## Истории

| # | Метка | История | Приёмка |
|---|-------|---------|---------|
| 1 | R01 | Как разработчик, я вызываю `/autopilot`, чтобы вести разработку фич от брифа до слепой приёмки | `.agents/skills/autopilot/SKILL.md`, `phases/*`, `prompts/*`, `tools/ap.py`, `.agents/workflows/autopilot.md` и `skills-lock.json` установлены |
| 2 | R01.1 | …и при установке не нарушаются существующие навыки и `check-protected-files.sh` | `./verify.sh` проходит без ошибок |
| 3 | R02 | Как AI-агент следующей сессии, я сразу вижу команды проверки, архитектуру, подводные камни и язык домена SubStreamEdu | блок `<!-- autopilot:start -->` в `AGENTS.md`, указатель `@AGENTS.md` в `CLAUDE.md`, термины с `_Избегать_` в `CONTEXT.md` |
| 4 | R02.1 | …и ни одна строка существующих правил `AGENTS.md` и `CONTEXT.md` не потеряна | существующие разделы SDD и глоссария сохранены дословно |
| 5 | R03 | Как пользователь, я открываю `.autopilot/dashboard.html` и `.autopilot/PROGRESS.md`, чтобы видеть статус требований, гейтов G1–G4 и тестов | `ap.py check-plan` (G3), `coverage` (G2), `blind` (G4), `tests` и `PROGRESS.md` заполнены и проверены |

## Решения по реализации
- **Установка навыка (R01)**: Полное дерево `skills/autopilot/` из `nick-vels/skills` (`v2.2.1`) копируется в `.agents/skills/autopilot/`, регистрируется в `skills-lock.json` с SHA-256 хешем и экспортируется в `.agents/workflows/autopilot.md`.
- **Память и глоссарий (R02)**: В конец `AGENTS.md` добавляется изолированный блок `<!-- autopilot:start --> ... <!-- autopilot:end -->` с проверенными командами и правилами работы без автопилота; создаётся однострочный `CLAUDE.md` (`@AGENTS.md`); `CONTEXT.md` дополняется разделом единого языка проекта (`Лексема`, `Карточка распознавания`, `Карточка воспроизведения`, `FSRS`, `Режим активного аудирования`, `Ресурс`, `Transactional Outbox`, `Humble Object`).
- **Приборы и верификация (R03)**: В `.autopilot/` разворачиваются `dashboard.html`, `index.html`, `ap.py`, `README.md`, `PROGRESS.md` и прогон `2026-11-02-substreamedu-autopilot-integration`, фиксирующий прохождение гейтов G1–G4 и полного тестового прогона `./verify.sh`.

## Границы и швы
См. `interfaces.md`.

## Вне рамок
| Требование | Почему не сейчас |
|---|---|
| — | Все требования брифа входят в текущую сборку |

## Открытые места
Заглушек и пустых обязательных переменных нет.
