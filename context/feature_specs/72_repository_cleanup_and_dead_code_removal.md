# Feature Spec 72: Repository Cleanup & Dead Code Removal

## Context & Objectives
Repository audit revealed ~400 MB of dead binary files, stale compiled artifacts, obsolete standalone scripts, abandoned test harnesses, and unused frontend/backend code:
1. `substreamedu-dictionary-service-go/main` (36.4 MB Linux ELF binary mistakenly committed to git).
2. `generated_videos/` (346 MB, 71 unreferenced .mp4 test files).
3. Temporary file `substreamedu-notification-service-go/go_sum_additions.txt`.
4. Stale root/docs scripts and documents (`rebuild_notification.sh` with hardcoded Windows paths, `rebuild_frontend.sh`, `admin_init.sql`, `reset_srs_progress.sql`, `tune_db.sql`, `docs/wordstream-architecture.json`, `docs/architecture.html`, early markdown drafts `APPLE_DESIGN_PLAN.md`, `Design.md`, `PRD.md`, `tech-stack.md`, and unused foreign language packs `ai-harness/packs/**`).
5. Frontend dead assets and stray files: root `1.png`, root `favicon.ico`, `test-android-selection.html`, unreferenced `optimize-background.js`, `public/optimized/`, `public/background.png`, `public/screenshots/YouTubeScreen.png`, `public/assets/` dead images, unused public svg icons, `src/background.png`, `src/data/songLyrics.json`, `src/assets/images/*`, `src/assets/fonts/e-UkraineHead-*.otf`, and 47 unused icons in `src/icons/` (preserving `google.svg`).
6. Frontend dead source modules: `ui/badge.tsx`, `ui/separator.tsx`, `tokens.module.css`, `src/lib/index.ts`, `HomePage.module.css.responsive`, test-only islands `src/lib/clock/**`, `src/lib/sync/**`, `src/lib/jsonl/**`, `src/lib/events/**`, and dummy `SmoothScroll.tsx` (with removal from `HomePage.tsx` and `react-app-env.d.ts`).
7. Go dead code: unused `algorithmParamsFromModel` in `learning_service.go`, unused `type cacheEntry` in `cache.go`, unused `mu` in `proxy.go`, and unused `generateRSAKeyPair` in `rs256_service.go`.

## Allowed files
- `substreamedu-dictionary-service-go/main`
- `substreamedu-notification-service-go/go_sum_additions.txt`
- `generated_videos/**`
- `admin_init.sql`
- `reset_srs_progress.sql`
- `tune_db.sql`
- `rebuild_frontend.sh`
- `rebuild_notification.sh`
- `docs/wordstream-architecture.json`
- `docs/architecture.html`
- `APPLE_DESIGN_PLAN.md`
- `Design.md`
- `PRD.md`
- `tech-stack.md`
- `ai-harness/**`
- `k8s/**`
- `.github/workflows/deploy.yml`
- `nginx/**`
- `.gitlab-ci.yml`
- `grafana/provisioning/**`
- `substreamedu-frontend/sonar-project.properties`
- `substreamedu-frontend/DESIGN.md`
- `substreamedu-reel/**`
- `substreamedu-frontend/1.png`
- `substreamedu-frontend/favicon.ico`
- `substreamedu-frontend/test-android-selection.html`
- `substreamedu-frontend/optimize-background.js`
- `substreamedu-frontend/public/optimized/**`
- `substreamedu-frontend/public/background.png`
- `substreamedu-frontend/public/screenshots/**`
- `substreamedu-frontend/public/assets/**`
- `substreamedu-frontend/public/dictionary_icon.svg`
- `substreamedu-frontend/public/music_icon.svg`
- `substreamedu-frontend/public/repetition_icon.svg`
- `substreamedu-frontend/public/subtitles_icon.svg`
- `substreamedu-frontend/public/telegram_icon.svg`
- `substreamedu-frontend/public/text_icon.svg`
- `substreamedu-frontend/public/upload_icon.svg`
- `substreamedu-frontend/public/chevron-down.svg`
- `substreamedu-frontend/public/logo-new.jpg`
- `substreamedu-frontend/public/substream-logo.png`
- `substreamedu-frontend/src/background.png`
- `substreamedu-frontend/src/data/songLyrics.json`
- `substreamedu-frontend/src/assets/images/**`
- `substreamedu-frontend/src/assets/fonts/e-UkraineHead-LOGO.otf`
- `substreamedu-frontend/src/assets/fonts/e-UkraineHead-Thin.otf`
- `substreamedu-frontend/src/assets/fonts/e-UkraineHead-UltraLight.otf`
- `substreamedu-frontend/src/icons/**`
- `substreamedu-frontend/src/components/ui/badge.tsx`
- `substreamedu-frontend/src/components/ui/separator.tsx`
- `substreamedu-frontend/src/components/Subscribe/styles/tokens.module.css`
- `substreamedu-frontend/src/lib/index.ts`
- `substreamedu-frontend/src/components/HomePage/HomePage.module.css.responsive`
- `substreamedu-frontend/src/lib/clock/**`
- `substreamedu-frontend/src/lib/sync/**`
- `substreamedu-frontend/src/lib/jsonl/**`
- `substreamedu-frontend/src/lib/events/**`
- `substreamedu-frontend/src/components/HomePage/pixzen/SmoothScroll.tsx`
- `substreamedu-frontend/src/components/HomePage/pixzen/SmoothScroll.test.tsx`
- `substreamedu-frontend/src/components/HomePage/HomePage.tsx`
- `substreamedu-frontend/src/components/HomePage/HomePage.test.tsx`
- `substreamedu-frontend/src/react-app-env.d.ts`
- `substreamedu-dictionary-service-go/internal/service/learning_service.go`
- `substreamedu-gateway-go/internal/middleware/cache.go`
- `substreamedu-gateway-go/internal/proxy/proxy.go`
- `substreamedu-iam-service-go/internal/service/rs256_service.go`
- `context/progress_tracker.md`

## Verification
- `./verify.sh` passes cleanly (anti-tamper, spec scope boundary, Go tests & vet, Frontend tsc & jest).
- Zero broken imports or references across frontend and backend.
