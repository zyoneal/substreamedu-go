# Feature Spec 67: Dashboard Multi-Skill Audit, Polish & Humble Object Architecture

## 1. Objective & Context
Apply all engineering, UX, motion, accessibility, and copy skills (`ub-mode`, `react-conventions`, `codebase-design`, `emil-design-eng`, `perception-laws`, `better-accessibility`, `better-typography`, `better-colors`, `better-ui`, `tdd`) to the `/dashboard` page (`substreamedu-frontend/src/components/DashboardPage/`).

Key findings from the multi-skill audit of `DashboardPage`:
1. **Humble Object Violation (`code_standards.md` §2.2, `ub-mode`, `react-conventions`)**:
   - `DashboardPage.tsx` is **495 lines**, nearly 2x the 250-line maximum limit in `code_standards.md` §2.2.
   - Data fetching (`DictionaryService.fetchDashboardStats`), `localStorage` onboarding checks, 7-day streak calculations, and all 9 Bento grid cards are mixed into a single file.
2. **Broken 1-Click Video Resume (`perception-laws` — Zeigarnik Effect & Fitts's Law)**:
   - When `latestRecentVideo` exists, the Hero Video card displays `"Resume Watching"` and the video's title with a `"Continue"` button, yet hardcodes `to="/videos"` instead of passing `?videoUrl=${encodeURIComponent(latestRecentVideo.videoUrl)}` (which `VideoPage.tsx` already supports via `searchParams.get('videoUrl')`).
3. **Hardcoded English Strings in Daily Review Card (`better-writing`, i18n)**:
   - `${dueCount} to review` and `${newCardsCount} new` are hardcoded in English instead of using `intl.formatMessage`.
4. **Inline Style Anti-Patterns & Missing Dialog Accessibility in `WelcomeModal.tsx` (`code_standards.md` §2.3, `react-conventions`, `better-accessibility`)**:
   - `WelcomeModal.tsx` uses 120+ lines of raw inline `style={{ ... }}` objects and imperative DOM style mutations (`e.currentTarget.style.backgroundColor = ...`), and lacks `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, a close button, and `Escape` key dismissal.
5. **Motion, Touch Hover Gating & Reduced Motion (`emil-design-eng`, `animate`, `better-accessibility`)**:
   - `DashboardPage.module.css` applies `:hover` transforms without `@media (hover: hover) and (pointer: fine)` gating and lacks `@media (prefers-reduced-motion: reduce)` support.

## 2. Design Alternatives (Design It Twice)
| Option | Description | Verdict |
| :--- | :--- | :--- |
| A | Keep `DashboardPage.tsx` at 495 lines and only tweak CSS | Violates `code_standards.md` §2.2 (≤250 LOC limit) and leaves inline DOM style mutations in `WelcomeModal.tsx` and broken resume URL in `cardHeroVideo`. Rejected. |
| B | Split `DashboardPage.tsx` into 12 tiny single-card files | Over-fragmented; scatters the Bento grid layout across too many files. Rejected. |
| C | Decompose `DashboardPage.tsx` into a <110-line Humble Object backed by pure `dashboardUtils.ts`, `useDashboardData.ts` hook, `DashboardFormatCards.tsx`, `DashboardTelemetryCards.tsx`, and CSS-Module-based accessible `WelcomeModal.tsx` | Cleanly separates pure calculations, stateful hooks, and Bento UI groups while keeping every file well under 250 lines. **Chosen.** |

## 3. Implementation Scope
## Allowed files
- `context/feature_specs/67_dashboard_perfection_and_humble_object.md`
- `context/feature_specs/65_autopilot_skill_and_project_integration.md`
- `context/progress_tracker.md`
- `.autopilot/PROGRESS.md`
- `substreamedu-frontend/src/components/DashboardPage/**`

## 4. Verification Checklist
- [ ] `DashboardPage.tsx` is ≤ 250 lines (Humble Object pattern).
- [ ] `WelcomeModal.tsx` uses CSS Modules, `role="dialog"`, `aria-modal="true"`, and closes on `Escape`.
- [ ] `cardHeroVideo` links to `/videos?videoUrl=...` when `latestRecentVideo` has a valid URL.
- [ ] All tests in `DashboardPage.test.tsx` pass (`RED → GREEN`).
- [ ] Full `./verify.sh` passes with 0 errors.

