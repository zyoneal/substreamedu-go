# Spec 09: VideoPlayer Modular Decomposition (Part 1 — Translation Popover)

## 1. Objective & Problem Statement
[`VideoPlayer.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx) is currently the largest monolith in the repository at **3,639 lines**, exceeding the **250-line limit** defined in [Rule 13](file:///Users/test/Desktop/substreamedu-go/context/ai_workflow_rules.md#L110-L120) by **14.5x**. 

This monolith mixes:
1. Video element mounting and HTML5 playback state.
2. Subtitle cue synchronization and multi-word selection pipelines.
3. Top and bottom player control bars.
4. The interactive **Translation Popover** (~350 lines of JSX + state handlers for sense options, pronunciation, note editing, and word saving).
5. Six distinct modal dialogue managers.

This high coupling slows IDE tooling, increases cognitive load, and creates ripple effects when editing translation UX.

**Spec 09 (Part 1)** executes the first surgical seam: extracting the **Translation Popover** into an independent, deep component [`VideoTranslationPopover.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/VideoPage/components/VideoTranslationPopover.tsx).

---

## 2. In-Scope vs. Out-of-Scope

### In-Scope
- **Extraction of Translation Popover Component**:
  - Create [`VideoTranslationPopover.tsx`](file:///Users/test/Desktop/substreamedu-go/substreamedu-frontend/src/components/VideoPage/components/VideoTranslationPopover.tsx) in `components/VideoPage/components/`.
  - Move popover JSX (lines ~3140–3450 in `VideoPlayer.tsx`), popover styling references, audio TTS trigger, note state, translation option pills, and save button.
  - Deep Module seam: minimal interface accepting structured props (`translationData`, `selectionPosition`, `onSave`, `isSaving`, `onSelectOption`, `onClose`, etc.).
- **Integration & Verification**:
  - Replace inline popover markup in `VideoPlayer.tsx` with `<VideoTranslationPopover />`.
  - Maintain 100% feature parity (sense switching, collocations, pronunciation, note writing, saving to dictionary).
  - Verify all 25 test suites pass and production build succeeds.

### Out-of-Scope (Deferred to Part 2 & 3)
- Decomposing the video control bars (`VideoControlsOverlay.tsx`) — handled in Part 2.
- Decomposing subtitle cue rendering (`SubtitleOverlay.tsx`) — handled in Part 3.

---

## 3. Design Alternatives (Design It Twice — Rule 8)

| Dimension | Alternative A: Monolithic Multi-File Rewrite (Rejected) | Alternative B: Deep Module Seam-by-Seam (Selected) |
| :--- | :--- | :--- |
| **Approach** | Rewrite `VideoPlayer.tsx` in a single pass into 5 new files simultaneously | Extract high-cohesion sub-domains incrementally (Popover → Controls → Subtitles) |
| **Risk of Regression** | Very High (breaks video event lifecycle, seek sync, or selection state) | Low (pure presentational & interaction extraction with deterministic test gating) |
| **Testing Isolation** | Hard to isolate failures across multiple new components | Single component surface; instant failure diagnosis |
| **Decision** | Rejected: Violates Single-Spec Atomicity (Rule 2) | **Selected**: Minimizes blast radius, ensures zero regressions |

---

## 4. Component Interface Contract (`VideoTranslationPopover.tsx`)

```typescript
export interface PopoverPosition {
    x: number;
    y: number;
    showBelow?: boolean;
    isConstrained?: boolean;
}

export interface TranslationOption {
    translation: string;
    definition?: string;
    register?: string;
    usageNote?: string;
    label?: string;
    isPrimary?: boolean;
}

export interface VideoTranslationPopoverProps {
    selectedText: string;
    selectedSentence: string;
    selectionPosition: PopoverPosition | null;
    translationData: {
        translation: string;
        definition: string;
        transcription: string;
        imageUrl?: string | null;
        showImage?: boolean;
        partOfSpeech?: string;
        register?: string;
        chunks?: string[];
        typical_contexts?: string[];
    };
    translationOptions: TranslationOption[];
    isTranslating: boolean;
    isSaving: boolean;
    note: string;
    showNoteInput: boolean;
    isAdmin?: boolean;
    onNoteChange: (note: string) => void;
    onToggleNoteInput: () => void;
    onSelectOption: (opt: TranslationOption) => void;
    onChunkClick: (chunk: string) => void;
    onSaveToDict: () => void;
    onClose: () => void;
    onPlayAudio?: () => void;
    onGoogleSearch?: () => void;
    onAdminGenerateImage?: () => void;
}
```

---

## 5. Implementation Rules & File Boundaries
1. **Permitted Edits**:
   - `substreamedu-frontend/src/components/VideoPage/components/VideoTranslationPopover.tsx` (NEW)
   - `substreamedu-frontend/src/components/VideoPage/VideoPlayer.tsx` (MODIFIED: integrate popover)
   - `/context/progress_tracker.md` (MODIFIED: track progress)
2. **Forbidden**:
   - No alterations to Go backend services or database schemas.
   - No modifications to other routes (`LoginPage`, `DictionaryPage`, etc.).
   - No modifications to `useVideoPlayer.ts` state engine.

---

## 6. Verification Checklist
- [ ] TypeScript check: `npm run build` exits 0 without type errors.
- [ ] Jest test suite: `npm test -- --watchAll=false` passes all 25 test suites.
- [ ] Manual inspection: Popover renders at correct viewport coordinates, sense option pills switch definitions, Save button triggers mutation with disabled state.
