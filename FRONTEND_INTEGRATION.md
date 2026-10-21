# Frontend AI handoff

Use this document and `README.md` as the backend source of truth when integrating the JavaPrep React/Vite frontend. The complete API is in this separate backend project. Do not invent endpoints or put backend secrets in the frontend.

## API connection

- Local API origin: `http://localhost:4000`
- Set the frontend's public Vite value to `VITE_API_BASE_URL=http://localhost:4000` locally.
- Deployed frontend: `https://java-backend-interview-mcq.vercel.app/`. It cannot call a developer's localhost. After backend deployment, set Vercel's `VITE_API_BASE_URL` to the deployed API origin and redeploy.
- Backend `FRONTEND_ORIGINS` must list exact allowed origins, comma-separated. For local and deployed frontend use `https://java-backend-interview-mcq.vercel.app,http://localhost:5173,http://127.0.0.1:5173`.
- Use `fetch(url, { credentials: 'include' })` or Axios `{ withCredentials: true }` on auth and authenticated requests. The API sets an HTTP-only cookie; do not store or access a token in localStorage.
- Never expose MongoDB URI, JWT secret, or Gemini key in frontend code or any `VITE_` variable.

## Implement these frontend connections

1. Connect `/signup` to `POST /api/auth/signup` with `{ firstName, lastName, email, phone, password, confirmPassword }`. Keep the existing form validation; the server normalizes Indian phones and email. Show loading, field validation, duplicate account, and general server errors.
2. Connect `/login` to `POST /api/auth/login` with `{ email, password }`. Do not reveal whether the email or password was wrong; the API returns a generic credential error.
3. On app startup and protected `/profile` navigation, call `GET /api/auth/me` to restore the session. On logout call `POST /api/auth/logout` and clear client user state. Treat `401 UNAUTHENTICATED` as signed out.
4. Connect profile overview and edit to `GET /api/profile` and `PATCH /api/profile` (`firstName`, `lastName`, `phone` only).
5. Connect dashboard sections using `GET /api/profile/performance`, `GET /api/profile/test-attempts`, `GET /api/profile/questions`, `GET /api/profile/annotations`, `GET /api/profile/activity`, and optionally `POST /api/profile/growth-analysis`.
6. Submit test results to `POST /api/profile/test-attempts`, practice question records to `POST /api/profile/questions`, and activity to `POST /api/learning/activity`. Keep existing class-test question content unchanged. Scores are client-calculated history and are not tamper-proof.
7. If/when the PDF viewer gets annotation UI, use annotation endpoints below. Existing PDF files stay frontend static assets; only annotation metadata is sent to the API.
8. Never send a user ID. The backend associates each record with the authenticated cookie.

## Endpoint inventory

### Public

- `GET /api/health`
- `GET /api/ready` — returns 503 until MongoDB is connected
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me` — requires auth

### Authenticated profile and learning

- `GET /api/profile`
- `PATCH /api/profile`
- `GET /api/profile/performance`
- `GET /api/profile/test-attempts?page=1&limit=20&testId=...`
- `POST /api/profile/test-attempts`
- `GET /api/profile/questions?page=1&limit=20&topicId=...&status=...`
- `POST /api/profile/questions`
- `PATCH /api/profile/questions/:questionId`
- `GET /api/profile/annotations?page=1&limit=20&documentId=...&topicId=...`
- `POST /api/profile/annotations`
- `PATCH /api/profile/annotations/:id`
- `DELETE /api/profile/annotations/:id`
- `GET /api/profile/activity?page=1&limit=20&activityType=...`
- `POST /api/learning/activity`
- `POST /api/profile/growth-analysis` — optional `{ lookbackDays }` (7–180; default 90); requires server `GEMINI_API_KEY`

Paginated lists default to page 1 and 20 items; maximum limit is 50. The README has full accepted bodies, response shapes, filters, error codes, and sample payloads.

## Response/error handling

Success envelope: `{ "success": true, "data": ... }`. Error envelope: `{ "success": false, "error": { "code": "...", "message": "..." } }`. Handle `401` as signed out, `409 DUPLICATE_ACCOUNT` as an account conflict, `422 VALIDATION_ERROR` as invalid submitted data, `429 RATE_LIMITED` with a retry message, and network/5xx errors with a friendly fallback. Do not show raw unexpected server errors or log passwords/cookies.

## Auth cookie and deployment note

The API returns a safe user profile in JSON and sets an HTTP-only JWT cookie (15-minute expiry); no token is returned in JSON. Local cookies use SameSite Lax; production cross-site cookies use SameSite None + Secure over HTTPS. The backend uses allowlisted CORS and Origin checks for browser mutations. Some browsers block third-party cookies when frontend and API are on unrelated sites; a shared custom site domain is more reliable.

## Backend endpoints that are not frontend work

Do not implement authentication or profile persistence locally as a substitute for the API. If a requested UI feature has no corresponding endpoint or stored data shape in `README.md`, report the missing backend requirement instead of inventing a contract. Keep the frontend's current visual design, routes, class-test questions, and PDF files intact unless a change is necessary for API integration.
