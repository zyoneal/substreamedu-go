# 01 — Установка навыка Autopilot и регистрация воркфлоу

**Требования:** R01, R01.1
**Зависит от:** —
**Зона:** `.agents/skills/autopilot/` · `.agents/workflows/autopilot.md` · `skills-lock.json`
**Волна:** 1
**Ревью:** да — фундамент
**Модель:** сильная

## Что должно заработать

Навык `/autopilot` (`v2.2.1`) из `nick-vels/skills` полностью установлен в `.agents/skills/autopilot/` со всеми фазами, промптами, шаблоном дашборда и скриптом `ap.py`, зарегистрирован в `.agents/workflows/autopilot.md` и зафиксирован в `skills-lock.json`.

## Из брифа, дословно

> «https://github.com/nick-vels/skills/ установи скилы»

## Разделы спецификации

Истории 1–2, Решения §1.

## Критерии приёмки

- [x] В `.agents/skills/autopilot/` присутствуют `SKILL.md`, 16 файлов в `phases/`, 2 файла в `prompts/` и `tools/ap.py`
- [x] В `.agents/workflows/autopilot.md` описан воркфлоу `/autopilot`
- [x] В `skills-lock.json` добавлена запись `autopilot` с источником `nick-vels/skills`
