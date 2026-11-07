# Feature Spec 34: Songs Page (`/songs`) Apple-Minimalist Widescreen Redesign

## 1. Objective & Context
Following the Apple-minimalist widescreen (`1560px`) redesigns of `/dashboard` (Spec 31 / ADR-101), `/dictionary` (Spec 32 / ADR-102), and `/videos` (Spec 33 / ADR-103), the user requested applying the same design language to the next core page (`/songs` — `SongSearchPlayer`).

Currently, `/songs` (`SongSearchPlayer.tsx` and subcomponents) exhibits several legacy patterns:
1. **Narrow Viewport & Empty Margins**: `.container` is capped at `1200px` (`padding: 120px 24px 60px`) and `SongSearchBar` is capped at `840px`, leaving wide black margins on widescreen displays.
2. **Technical Tag & Yellow Highlight Header**: Renders `04 // SONGS & LYRICS` and a centered title with `<do>songs</do>` highlighted in `#faf92f`.
3. **Fragmented Search & Level Controls**: `SongSearchBar` floats as a narrow 840px pill, while `Recommended Songs by Level` centers its title and uses standalone pill buttons (`A1`–`C1`) that turn white with `#000000` text.
4. **Redundant Card Badges**: All 20 cards in the Recommended Songs grid repeat the same `{selectedLevel}` badge (`A1`, `A1`, `A1`) on every card.
5. **Noisy Search Results Metadata**: `SongSearchResults.tsx` renders raw lyrics provider names (`genius`, `lrclib`), year, and a bottom border row of 3 icons (`Lyrics`, `Audio`, `Popular`) inside every result card.
6. **Buried Vertical Player & Lyrics Stack**: When a song is selected, the player (`trackInfoCard`) and lyrics (`lyricsCard`) render at the very bottom of the page *below* all 20 recommended songs, and stack vertically so the player scrolls out of view while reading lyrics.

## 2. Design Architecture (Apple-Minimalist Widescreen `1560px`)
1. **Widescreen Container (`1560px`) & Viewport Fill**:
   - Expand `.container` to `max-width: 1560px; padding: 84px 48px 36px; min-height: 100vh; display: flex; flex-direction: column;`.
   - Set `.content` to `flex: 1; display: flex; flex-direction: column; gap: 20px;`.
2. **Clean Top Bar + Unified Widescreen Search Bar**:
   - Replace the centered `.headerGroup` (`04 // SONGS & LYRICS` and yellow `<do>` highlight) with a clean left-aligned `.topBar` (`font-size: clamp(22px, 2.2vw, 28px); font-weight: 600; color: var(--color-ink);`).
   - Redesign `SongSearchBar` into a full-width (`100%`) unified Apple-minimalist squircle bar (`background: rgba(255, 255, 255, 0.032); border: 1px solid rgba(255, 255, 255, 0.065); border-radius: 20px; padding: 8px 8px 8px 20px;`) with an integrated search input and tactile `Search` button (`border-radius: 14px`).
3. **2-Column Widescreen Studio Workspace for Active Song (Player + Lyrics)**:
   - Elevate the active song workspace (`track` / `lyrics` / `loading`) directly above the Recommended Songs section so selecting a song immediately presents the player and lyrics without scrolling past 20 cards.
   - Arrange the active player and interactive lyrics in a **2-column widescreen split** (`grid-template-columns: minmax(360px, 440px) minmax(0, 1fr); gap: 20px; align-items: start;`):
     - **Left Column (Sticky Player Card)**: Song title, artist, embedded YouTube/Spotify player (`border-radius: 16px`), and a quiet subtle tip notice inside a `22px` translucent squircle card (`position: sticky; top: 88px;`).
     - **Right Column (Interactive Lyrics Card)**: Clean Apple Music-style lyrics surface (`border-radius: 22px`, `background: rgba(255, 255, 255, 0.032)`, `border: 1px solid rgba(255, 255, 255, 0.065)`) with generous typography (`font-size: 17px; line-height: 1.95;`) and interactive word/phrase translation.
4. **Minimalist Search Results Grid (`SongSearchResults`)**:
   - Display search results in a clean 3-column widescreen grid (`grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px;`) with `20px` squircle cards, `16:9` artwork + play overlay, song title, and artist name — removing noisy provider badges (`lrclib`/`genius`) and the 3-icon footer row.
5. **Recommended Songs Bento Section with Segmented CEFR Bar**:
   - Wrap the Recommended Songs section in a `22px` translucent squircle card (`flex: 1`) featuring a single horizontal header bar: section title (`Recommended Songs by Level`) on the left, and an Apple-style segmented CEFR level switcher (`A1`, `A2`, `B1`, `B2`, `C1`) on the right.
   - Render the 20 curated songs in a **4-column widescreen grid (`grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px;`)**. Each card features a `38×38px` Music icon squircle, song title, and artist name, removing the redundant `{selectedLevel}` pill badge repeated on every card.

## 3. Implementation Rules & File Boundaries
Permitted files:
- `substreamedu-frontend/src/components/SongsPage/SongSearchPlayer.tsx`
- `substreamedu-frontend/src/components/SongsPage/SongSearchPlayer.module.css`
- `substreamedu-frontend/src/components/SongsPage/SongSearchBar.tsx`
- `substreamedu-frontend/src/components/SongsPage/SongSearchBar.module.css`
- `substreamedu-frontend/src/components/SongsPage/SongSearchResults.tsx`
- `substreamedu-frontend/src/components/SongsPage/SongSearchResults.module.css`
- `context/feature_specs/34_songs_page_apple_minimalist_widescreen_redesign.md`
- `context/progress_tracker.md`

## 4. Verification Checklist
- [ ] `npx tsc --noEmit` passes with zero TypeScript errors.
- [ ] Existing frontend unit test suites pass with zero regressions.
