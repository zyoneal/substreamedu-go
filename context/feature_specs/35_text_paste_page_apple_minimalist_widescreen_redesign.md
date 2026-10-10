# Feature Spec 35: Text & AI Page (`/text-paste`) Apple-Minimalist Widescreen Redesign

## 1. Objective & Context
Following the Apple-minimalist widescreen (`1560px`) redesigns of `/dashboard` (Spec 31 / ADR-101), `/dictionary` (Spec 32 / ADR-102), `/videos` (Spec 33 / ADR-103), and `/songs` (Spec 34 / ADR-104), the user requested applying the same design language to the next core page (`/text-paste` — `TextPasteHighlighter`).

Currently, `/text-paste` (`TextPasteHighlighter.tsx` & `TextPasteHighlighter.module.css`) exhibits legacy patterns:
1. **Narrow Viewport & Empty Margins**: `.mainContent` is capped at `860px` with `padding: 120px 20px 96px`, leaving over 1000px of empty black voids on `1920×1080` displays.
2. **Technical Tag & Yellow Highlight Header**: Displays `05 // TEXT & AI` and centered title with `<do>text</do>` highlighted in `#faf92f`.
3. **Cramped Control Header**: The `.header` row packs a green dot word counter, a 200px topic input, small level buttons with `#000000` text, and icon-only buttons into an awkward, crowded strip.
4. **Frameless Editor Canvas**: The text editor is an unbounded, transparent `contentEditable` area (`min-height: 380px`) floating in a void without an Apple-style surface enclosure.
5. **Dead CSS Bloat**: Over 1,200 lines of obsolete popover styles that were superseded by `<TranslationPopover>`.

## 2. Design Architecture (Apple-Minimalist Widescreen `1560px`)
1. **Widescreen Container (`1560px`) & Viewport Fill**:
   - Set `.container` to `max-width: 1560px; margin: 0 auto; padding: 84px 48px 36px; min-height: 100vh; display: flex; flex-direction: column; background: var(--color-canvas, #0d0c0b);`.
   - Set `.content` to `flex: 1; display: flex; flex-direction: column; gap: 20px; width: 100%;`.
2. **Clean Top Bar + Known Words Telemetry**:
   - Replace `.headerGroup` (`05 // TEXT & AI` and yellow `<do>text</do>` tag) with a left-aligned `.topBar` (`font-size: clamp(22px, 2.2vw, 28px); font-weight: 600; color: var(--color-ink);`).
   - Position a quiet telemetry pill on the right of `.topBar` showing the known words count (`{foundWordsCount} known words in text`).
3. **Unified Apple-Style AI & Action Toolbar (`.controlBar`)**:
   - Create a full-width squircle toolbar card (`border-radius: 20px; background: rgba(255, 255, 255, 0.032); border: 1px solid rgba(255, 255, 255, 0.065); padding: 10px 16px;`):
     - **Left**: Topic input pill (`Topic / keywords (optional)...`) for AI generation.
     - **Center**: Segmented CEFR pill bar (`A1`, `A2`, `B1`, `B2`, `C1`) matching the segmented controls across `/videos`, `/dictionary`, and `/songs`.
     - **Right**: Tactile action buttons (`Paste from clipboard` pill with icon + label on desktop, and `Clear` button with icon).
4. **Studio Reading & Translation Canvas (`.editorCard`)**:
   - Full-width, full-height (`flex: 1; min-height: 520px;`) translucent squircle card (`border-radius: 24px; background: rgba(255, 255, 255, 0.032); border: 1px solid rgba(255, 255, 255, 0.065); padding: 36px 44px; display: flex; flex-direction: column;`).
   - `.textInput`: Generous editorial typography (`font-size: 18px; line-height: 2.0; color: var(--color-ink, #ede8e0); font-family: var(--font-body); letter-spacing: 0.005em; min-height: 480px; flex: 1; outline: none;`).
   - Quiet footer status row: Word count, character count, and subtle hint (`"Select any word or phrase to translate"`).

## 3. Implementation Rules & File Boundaries
Permitted files:
- `substreamedu-frontend/src/components/TextPasteHighlighter/TextPasteHighlighter.tsx`
- `substreamedu-frontend/src/components/TextPasteHighlighter/TextPasteHighlighter.module.css`
- `context/feature_specs/35_text_paste_page_apple_minimalist_widescreen_redesign.md`
- `context/progress_tracker.md`

## 4. Verification Checklist
- [ ] `npx tsc --noEmit` passes with zero errors.
- [ ] `npx eslint "src/**/*.{ts,tsx}" --quiet` passes with zero errors.
- [ ] Frontend unit test suites pass without regression.
