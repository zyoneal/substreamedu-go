# SubStreamEdu: API Specifications & Contracts Registry

## 1. Overview & Architectural Principles

All client-to-backend and inter-service HTTP interactions in SubStreamEdu adhere to formal API contract specifications. The public entrypoint is reverse-proxied by Caddy onto `substreamedu-gateway-go` (`:8080`), which validates CORS, extracts tracing contexts, checks rate limits, and dispatches to internal microservices via Docker bridge networking.

### Security Schemes
1. **Public Routes**: No authorization header required (e.g., `/api/auth/login`, `/api/subtitles/external/search`, `/api/dictionary/lessons/share/:token`, `/api/dictionary/resources/items/light`).
2. **Bearer JWT (`bearerAuth`)**: Client mutation endpoints and personal data access require an `Authorization: Bearer <token>` header issued by `iam-service`. User ID is extracted exclusively from validated token claims (`sub`).
3. **Internal Service Key (`internalKey`)**: Inter-service communication bypassing the gateway (e.g., `dictionary-service -> iam-service` for quota checks) must supply `X-Internal-Service-Key: <secret>`.
4. **Timezone Awareness**: Endpoints computing daily queues or streak status accept `X-Timezone: <IANA_Timezone>` (e.g. `Europe/Kyiv`, `America/New_York`).

### Unified Error Envelope
All error responses across all Go microservices return HTTP status >= 400 with the standard JSON envelope:
```json
{
  "status": "error",
  "message": "Human-readable description of error",
  "code": "ERROR_CODE_STRING",
  "timestamp": "2026-09-26T00:00:00Z"
}
```

---

## 2. Service API Specification Index

| Service | Protocol & Prefix | Specification File | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Gateway Routing** | REST `/api/*` | [`gateway_routes.yaml`](file:///Users/test/Desktop/substreamedu-go/context/api_specs/gateway_routes.yaml) | Public ingress, route dispatching, path prefix stripping |
| **IAM Service** | REST `/auth-service` | [`iam_service.yaml`](file:///Users/test/Desktop/substreamedu-go/context/api_specs/iam_service.yaml) | Auth, Google OAuth, user profiles, promo codes, quotas |
| **Dictionary Service** | REST `/dictionary-service` | [`dictionary_service.yaml`](file:///Users/test/Desktop/substreamedu-go/context/api_specs/dictionary_service.yaml) | Vocabulary, FSRS reviews, AI translation, grammar, lessons |
| **Media Service** | REST `/media-service` | [`media_service.yaml`](file:///Users/test/Desktop/substreamedu-go/context/api_specs/media_service.yaml) | Subtitles (SRT/VTT), SubDL search, YouTube clips, audio |

---

## 3. Contract Modification Invariants

1. **Spec First (Rule 19)**: Never add new endpoints, parameters, or modify JSON schemas in Go handlers without updating the corresponding spec in this directory first.
2. **Backward Compatibility**: Existing field names must never be removed or renamed without deprecation notice. Optional fields must have default zero-value handling.
3. **Strict Validation**: All incoming request bodies must be parsed into strongly typed Go DTO structs in `internal/dto/` with `binding:"required"` tags.
