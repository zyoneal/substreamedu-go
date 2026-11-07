---
name: typescript-patterns
description: |
  TypeScript discipline for any JavaScript/TypeScript project (frontend + backend): strict mode, type design, generics, narrowing, error types, module resolution, tsconfig hygiene. Apply when the project has `tsconfig.json` and `typescript` in devDependencies.

  Use this skill to:
  - Write types that catch bugs at compile time, not runtime.
  - Use generics, conditional types, and discriminated unions correctly.
  - Avoid `any`, `unknown` leakage, and unsafe type assertions.
  - Match the project's tsconfig strictness level without modifying it mid-task.
  - Ensure compile-time and runtime safety across models, hooks, and services.

  Do NOT use this skill for:
  - Framework-specific React UI idioms (use react-conventions).
  - Styling or CSS module problems.
user-invocable: false
paths: ["**/*.ts", "**/*.tsx", "tsconfig*.json"]
---

# TypeScript Patterns

This skill encodes idioms that catch real bugs in TypeScript codebases. Apply alongside `react-conventions` when working in frontend or backend TypeScript modules.

## 1. Strictness Discipline

### Never use `any`
`any` completely disables the type checker and spreads contagion across callers:
```ts
// ❌ Dangerous: removes all safety
function processUser(data: any) {
  return data.profile.settings.theme; // Unchecked runtime crash potential
}

// ✅ Safe: use unknown with validation or explicit schema
function processUser(data: unknown): UserTheme {
  const parsed = UserSchema.parse(data);
  return parsed.profile.settings.theme;
}
```
If you must interact with untyped third-party legacy APIs, localize the cast behind a boundary adapter and add an explicit explanatory comment.

### Prefer `unknown` over `any`
`unknown` is the type-safe top type. It forces explicit narrowing before property access:
```ts
function parseJson(raw: string): unknown {
  return JSON.parse(raw);
}

const data = parseJson(input);
if (typeof data === 'object' && data !== null && 'id' in data) {
  // narrowed safely
}
```

### Type Assertions are a Last Resort
`x as TargetType` overrides compiler guarantees:
- Never use `as any as TargetType` to silence the compiler.
- Use type guards or runtime schemas instead of assertions.
- Non-null assertion (`x!`) should be replaced with explicit checks or error throwing:
```ts
// ❌ Don't
const item = items.find(i => i.id === id)!;

// ✅ Do
const item = items.find(i => i.id === id);
if (!item) {
  throw new Error(`Item ${id} not found`);
}
```

---

## 2. Type Design

### Discriminated Unions for State Machines
Never use loose optional properties for asynchronous or multi-state machines:
```ts
// ❌ Ambiguous — what does { loading: true, data: user, error: err } mean?
type AsyncState<T> = { loading?: boolean; data?: T; error?: Error };

// ✅ Discriminated union — exhaustively checkable
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };
```

Handle via `switch` with exhaustive `never` verification:
```ts
function renderState<T>(state: AsyncState<T>) {
  switch (state.status) {
    case 'idle': return null;
    case 'loading': return <Spinner />;
    case 'success': return <DataView data={state.data} />;
    case 'error': return <ErrorBanner error={state.error} />;
    default: {
      const _exhaustiveCheck: never = state;
      throw new Error(`Unhandled state: ${_exhaustiveCheck}`);
    }
  }
}
```

### Branded Types for Identifiers
Prevent mixing interchangeable string IDs (e.g., `userId` passed to an `orderId` parameter):
```ts
type Brand<K, T> = K & { readonly __brand: T };
export type UserId = Brand<string, 'UserId'>;
export type VideoId = Brand<string, 'VideoId'>;

export const asUserId = (id: string): UserId => id as UserId;
export const asVideoId = (id: string): VideoId => id as VideoId;
```

### Readonly by Default
Prevent unintended object and array mutations:
```ts
function computeTotal(items: readonly Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### String Literal Unions instead of Enums
```ts
// ❌ Old-school enum generates runtime boilerplate
enum UserRole { Admin = 'ADMIN', Student = 'STUDENT' }

// ✅ Const array union — zero runtime overhead, cleanly serializable
export const USER_ROLES = ['ADMIN', 'STUDENT', 'TEACHER'] as const;
export type UserRole = typeof USER_ROLES[number];
```

---

## 3. Boundary Validation

Never trust external data (network payloads, local storage, URL params, window events):
1. Type raw boundary input as `unknown`.
2. Validate using a validation library (Zod / Joi / custom parser).
3. Derive the static TypeScript type directly from the schema:
```ts
import { z } from 'zod';

export const SubtitleTrackSchema = z.object({
  id: z.string(),
  language: z.string(),
  start: z.number().nonnegative(),
  end: z.number().nonnegative(),
  text: z.string(),
});

export type SubtitleTrack = z.infer<typeof SubtitleTrackSchema>;
```

---

## 4. Verification Protocol
Before completing any task touching TypeScript code, execute:
```bash
# In substreamedu-frontend:
npm run build # or npx tsc --noEmit
```
If errors occur, fix the source code or types. **NEVER modify `tsconfig.json` or disable linter rules to make a diff pass.**
