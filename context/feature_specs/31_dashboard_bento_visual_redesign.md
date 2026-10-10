# Feature Spec 31: Dashboard & Section Cards Apple-Minimalist Visual Redesign

## 1. Goal
Redesign `/dashboard` (`DashboardPage.tsx` and `DashboardPage.module.css`) according to Apple's core interface design principles (`apple-design`: Simplicity, Restraint, Typographic Hierarchy, Translucent Depth, and Fluid Physics):
- **Eliminate Visual Clutter**: Strip all numbered terminal tags (`00 // DASHBOARD` through `07 // TELEGRAM BOT`), secondary pill badges (`AI LOOKUP`, `Spotify & YouTube`, `CEFR A1 - C1`, `SRT · VTT`, `@substreamedu_bot`), nested boxes, and decorative watermarks.
- **Calm Translucent Squircle Surfaces**: Replace heavy dark shadows and thick borders with soft matte surfaces (`rgba(255, 255, 255, 0.032)`), subtle hairline borders (`1px solid rgba(255, 255, 255, 0.065)`), and `24px` squircle geometry.
- **Pure Typographic Hierarchy**:
  - Clean header with a single display title (`Choose a learning format`).
  - Top row of 3 concise Apple Health/Fitness-inspired telemetry cards (`Streak`, `Repetition`, `Dictionary`) displaying only the primary tabular metric, a single-line subtitle, and a quiet inline action.
  - Learning format cards reduced to 3 essential elements: a soft-tinted `12px` icon squircle, a clear heading, and a concise description with a subtle hover chevron.
- **Tactile Apple Physics**: Instant pointer-down compression (`scale(0.985)`) and critically damped transitions (`cubic-bezier(0.32, 0.72, 0, 1)`).

---

## 2. Implementation Rules

### What to Touch:
- `substreamedu-frontend/src/components/DashboardPage/DashboardPage.tsx`
- `substreamedu-frontend/src/components/DashboardPage/css/DashboardPage.module.css`
- `substreamedu-frontend/src/components/DashboardPage/DashboardPage.test.tsx`
- `context/progress_tracker.md`

---

## 3. Verification Checklist
- [x] Unit test suite `DashboardPage.test.tsx` passes (`npm test -- --watchAll=false --testPathPattern="DashboardPage.test.tsx"`).
- [x] Live dev server on `http://localhost:3000/dashboard` hot-reloads cleanly.
