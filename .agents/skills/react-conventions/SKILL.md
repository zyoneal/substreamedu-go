---
name: react-conventions
description: |
  React component architecture, hook rules, performance idioms, Humble Object separation, and effect discipline. Apply when developing or refactoring React components, custom hooks, and pages.

  Use this skill to:
  - Structure components cleanly according to the Humble Object pattern.
  - Apply hooks correctly (top-level rules, dependency arrays, custom hook naming).
  - Eliminate redundant or dangerous useEffect usages (deriving state, event-driven effects).
  - Enforce accessible markup, async action loading states, and keyboard support.
  - Optimize renders with React.memo, useMemo, and useCallback only where measured.

  Do NOT use this skill for:
  - Backend Go development.
  - Pure styling token audits (consult ui_context.md).
user-invocable: false
paths: ["src/**/*.tsx", "src/**/*.ts"]
---

# React Conventions & Component Architecture

This skill defines the architectural standards for React components and hooks in this repository, enforcing clean separation, predictable renders, and adherence to senior engineering patterns.

---

## 1. Architectural Seams: The Humble Object Pattern

Components must remain thin display layers. Never mix business logic, direct network queries, and JSX layout in the same file:

```
src/components/Feature/
├── Feature.tsx             # Thin view layer: binds UI state to JSX markup
├── Feature.module.css      # Scoped styling (strictly under 200 lines)
├── Feature.test.tsx        # Component tests (RTL + userEvent)
├── useFeatureLogic.ts      # Pure React hook: state, handlers, form validation
└── featureService.ts       # Service layer: Axios/Fetch calls, API error handling
```

### Component Invariants:
- **Zero Business Logic in `.tsx`**: Calculations, data transformations, and validation regex live in hooks or pure `.logic.ts` utilities.
- **Zero Raw Network Calls in `.tsx`**: HTTP calls live exclusively in `*Service.ts`.
- **Loading & Disabled States**: Every interactive control triggering an async action MUST display a loading indicator and be disabled during in-flight requests (Rule 11).

---

## 2. Rules of Hooks & Custom Hooks

### Rules of Hooks:
1. Only call hooks at the **top level** of function components or custom hooks.
2. Never call hooks inside loops, conditions, or nested functions.
3. Custom hooks must always begin with the `use` prefix (e.g., `useVideoSync`, `useSubtitleSearch`).

### Dependency Arrays:
- Trust and honor the `eslint-plugin-react-hooks/exhaustive-deps` rule.
- If a linter warning appears, fix the dependency array or stabilize references with `useCallback`/`useMemo`.
- **Never disable `exhaustive-deps` with inline comments.**

```tsx
// ✅ Stabilize callback references when passed to memoized children or dependencies
const handleSelectSubtitle = useCallback((trackId: string) => {
  setActiveTrackId(trackId);
  onTrackChange?.(trackId);
}, [onTrackChange]);
```

---

## 3. Effects: When (and When NOT) to Use `useEffect`

`useEffect` is designed exclusively for synchronizing with **external systems** (DOM listeners, browser APIs, WebSockets, media players).

### ❌ Anti-Pattern 1: Deriving State in Effects
```tsx
// ❌ Redundant render cycle + desynchronization hazard
const [count, setCount] = useState(0);
useEffect(() => {
  setCount(items.length);
}, [items]);

// ✅ Compute directly during render
const count = items.length;
```

### ❌ Anti-Pattern 2: Event-Driven Logic in Effects
```tsx
// ❌ Don't trigger user action side-effects in useEffect
const [submitted, setSubmitted] = useState(false);
useEffect(() => {
  if (submitted) {
    trackConversion();
    navigate('/success');
  }
}, [submitted]);

// ✅ Execute directly in the event handler
const handleSubmit = async () => {
  await submitForm();
  trackConversion();
  navigate('/success');
};
```

### ✅ Legitimate Use Cases for `useEffect`:
- Subscribing to browser events (resize, keydown, scroll) with mandatory cleanup:
```tsx
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [onClose]);
```
- Imperative integration with third-party canvas, video players, or GSAP timelines.

---

## 4. Performance & Memoization Discipline

Do not pre-emptively wrap every function or component in `useCallback` or `React.memo`:
- **`React.memo`**: Apply only to heavy components that render frequently with identical props (e.g., individual subtitle rows in a 1,000-line list).
- **`useMemo`**: Apply only for expensive computations (sorting/filtering large datasets > 200 items).
- **Virtualization**: Use windowing (`react-window` or virtual scrolling) for long collections.

---

## 5. Accessibility Baseline (Non-Negotiable)

1. **Native Interactive Elements**:
   - Clickable actions are `<button type="button">` or `<a href="...">`.
   - Never place `onClick` on a `<div>` or `<span>`.
2. **Form Accessibility**:
   - Every input has an accessible name via `<label htmlFor="...">` or `aria-label`.
   - Placeholders are hints, not accessible labels.
3. **Dialogs & Modals**:
   - Use `role="dialog"`, `aria-modal="true"`, and an explicit `aria-labelledby`.
   - Global `Escape` key closes the modal (listener on `window`).
4. **Decorative Elements**:
   - Icons without text must have `aria-label` on their parent button.
   - Purely visual SVGs must have `aria-hidden="true"`.

---

## 6. Verification Checklist
Before completing work on a React module:
1. `npx tsc --noEmit` runs with 0 errors.
2. `npm run lint` passes without warnings.
3. Unit tests pass: `npm test -- <ComponentName>.test.tsx --watchAll=false`.
4. File line count limits are respected (TSX: $\le$ 250 lines, CSS Module: $\le$ 200 lines).
