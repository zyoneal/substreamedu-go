# Spec 55: Book-Based Language Learning & Interactive Reader

- **Status**: Approved (In Progress)
- **Owner**: Frontend & Learning Experience Engineering
- **Related ADR**: ADR-128
- **Depends On**: Spec 54 (`54_ai_harness_workflow_modernization.md`), `TranslationPopover` (Spec 20), `useSaveWord` hook

---

## 1. Problem Statement & Scope

Language learners need structured, extensive reading materials tailored to their CEFR proficiency (A1 to C1) alongside the freedom to upload their own books and articles. While SubStreamEdu provides video (`/videos`), audio lyrics (`/songs`), and raw text paste (`/text-paste`), it lacks an extensive reading ecosystem with multi-chapter navigation, reading progress persistence, and level-curated literature.

Learners require:
1. **Curated Library Graded by CEFR Levels**: High-quality public domain and adapted English literature organized into A1, A2, B1, B2, and C1 tiers with reading duration and difficulty markers.
2. **User Book Ingestion**: Seamless client-side upload of custom books in standard `.epub` and `.txt` formats with automatic chapter splitting and metadata extraction.
3. **In-Context Lexeme Interaction (Identical to `SubtitleViewer`)**:
   - Live underline/highlight of existing vocabulary from the user's dictionary (`useUserDictionaryItemsLight`).
   - One-click or tap selection of words and multi-word phrases.
   - Unified `TranslationPopover` displaying contextual translation, IPA transcription, definitions, generated artwork, usage examples, synonyms, and collocations.
   - Instant optimistic flashcard creation into the SRS deck (`useSaveWord`).
4. **Distraction-Free Cinematic Espresso Reading Experience**: Responsive, comfortable typography (`e-Ukraine`, font scaling, chapter drawer, reading progress indicators).

### Out of Scope:
- Server-side PDF OCR or layout recreation for multi-column magazines.
- DRM-protected proprietary e-book decryption.
- Direct synchronization of multi-megabyte book binaries across network endpoints (reading progress and custom books are stored in client-side IndexedDB for zero latency, zero cloud storage costs, and complete privacy).

---

## 2. Architecture & Design Alternatives ("Design It Twice")

### Alternative 1: Full-Stack Server-Persisted E-Book Service (Rejected)
- **Design**: Introduce new Go microservice endpoints in `substreamedu-media-service` with PostgreSQL tables (`books`, `chapters`, `user_book_progress`), multipart upload endpoints, and binary storage on persistent volumes.
- **Trade-offs**:
  - High operational complexity and latency (multipart uploads of 10–20MB EPUBs to backend, migrations in `substreamedu_media`).
  - Strict system invariants limit upload payload and DB blob storage.
  - Slower time to interactive and failure risk on intermittent connections.

### Alternative 2: High-Performance Client-Side Engine with IndexedDB & Static Curated Catalog (Chosen)
- **Design**:
  - Curated books are bundled as structured data modules with pre-split chapters and metadata.
  - User uploads (`.epub`, `.txt`) are parsed directly in the browser using `JSZip` (already present in `package.json`) and DOMParser.
  - All books, custom uploads, bookmarks, and reading progress are stored in a client-side `IndexedDB` database (`substreamedu_books_db`).
  - Vocabulary interaction leverages the existing, battle-tested `TranslationPopover` and `useSaveWord` API hooks connecting directly to `DictionaryService`.
- **Justification**: Zero new backend dependencies, instant local loading, complete offline reading capability, zero operational storage cost, and immediate reuse of existing SRS card creation infrastructure.

---

## 3. Technical Requirements

### 3.1 Data Models & Types (`src/components/BooksPage/types/book.types.ts`)
```typescript
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface Chapter {
  id: string;
  title: string;
  content: string; // Clean text or structured paragraphs
  wordCount: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  level: CEFRLevel;
  description: string;
  coverGradient: string;
  accentColor: string;
  totalWords: number;
  estimatedMinutes: number;
  isCustom?: boolean;
  uploadedAt?: string;
  chapters: Chapter[];
}

export interface ReadingProgress {
  bookId: string;
  currentChapterId: string;
  scrollPercentage: number;
  lastReadAt: number;
  isCompleted: boolean;
}
```

### 3.2 Curated Catalog Collection (`src/components/BooksPage/data/curatedBooks.ts`)
Curated classic and graded works across CEFR tiers:
- **A1**: *The Little Prince* (Selected adapted episodes by Antoine de Saint-Exupéry) & *Aesop's Fables* (Selected stories).
- **A2**: *Alice's Adventures in Wonderland* (Adapted chapters by Lewis Carroll) & *The Adventures of Tom Sawyer* (Selected chapters by Mark Twain).
- **B1**: *The Adventures of Sherlock Holmes: A Scandal in Bohemia* (Arthur Conan Doyle) & *The Time Machine* (H.G. Wells).
- **B2**: *The Great Gatsby* (F. Scott Fitzgerald) & *The Picture of Dorian Gray* (Oscar Wilde).
- **C1**: *Dracula* (Bram Stoker) & *Frankenstein* (Mary Shelley).

### 3.3 Parsers (`src/components/BooksPage/services/epubParser.ts`, `txtParser.ts`)
- **EPUB Parser**: Reads `.epub` files via `JSZip`, parses `META-INF/container.xml` to locate the OPF document, extracts metadata (title, author) and spine item order, extracts clean text from chapter documents using `DOMParser`, and formats chapters.
- **TXT Parser**: Reads text files, splits into logical chapters (via regex detection of `Chapter \d+` or ~1,500–2,000 word blocks), and derives metadata from filename.

### 3.4 Local Persistence (`src/components/BooksPage/services/bookStorage.ts`)
- IndexedDB database `substreamedu_books_db` with object stores:
  - `custom_books`: stores user-uploaded `Book` records.
  - `progress`: stores `ReadingProgress` records indexed by `bookId`.
- Fallback to `localStorage` if IndexedDB is blocked.

### 3.5 Interactive Reader UI (`src/components/BooksPage/BookReader.tsx`, `BookContent.tsx`)
- Renders readable text with comfortable font sizes (16px to 24px) and line height.
- Highlights words already present in the user's dictionary (`useUserDictionaryItemsLight`).
- Text selection and word tap listeners identical to `SubtitleViewer`:
  - Computes bounding box and opens `TranslationPopover`.
  - Dispatches `saveWordMutation` via `useSaveWord` with `resourceName: book.title`, `highlightedText`, and contextual sentence.
  - Displays instant toast notifications on save.

### 3.6 Navigation & Dashboard Integration
- Add route `/books` (Catalog) and `/books/:bookId` (Reader) in `routes.tsx`.
- Add "Books" navigation item in `Header.tsx`.
- Add "Learning with books" card in `DashboardPage.tsx` bento grid.

---

## 4. Implementation Rules & Machine-Enforced File Boundaries

## Allowed files
- `context/feature_specs/55_book_learning_reader.md`
- `context/progress_tracker.md`
- `substreamedu-frontend/src/routes/routes.tsx`
- `substreamedu-frontend/src/components/Header.tsx`
- `substreamedu-frontend/src/components/Header.module.css`
- `substreamedu-frontend/src/components/DashboardPage/DashboardPage.tsx`
- `substreamedu-frontend/src/components/DashboardPage/css/DashboardPage.module.css`
- `substreamedu-frontend/src/components/BooksPage/**`
- `substreamedu-frontend/src/locales/en.json`

---

## 5. Test Plan & Concrete Test Cases

1. **Parser Unit Tests (`epubParser.test.ts`, `txtParser.test.ts`)**:
   - Verify TXT parsing creates structured chapters and computes accurate word counts.
   - Verify EPUB extraction handles manifest XML and extracts chapter titles cleanly.
2. **Storage Unit Tests (`bookStorage.test.ts`)**:
   - Verify storing, retrieving, and deleting custom books in IndexedDB.
   - Verify reading progress update and retrieval.
3. **Catalog Component Tests (`BooksCatalog.test.tsx`)**:
   - Renders level filter tabs (All, A1, A2, B1, B2, C1, My Books).
   - Filtering by level updates visible book cards.
   - Search query matches title or author.
   - Custom file upload triggers parser and adds book to catalog.
4. **Reader Component Tests (`BookReader.test.tsx`)**:
   - Renders chapter content and progress indicators.
   - Clicking a word triggers `TranslationPopover` with target text and sentence context.
   - Saving a word invokes `useSaveWord` mutation with correct metadata.

---

## 6. Verification Checklist

1. `./verify.sh` executes and passes all anti-tamper, spec scope, and test suites.
2. `npx tsc --noEmit` runs with 0 TypeScript compilation errors in `substreamedu-frontend`.
3. `npm test -- --watchAll=false` passes cleanly across all existing and new test suites.
4. Book catalog displays all levels (A1 to C1) with Warm Cinematic Espresso aesthetic.
5. EPUB and TXT custom uploads parse and open smoothly in reader.
6. Word and phrase selection seamlessly opens `TranslationPopover` and saves flashcards to user dictionary.
