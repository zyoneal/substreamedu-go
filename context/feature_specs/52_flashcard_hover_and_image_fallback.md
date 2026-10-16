# Spec 52: Flashcard Hover State & Broken Image Fallback Suppression

- **Status**: Completed
- **Owner**: Frontend & UX Engineering
- **Related ADR**: ADR-122
- **Depends On**: Spec 51 (`51_subtitle_video_performance_optimization.md`)

---

## 1. Problem Statement & Scope

During SRS learning sessions (`/learning` and `/review-demo`), two UX issues were identified on `Flashcard.tsx` / `Flashcard.module.css`:
1. **Unwanted Hover Color Inversion on Flashcard**:
   - Hovering over `.ankiCard` triggered `.ankiCard:hover { background: #ffffff; border-color: rgba(10, 10, 10, 0.25); }`, abruptly shifting the card surface from `#eae7e1` to white.
   - The user requested: *"при наведении на карточку не надо изменять цвет"* (do not change color when hovering over the card).
2. **Broken Image Artifacts in Card UI**:
   - When a word's `imageUrl` fails to load (e.g. 404, broken third-party URL, or network error), the browser renders an unsightly broken image box and alt text (`[self-conscious]`).
   - The user requested: *"и если не удается загрузить картинку, то на юае ничего не показывать"* (if the image fails to load, do not show anything in the UI).

This specification eliminates hover color mutation on `.ankiCard` and implements robust error suppression for flashcard images so failed image loads leave no visual footprint.

---

## 2. Technical & Visual Requirements

1. **Static Surface Stability (`Flashcard.module.css`)**:
   - Remove background and border-color mutations on `.ankiCard:hover`.
   - Ensure the card background remains steadfastly `#eae7e1` with consistent `rgba(10, 10, 10, 0.12)` border across all hover states.

2. **Graceful Broken Image Suppression (`Flashcard.tsx`)**:
   - Introduce `imageFailed` state (`useState(false)`), resetting to `false` whenever `imageUrl` prop changes.
   - Guard image rendering with `Boolean(imageUrl && imageUrl.trim() && !imageFailed)`.
   - On `<img>` `onError`, set `imageFailed = true` to immediately unmount the `.imageSection` container and image.
   - Use `alt=""` to avoid rendering decorative broken text boxes before/during error handling.

---

## 3. Implementation Rules & Strict File Boundaries

Touch **only** the following files:
- `context/feature_specs/52_flashcard_hover_and_image_fallback.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/components/LearningPage/Flashcard.module.css`
- `substreamedu-frontend/src/components/LearningPage/Flashcard.tsx`
- `substreamedu-frontend/src/components/LearningPage/Flashcard.test.tsx`

---

## 4. Verification Checklist

1. `npm test -- src/components/LearningPage --watchAll=false` passes cleanly.
2. `npx tsc --noEmit` produces 0 errors.
3. `npx eslint src/components/LearningPage/Flashcard.tsx` produces 0 errors/warnings.
