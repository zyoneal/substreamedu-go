# Python Microservice Rules

## 1. Tooling & Virtual Environments
- Package manager: use **uv** (`uv run`, `uv sync`, `uv add`). Never install dependencies into the system python.
- Lock file: `uv.lock` (or `poetry.lock`) is the single source of truth and must remain in sync.
- Linter & Formatter: **Ruff** (`ruff check`, `ruff format`). All rules must pass with 0 errors.

## 2. Type Strictness & Data Modeling
- **Type Annotations**: Mandatory type hints on all function parameters and return types.
- **Type Checking**: `mypy --strict` must pass cleanly.
  - Banned: `Any` in new domain code. Use specific generics, `TypeVar`, or `Protocol`.
  - Prefer `dataclasses` (or Pydantic V2 models for HTTP/validation boundaries) over raw dictionaries.
- **Validation**: Enforce boundary validation in Pydantic models. Keep domain entities pure and separated from API DTOs.

## 3. Architecture & Layer Envelopes
- **Layer Boundary Enforcement**:
  - `api / routers`: Validates HTTP schema, authenticates identity, returns response models. Never executes raw SQL or orchestrates multi-step domain workflows.
  - `domain`: Pure business rules, entities, and value objects. Zero framework dependencies.
  - `adapters / repositories`: Database models (SQLAlchemy), message brokers, HTTP client adapters.
- Use `import-linter` to prohibit reverse imports (e.g., domain importing from adapters).

## 4. AsyncIO & Concurrency Invariants
- **Never Block the Event Loop**:
  - Inside `async def` functions, never use blocking synchronous I/O (`requests.get()`, `time.sleep()`, synchronous file `open()`, synchronous DB drivers).
  - Use async equivalents: `httpx.AsyncClient`, `asyncio.sleep`, `aiofiles`, or run synchronous calls in thread pools via `asyncio.to_thread()`.
- **Timeouts**: Every external network call must be wrapped with an explicit timeout (`asyncio.timeout(seconds)`).
- **Graceful Shutdown**: Handle `asyncio.CancelledError` properly in background tasks.

## 5. SQLAlchemy & Persistence
- **Session Lifecycle**: Use `async_sessionmaker` with scoped dependencies in FastAPI (`get_db`). Ensure sessions are closed in `finally` blocks or via context managers.
- **N+1 Prevention**: Explicitly specify relationships with `selectinload` or `joinedload`. Avoid lazy loads during serialization.
- **Alembic**: All schema changes must have an Alembic migration script. Verify both `upgrade head` and `downgrade -1`.

## 6. Testing & Testcontainers
- Test framework: `pytest` with `pytest-asyncio`.
- Integration tests: Use `testcontainers[postgres]` or `testcontainers[kafka]`. Never mock the database with SQLite if production runs PostgreSQL.
- Fast unit tests: pure domain logic tests must run in <1 second with zero I/O.

## 7. Structured Logging
- Use `structlog` with JSON renderer in production.
- Propagate `trace_id`, `request_id`, and `user_id` using Python's `contextvars`.
- Never log passwords, tokens, API keys, or raw authorization headers.
