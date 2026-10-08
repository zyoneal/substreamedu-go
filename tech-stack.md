# Tech Stack & Architecture Rules

## 1. Frontend
- **Framework:** React 18 (CRA/react-app-rewired) + TypeScript. Strict Mode обязателен.
- **Routing:** React Router v6.
- **State & Data Fetching:** React Query (TanStack Query v5) + Axios.
- **Styling:** TailwindCSS, CSS Modules.
- **Video & Subtitles:** `react-youtube`, `video.js`, `plyr`, `matroska-subtitles`.
- **Animations:** GSAP, Framer Motion (использовать точечно для осмысленных микроинтеракций).

## 2. Backend
- **Language:** Go 1.26.0
- **Architecture:** Микросервисы (Gateway, IAM, Media, Dictionary, Notification).
- **Communication:** REST / внутренняя связь сервисов.
- **Database:** PostgreSQL.

## 3. External API & Integrations
- **Translation / AI:** DeepSeek API (через бэкенд).
- **Auth:** Google OAuth.

## 4. Инженерные Правила
- Никакого `any` в TypeScript. Строгая типизация.
- Ошибки типизации блокируют деплой.
- DRY (Don't Repeat Yourself) — выносить общую логику в кастомные хуки и утилиты.
- Компоненты UI должны строиться на основе готовых паттернов (напр. Radix UI) с инкапсулированными стилями.
