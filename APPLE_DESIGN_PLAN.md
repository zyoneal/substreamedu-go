# План внедрения Apple Design & Fluid Interactions (7 пунктов)

Полная спецификация проекта сохранена в системе спецификаций SDD:
👉 [context/feature_specs/27_apple_design_ui_polish.md](file:///Users/test/Desktop/substreamedu-go/context/feature_specs/27_apple_design_ui_polish.md)

Базовый скилл Apple Design:
👉 [.agents/skills/apple-design/SKILL.md](file:///Users/test/Desktop/substreamedu-go/.agents/skills/apple-design/SKILL.md)

---

## Чеклист реализации

- [x] **Шаг 1: Тактильный `:active` отклик на кнопки и контролы**
  - **Файлы**: `src/components/ui/button.tsx`, `src/components/Header.module.css`, `src/components/HomePage/HomePage.module.css`
  - **Принцип**: WWDC 2018 (Section 1). Мгновенная компрессия на `pointer-down` (`transform: scale(0.97)` / `100ms`).
  - **Цель**: Реакция в момент касания, а не при отпускании; устранение «залипания» hover на мобильных.

- [x] **Шаг 2: Симметричный выход модалок и прерываемость (`AnimatePresence`)**
  - **Файлы**: `src/components/ui/modal.tsx`, `src/components/ui/modal.module.css`, `src/components/shared/TranslationPopover.tsx`
  - **Принцип**: WWDC 2018 (Sections 3 & 7). Симметричные траектории входа/выхода. Прерывание без разрыва скорости.
  - **Цель**: Устранить мгновенное исчезновение (`return null`), добавить плавное закрытие через критически демпфированную пружину (`damping: 1.0, duration: 0.3`).

- [x] **Шаг 3: Минимальный размер тач-таргетов 44×44px**
  - **Файлы**: `src/components/ui/modal.module.css` (close button), `src/components/ui/button.tsx`, `src/components/Header.module.css`
  - **Принцип**: Apple HIG & Section 10. Область касания для пальца минимум 44×44px.
  - **Цель**: Расширить хит-боксы крестиков, компактных кнопок и иконок без визуального искажения верстки.

- [x] **Шаг 4: Поддержка стандартов доступности (Reduced Motion & Reduced Transparency)**
  - **Файлы**: `src/index.css`, `src/components/HomePage/HomePage.module.css`
  - **Принцип**: Section 14. `@media (prefers-reduced-motion: reduce)`, `@media (prefers-reduced-transparency: reduce)`.
  - **Цель**: Отключение 10-секундных фоновых осцилляций (`projectorHum`), замена пружин на быстрые cross-fade, замена размытий на сплошные фоны при включенных опциях доступности ОС.

- [x] **Шаг 5: Мобильное меню в стиле Apple (Bottom Sheet)**
  - **Файлы**: `src/components/Header.tsx`, `src/components/Header.module.css`
  - **Принцип**: Sections 4, 7 & 12. Нижняя шторка с drag-handle, полупрозрачным бэкдропом и жестом свайпа вниз.
  - **Цель**: Заменить резкий выпадающий прямоугольник на нативный bottom-sheet на экранах `< 768px`.

- [x] **Шаг 6: Оптический трекинг и типографика**
  - **Файлы**: `src/typography.css`, `src/index.css`
  - **Принцип**: WWDC 2020 (Section 15). Трекинг зависит от размера: отрицательный — только для крупных заголовков, body — строго около `0`.
  - **Цель**: Убрать `-0.01em` с `.text-body` и `.text-body-lg`, исключив слипание букв в основном тексте.

- [x] **Шаг 7: Прямое манипулирование скраббером таймлайна (1:1 Tracking)**
  - **Файлы**: `src/components/VideoPage/VideoPlayer.tsx`, `src/components/VideoPage/components/VideoControlsOverlay.tsx`, `src/components/VideoPage/css/VideoPlayerPopover.module.css`
  - **Принцип**: Sections 2 & 5. `PointerEvents` + `setPointerCapture`. Непрерывное следование за пальцем.
  - **Цель**: Заменить дискретные клики на непрерывный плавный скраббинг с превью времени над пальцем.
