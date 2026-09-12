# SubStreamEdu: Code Standards & Engineering Guidelines

## 1. Backend Standards (Go Microservices)

### 1.1 Project Structure
Every Go service follows standard Go project layout:
```text
service-root/
├── cmd/
│   └── server/main.go          # Application entrypoint & dependency injection
├── internal/
│   ├── config/                 # Environment and configuration loading
│   ├── dto/                    # Request and response data transfer objects
│   ├── handler/                # HTTP request handlers (controller layer)
│   ├── middleware/             # HTTP middleware (auth, tracing, rate-limiting)
│   ├── model/                  # Domain entities & database models
│   ├── repository/             # Data access layer (PostgreSQL / Redis)
│   │   └── migrations/         # golang-migrate SQL files
│   ├── service/                # Business logic layer
│   └── telemetry/              # OpenTelemetry tracing & metrics
├── Dockerfile
├── go.mod
└── go.sum
```

### 1.2 Error Handling & Logging
- **Explicit Errors**: Never ignore returned errors (`_ = ...` is banned in business logic). Wrap errors with descriptive domain context:
  ```go
  if err != nil {
      return fmt.Errorf("failed to retrieve user due cards for user %s: %w", userID, err)
  }
  ```
- **Unified JSON Error Responses**: All HTTP error responses must adhere to the standard envelope:
  ```json
  {
    "status": "error",
    "message": "Human-readable description of error",
    "code": "RESOURCE_NOT_FOUND",
    "timestamp": "2026-09-11T20:00:00Z"
  }
  ```
- **Structured Logging (`zap.Logger`)**: Never use standard library `log.Println` or `fmt.Printf`. Always inject structured fields:
  ```go
  logger.Info("Card reviewed successfully",
      zap.String("userId", userID.String()),
      zap.Int64("cardId", cardID),
      zap.Int("rating", rating),
      zap.Duration("duration", elapsed),
  )
  ```

### 1.3 Concurrency & Context Propagation
- **Context is Mandatory**: Every function performing I/O, database querying, external API calling, or Kafka publishing must accept `ctx context.Context` as its first parameter.
- **Worker Pools for Background Processing**: Unbounded `go func() { ... }()` is banned. Long-running asynchronous tasks must be queued into bounded worker channels with recovery middleware and context timeouts.

---

## 2. Frontend Standards (React 18 & TypeScript)

### 2.1 TypeScript Strictness
- `noImplicitAny: true`, strict null checks, and explicit return types on all exported service functions and API hooks.
- Banned types: `any` is forbidden in new code. Use `unknown` with runtime type narrowing or write an explicit interface/type.
- File naming:
  - React components: `PascalCase.tsx` (e.g., `VideoPlayer.tsx`)
  - Hooks: `camelCase.ts` prefixed with `use` (e.g., `useSubtitles.ts`)
  - Services: `PascalCaseService.ts` (e.g., `DictionaryService.ts`)
  - Types / DTOs: `kebab-case.types.ts` or `PascalCase.ts`

### 2.2 Component Architecture & State Management
- **Single Responsibility Principle**: Components must not exceed 250 lines. Large UI pages must decompose into isolated subcomponents inside a dedicated folder (`components/<FeatureName>/`).
- **Server State vs. Client State**:
  - **Server State**: Managed strictly via `@tanstack/react-query` with explicit query keys (e.g., `['dictionary', 'cards', userId, date]`).
  - **Client State**: Local state via `useState`/`useReducer`. Global UI state via React Context (e.g., `AuthContext`, `LanguageContext`).
- **Memory & Event Hygiene**: Any `addEventListener`, WebSocket connection, or interval timer in `useEffect` MUST return a cleanup function to prevent memory leaks.

### 2.3 Styling Conventions & Token Enforcement
- **Zero Raw Hex in Inline Styles or Arbitrary Tailwind**:
  - ❌ Banned: `className="bg-[#0d0c0b] text-[#ede8e0] border-[#282522]"`
  - ✅ Required: Use design tokens: `className="bg-canvas text-ink border-hairline"`
- **Semantic CSS Classes**: Prefer CSS Modules (`Component.module.css`) for complex keyframe choreography or heavy layout logic; use Tailwind utility classes for atomic spacing, alignment, and standard component tokens.

---

## 3. Database & Migration Standards

1. **Explicit Column Mapping**: Always select specific columns in SQL queries (`SELECT id, word, status FROM ...`). Never use `SELECT *` in production repositories.
2. **Prepared Statements & Parameter Binding**: All SQL queries executed via `pgxpool` must use parameterized placeholders (`$1, $2, ...`) to prevent SQL injection.
3. **Migration File Pairing**: Every database change requires both an `up.sql` and a `down.sql`:
   ```text
   internal/repository/migrations/
   ├── 000003_add_outbox_index.up.sql
   └── 000003_add_outbox_index.down.sql
   ```
