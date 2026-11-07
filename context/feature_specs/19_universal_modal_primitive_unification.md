# Feature Specification: Universal Modal Primitive & Elimination of Dialog Duplication

## Metadata
- **Spec ID**: 19
- **Related Spec**: 04 (Design Token Unification), 12 (VideoPlayer Modals Decomposition)
- **Author**: Senior Systems & Frontend Engineer
- **Status**: Active
- **Target Files**:
  - `substreamedu-frontend/src/components/ui/modal.tsx` (New)
  - `substreamedu-frontend/src/components/ui/modal.module.css` (New)
  - `substreamedu-frontend/src/components/ui/modal.test.tsx` (New)
  - `substreamedu-frontend/src/components/PremiumLimitModal.tsx`
  - `substreamedu-frontend/src/components/DictionaryPage/DictionaryPage.tsx`
  - `substreamedu-frontend/src/components/TextPasteHighlighter/TextPasteHighlighter.tsx`

---

## 1. Problem Statement
Across the frontend codebase, modal dialogs are reimplemented from scratch in over 12 locations (`PremiumLimitModal`, `DictionaryPage`, `TextPasteHighlighter`, `AdminDashboard`, `FilmSelectionModal`, `SubtitleSearchModal`, `LessonStudioModal`, `ReelGeneratorModal`, `GrammarSpotlightModal`, `VideoGrammarIndexModal`, `StreakShareModal`, `LoginPage`).

Each implementation duplicates:
1. **Escape Key Handling**: `useEffect` listeners binding/unbinding `window.addEventListener('keydown', ...)` for `e.key === 'Escape'`.
2. **Backdrop & Overlay Click Blocking**: Manual `<div className={...} onClick={onClose}><div onClick={e => e.stopPropagation()}>`.
3. **Portal Inconsistency**: Some components render inline or omit `createPortal(..., document.body)`, leading to clipping in `overflow: hidden` containers and `z-index` stacking context bugs.
4. **Body Scroll Lock**: Inconsistent or absent `overflow: hidden` on `document.body` during open modal states, causing background page scrolling under modal dialogs.
5. **A11y Deficiencies**: Inconsistent or missing `role="dialog"`, `aria-modal="true"`, and accessible close buttons.
6. **Token & Animation Inconsistency**: Duplicated keyframes (`fadeIn`, `modalScaleUp`), hardcoded hex colors, and divergent corner radii conflicting with `context/ui_context.md`.

---

## 2. Proposed Architecture & Component Seams

### A. Universal Modal Primitive (`src/components/ui/modal.tsx`)
A composable, accessible, portal-backed modal compound component adhering to Rule 10 (Humble Object), Rule 12 (Accessibility), and Rule 13 (Component Size $\le 250$ lines).

**Compound API**:
```tsx
<Modal isOpen={isOpen} onClose={onClose} size="sm" | "md" | "lg" | "xl" ariaLabel="Dialog Title">
  <Modal.Header title="Title" subtitle="Description" icon={<Icon />} onClose={onClose} />
  <Modal.Body>{children}</Modal.Body>
  <Modal.Footer>{buttons}</Modal.Footer>
</Modal>
```

**Convenience Primitive**:
```tsx
<ConfirmModal
  isOpen={isOpen}
  onClose={onClose}
  onConfirm={onConfirm}
  title="Confirm Action"
  message="Are you sure?"
  confirmText="Confirm"
  cancelText="Cancel"
  variant="primary" | "danger"
/>
```

**Core Responsibilities of `Modal`**:
- Auto-portal to `document.body` via `createPortal`.
- Auto-locks `document.body.style.overflow = 'hidden'` when mounted, restoring on unmount.
- Global `Escape` keyboard event handler with proper cleanup.
- Standard backdrop with Warm Cinematic Espresso tokens (`--color-canvas`, `--color-surface-elevated`, `--color-hairline`).
- Standard GPU-accelerated enter animation (`300ms cubic-bezier(0.16, 1, 0.3, 1)`).
- Full a11y compliance (`role="dialog"`, `aria-modal="true"`).

---

## 3. Implementation Rules & Migration Strategy
1. **Zero UI/Functional Regression**: Modal open/close behavior, edit workflows in `DictionaryPage`, confirmation dialogs in `TextPasteHighlighter`, and upgrade CTAs in `PremiumLimitModal` must function identically or better.
2. **Design System Alignment**: Strictly use tokens from `src/index.css` and `context/ui_context.md` (no pure `#000`, no AI emojis, crisp `lucide-react` icons).
3. **Strict File Size Limits**: Keep all components $\le 250$ lines per Rule 13.
4. **Comprehensive Unit Testing**: Establish unit test suite `src/components/ui/modal.test.tsx` verifying portal rendering, Escape key handling, backdrop click, and compound subcomponents.

---

## 4. Verification Checklist
- [ ] `modal.tsx` compound component created with `Modal`, `ModalHeader`, `ModalBody`, `ModalFooter`, `ConfirmModal`.
- [ ] `modal.module.css` created with design tokens and smooth GPU animations.
- [ ] `modal.test.tsx` passes 100% with comprehensive coverage.
- [ ] `PremiumLimitModal.tsx` migrated to use `Modal`.
- [ ] `DictionaryPage.tsx` (`renderEditWordModal`) migrated to use `Modal`.
- [ ] `TextPasteHighlighter.tsx` confirm and alert overlays migrated to use `ConfirmModal` / `Modal`.
- [ ] All existing frontend tests pass (`npm test -- --watchAll=false`).
- [ ] Production build succeeds (`npm run build`).
- [ ] `context/progress_tracker.md` updated with ADR-075.
