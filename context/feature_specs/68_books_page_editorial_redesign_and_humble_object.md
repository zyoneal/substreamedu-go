# Feature Spec 68: Books Page Complete Editorial Redesign, Localization & Humble Object Architecture

## 1. Objective & Context
Completely redesign `/books` (`BooksCatalogPage.tsx`, `BooksCatalog.module.css`, and `BookReader.module.css`) to eliminate visual clipping, generic pastel/watermark card slop, missing RU/UK localization, and Humble Object violations.

Key issues identified from the user's screenshot and multi-skill audit (`tastemaker`, `design-taste-frontend`, `emil-design-eng`, `better-layout`, `better-typography`, `ub-mode`, `react-conventions`):
1. **Header Clipping Under Fixed Navbar**:
   - `BooksCatalog.module.css` had `padding: 2.5rem 1.75rem 6rem` (`40px` top), causing the `64px` fixed navbar to slice through `"✦ GRADED EXTENSIVE READING"`.
   - `BookReader.module.css` had `.readerHeader { top: 0 }` without clearing the fixed navbar.
2. **Missing Russian & Ukrainian Localization (`ru.json`, `uk.json`)**:
   - Even with `Русский` selected in the top navbar, 100% of `/books` rendered in English because `books.*` keys were missing from `ru.json` and `uk.json`, and several strings (`GRADED EXTENSIVE READING`, `Elementary`, `{percentage}% completed`, `{words} words`, `{minutes}m`, `{chapters} ch`) were hardcoded in English.
3. **Generic Card Slop & Fake 0% Progress Bars**:
   - Cards used washed-out pastel top strips with a tilted `<BookOpen size={64} />` watermark icon and rendered an empty gray 0% progress bar line above word counts on unread books.
   - Active books in progress (`33% completed`) lacked a dedicated "Continue Reading" hero desk.
4. **Humble Object Violation (`code_standards.md` §2.2)**:
   - `BooksCatalogPage.tsx` was 388 lines (exceeding the 250-line limit).

## 2. Design Alternatives (Design It Twice)
| Option | Description | Verdict |
| :--- | :--- | :--- |
| A | Only increase `padding-top` and keep the pastel banner cards | Leaves the generic watermark cards, fake 0% progress bars, missing RU/UK translations, and 388-line monolith intact. Rejected. |
| B | Redesign `/books` into the **Pixzen Literary Studio**: full-width `1560px` container aligned with `/dashboard`, Featured "Reading Desk" hero card (`BookContinueDesk.tsx`) with live chapter excerpt, tactile 3D Hardcover Folio cards (`BookFolioCard.tsx`) with realistic spine creases and smart progress/word-count footers, complete EN/RU/UK localization, and Humble Object decomposition (<250 LOC) | Fixes every visual, UX, i18n, and architectural issue. **Chosen.** |

## 3. Implementation Scope
## Allowed files
- `context/feature_specs/68_books_page_editorial_redesign_and_humble_object.md`
- `context/feature_specs/65_autopilot_skill_and_project_integration.md`
- `context/progress_tracker.md`
- `.autopilot/PROGRESS.md`
- `substreamedu-frontend/src/components/BooksPage/**`
- `substreamedu-frontend/src/locales/en.json`
- `substreamedu-frontend/src/locales/ru.json`
- `substreamedu-frontend/src/locales/uk.json`

## 4. Verification Checklist
- [ ] `BooksCatalogPage.tsx` is ≤ 250 lines (Humble Object).
- [ ] Top padding (`96px` desktop / `80px` mobile) clears the fixed navbar with zero clipping.
- [ ] All `books.*` keys exist in `en.json`, `ru.json`, and `uk.json`.
- [ ] Unread books (`0%`) show clean word/chapter metadata without an empty 0% progress bar; in-progress books show the active progress bar and appear in the Featured Reading Desk.
- [ ] All tests in `BooksCatalogPage.test.tsx` and `./verify.sh` pass with 0 errors.

