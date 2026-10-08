# Feature Spec 02: Authentication Hardening & Boundary Security

## 1. Goal
Harden security boundaries across the entire system by enabling token revocation and security headers at the API Gateway, eliminating IDOR vulnerabilities on user profile routes, enforcing JWT validation on all dictionary and media mutations, and protecting internal inter-service endpoints from public internet exposure.

---

## 2. Design & Architectural Decisions

1. **API Gateway Middleware Activation**:
   - Register `middleware.TokenRevocation` in `substreamedu-gateway-go/cmd/gateway/main.go` to reject blacklisted tokens checked against Redis.
   - Register `middleware.SecurityHeaders` to enforce strict browser headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`).
   - Block public ingress routing to `/api/auth/internal/**` and `/api/auth/internal/user/by-telegram-token/**` in `substreamedu-gateway-go/internal/config/config.go`.
2. **IAM Service IDOR Remediation**:
   - Add `middleware.AuthMiddleware(r.jwtService)` to `GET /auth-service/users/:userId`.
   - Verify that the authenticated caller (`c.GetString("userId")`) matches the requested `userId` parameter, or that the caller possesses the `SYSTEM_ADMIN` role.
3. **Dictionary Service User Context Hardening**:
   - Split routes into public read routes vs. authenticated mutation routes.
   - Enforce `middleware.AuthMiddleware(jwtSecret)` on all mutation endpoints:
     - `POST /dictionary/translated` (Add word)
     - `POST /dictionary/item/:id/review2` (Review card)
     - `DELETE /dictionary/resources/:name/items/:id` (Delete word)
     - `DELETE /dictionary/resources/:name` (Delete resource)
     - `POST /dictionary/srs/today/refresh`
   - Refactor `getUserId(c)`: Read authenticated user ID strictly from Gin context (`c.Get("userId")`). Deprecate and remove fallback to unverified `c.Query("userId")` or arbitrary `X-User-Id` header.
4. **Media Service JWT Integration**:
   - Introduce JWT verification middleware into `substreamedu-media-service-go`.
   - Enforce authentication on:
     - `POST /media-service/subtitles/upload`
     - `DELETE /media-service/subtitles/:name`
     - `POST /media-service/ai/generate`
     - `GET /media-service/subtitles/admin/**`
   - Extract `userID` strictly from validated JWT claims.

---

## 3. Implementation Rules

### What to Touch:
- `substreamedu-gateway-go/cmd/gateway/main.go` (register TokenRevocation & SecurityHeaders in middleware chain).
- `substreamedu-gateway-go/internal/config/config.go` (remove or restrict public routing of internal auth endpoints).
- `substreamedu-iam-service-go/internal/router/router.go` and `internal/handler/user_handler.go` (enforce auth on `GET /users/:userId` and verify caller ownership).
- `substreamedu-dictionary-service-go/internal/router/router.go` and `internal/handler/dictionary_handler.go` (enforce JWT middleware on mutations, extract `userId` from context).
- `substreamedu-media-service-go/internal/router/router.go` and `internal/middleware/auth.go` (implement and apply JWT middleware).
- `substreamedu-frontend/src/services/SubtitleService.ts` and `DictionaryService.ts` (ensure Authorization headers are properly attached, eliminate query param user IDs).

### What NOT to Touch:
- Do NOT alter database tables or schemas.
- Do NOT break public healthcheck actuator endpoints (`/actuator/health`).
- Do NOT change FSRS calculation logic.

---

## 4. Verification Checklist
- [ ] Gateway returns `401 Unauthorized` for revoked tokens present in Redis blacklist.
- [ ] Public requests to `/api/auth/internal/user/...` through Gateway return `404 Not Found` or `403 Forbidden`.
- [ ] Attempting `GET /api/users/<other-user-uuid>` with a valid token of another regular user returns `403 Forbidden`.
- [ ] Attempting `POST /api/dictionary/translated` without an `Authorization: Bearer <jwt>` header returns `401 Unauthorized`.
- [ ] Spoofing `?userId=<victim-id>` in Dictionary API with a valid token for User B operates ONLY on User B's records, completely ignoring the spoofed query parameter.
- [ ] Attempting `POST /api/subtitles/upload` without a token returns `401 Unauthorized`.
- [ ] Unit tests for auth middleware and user handlers pass across all services.
