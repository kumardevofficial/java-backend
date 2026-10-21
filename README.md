# JavaPrep Backend API

Standalone Node.js and Express backend for the JavaPrep frontend. This project is separate from the Vite frontend and uses MongoDB Atlas through Mongoose.

## Run locally

Requirements: Node.js 20 or newer and a MongoDB Atlas database.

```powershell
npm install
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Edit `.env` locally. If it already exists, keep your MongoDB URI and add/update the other keys instead of replacing the file. Set `MONGODB_URI` to your Atlas connection string and `JWT_SECRET` to a newly generated random value with at least 32 characters. Never commit `.env` or paste its values into frontend code. The backend exits at startup when either required value is missing or the JWT secret is a placeholder.

```powershell
npm run dev
```

Production start command: `npm start`. API listens on port 4000 by default. Health: `http://localhost:4000/api/health`; database readiness: `http://localhost:4000/api/ready`.

## Frontend connection

For local Vite use `VITE_API_BASE_URL=http://localhost:4000` in the frontend's local `.env`. The frontend should call the full API paths below and use `fetch(..., { credentials: 'include' })` (or Axios `withCredentials: true`) for every request, including login/signup. The token is in an HTTP-only cookie; JavaScript cannot and should not read it. Do not save an access token or any backend secret in localStorage/sessionStorage.

The Vercel frontend cannot reach a developer's `localhost`. Deploy this API separately and set the Vercel frontend's `VITE_API_BASE_URL` to the deployed API origin. In the backend host's Production environment, set `FRONTEND_ORIGINS` to `https://java-backend-interview-mcq.vercel.app,http://localhost:5173,http://127.0.0.1:5173` to permit the deployed frontend and local Vite app. Restart or redeploy after changing environment variables. Set `MONGODB_URI`, `JWT_SECRET` (or the legacy `AUTH_SECRET` name), and optional `GEMINI_API_KEY` in the backend host's environment only. For `/api/ready` failures, inspect function logs for the safe `reason` field; verify the production Mongo URI and secret are set, then ensure Atlas Network Access permits the backend host's outbound connection.

## Environment variables

| Variable | Required | Default / purpose |
|---|---|---|
| `NODE_ENV` | No | `development`; set `production` on deployment. |
| `PORT` | No | `4000`. |
| `FRONTEND_ORIGINS` | No | Comma-separated exact frontend origins; defaults to `http://localhost:5173`. Use the explicit list above in Vercel. |
| `MONGODB_URI` | Yes | Private MongoDB connection URI. |
| `JWT_SECRET` or `AUTH_SECRET` | Yes | Random secret, minimum 32 characters; `AUTH_SECRET` is a backward-compatible alias. Use a different value per environment. |
| `JWT_EXPIRES_IN` | No | `6h`; the authentication cookie uses the same lifetime. Set this to `6h` in Vercel Production. |
| `AUTH_COOKIE_NAME` | No | `javaprep_access`. |
| `AUTH_COOKIE_SAME_SITE` | No | `lax` locally and `none` in production. Production cookies are Secure. |
| `GEMINI_API_KEY` | No | Server-only key; growth analysis returns `AI_NOT_CONFIGURED` when omitted. |
| `GEMINI_MODEL` | No | `gemini-2.5-flash`. |

Atlas setup: create a database user with access only to the app database, allow the developer IP in Network Access, copy the driver connection URI, and substitute credentials/database. If any credential has been exposed, rotate it in Atlas before use.

## API conventions

All successful responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "error": { "code": "...", "message": "..." } }`. JSON request bodies are limited to 32 KB. Mutating browser requests require an allowlisted `Origin`; CORS is credentialed and allowlisted.

### Health

| Method and path | Auth | Purpose |
|---|---|---|
| `GET /api/health` | No | `200` while the API process is responding. |
| `GET /api/ready` | No | `200` if MongoDB is connected, otherwise `503`. |

### Authentication

Auth endpoints are limited to 20 requests per 15 minutes per client IP.

| Method and path | Request | Success |
|---|---|---|
| `POST /api/auth/signup` | `{ firstName, lastName, email, phone, password, confirmPassword }` | `201`, safe `data.user`, and HTTP-only auth cookie. |
| `POST /api/auth/login` | `{ email, password }` | `200`, safe `data.user`, and auth cookie. |
| `GET /api/auth/me` | No body | `200` with current safe `data.user`; requires cookie. |
| `POST /api/auth/logout` | No body | Clears the auth cookie and returns `{ message: "Signed out" }`. |

Sign-up trims names, lowercases email, normalizes an Indian 10-digit phone to `+91##########`, validates matching passwords, and hashes the password with bcrypt. `confirmPassword` is validation-only. Phone must begin with 6–9. Password must be 8–72 UTF-8 bytes. Login failure returns the generic `401 INVALID_CREDENTIALS` response. A duplicate email or phone returns `409 DUPLICATE_ACCOUNT`.

Example sign-up body:

```json
{
  "firstName": "Asha",
  "lastName": "Rao",
  "email": "asha@example.com",
  "phone": "9876543210",
  "password": "example-password",
  "confirmPassword": "example-password"
}
```

Safe user response shape: `{ id, firstName, lastName, email, phone, preferences, createdAt, updatedAt }`. The API never returns a password hash or access token in JSON.

### Profile and dashboard

All `/api/profile` routes require the authenticated cookie. All data is filtered by the authenticated account; clients must not send a user ID.

| Method and path | Request / filters | Response data |
|---|---|---|
| `GET /api/profile` | None | `{ user, overview }`; overview has `practiceQuestions`, `testsCompleted`, `accuracy` (percent or `null`), `savedAnnotations`, `activityEvents`. |
| `PATCH /api/profile` | Any subset of `{ firstName, lastName, phone }` | `{ user }`; rejects unsupported fields and empty updates. |
| `GET /api/profile/performance` | None | `{ scores, accuracy, questionsTracked, topics, progressOverTime }`; scores contain up to 100 completed tests. |
| `GET /api/profile/test-attempts?page=1&limit=20&testId=...` | Optional pagination and test filter | `{ items, pagination }`. |
| `POST /api/profile/test-attempts` | Body below | `201 { attempt }`. |
| `GET /api/profile/questions?page=1&limit=20&topicId=...&status=...` | Status: `attempted`, `bookmarked`, `incorrect` | `{ items, pagination }`. |
| `POST /api/profile/questions` | `{ questionId, topicId, status, selectedAnswer?, isCorrect? }` | `201 { question }`; upserts this user's question record. |
| `PATCH /api/profile/questions/:questionId` | `{ status }` | `{ question }`. |
| `GET /api/profile/annotations?page=1&limit=20&documentId=...&topicId=...` | Optional filters | `{ items, pagination }`. |
| `POST /api/profile/annotations` | Body below | `201 { annotation }`. |
| `PATCH /api/profile/annotations/:id` | Any subset of annotation fields | `{ annotation }`; only owner can update. |
| `DELETE /api/profile/annotations/:id` | None | `{ deleted: true }`; only owner can delete. |
| `GET /api/profile/activity?page=1&limit=20&activityType=...` | Activity type filter below | `{ items, pagination }`. |
| `POST /api/learning/activity` | `{ activityType, topicId?, referenceId?, correctCount?, totalCount?, durationSeconds? }` | `201 { activity }`. |
| `POST /api/profile/growth-analysis` | Optional `{ lookbackDays }`, 7–180; default 90 | `{ analysis, generatedAt, notice }`. |

Paginated endpoints default to `page=1`, `limit=20`; maximum `limit=50`. Pagination metadata is `{ page, limit, total, pages }`.

Test attempt body:

```json
{
  "testId": "class-test-1",
  "answers": [
    { "questionId": "class-test-1-001", "selectedAnswer": 0, "isCorrect": false }
  ],
  "score": 0,
  "questionCount": 1,
  "completionStatus": "completed",
  "startedAt": "2026-10-21T10:00:00.000Z",
  "completedAt": "2026-10-21T10:01:00.000Z",
  "durationSeconds": 60
}
```

`answers` is an array of `{ questionId, selectedAnswer?, isCorrect }`. Score must equal the number of correct answers and question IDs cannot repeat. Test questions and answer keys stay in the frontend; the backend stores submitted learning history and does not claim these client-calculated scores are tamper-proof.

Annotation body:

```json
{
  "documentId": "/book-notes/topics/arrays.pdf",
  "topicId": "arrays",
  "pageNumber": 7,
  "annotationType": "highlight",
  "selectedText": "Array length",
  "note": "",
  "anchor": { "x": 0.2, "y": 0.3 }
}
```

`annotationType` is `highlight` or `note`; `anchor` is optional position/selection metadata (JSON object, up to 6 KB). PDF files and full PDF text are not stored. Keep `documentId` stable, e.g. the frontend PDF path.

Activity types: `practice_answer`, `practice_completed`, `test_completed`, `topic_opened`, `annotation_created`, `recording_opened`.

### Gemini growth analysis

Gemini is called only by the backend using `GEMINI_API_KEY`. The backend sends aggregated scores, counts, and topic IDs only; it excludes contact information, passwords, profile data, PDF content, and annotation text. The endpoint is limited to 3 requests per hour per client IP. With no key it returns `503 AI_NOT_CONFIGURED`; provider errors return a safe `502`. Generated suggestions are estimates, not guarantees.

## Security and data notes

- Passwords are bcrypt-hashed (12 rounds). JWT access tokens are stored only in an HTTP-only cookie, default name `javaprep_access`, expiring in 15 minutes.
- Local cookie uses SameSite Lax. Production uses SameSite None and Secure for cross-site frontend/API calls. HTTPS is required in production. Some browsers restrict third-party cookies; serving frontend and API under a shared custom site domain is more reliable.
- Logout clears the cookie. JWTs are stateless, so a copied token cannot be revoked before its short expiry.
- CORS plus allowlisted Origin checks protect browser mutations. Configure exact frontend origins.
- Request bodies use explicit allowlists, preventing mass assignment. Every user-owned read and write uses the session user ID.
- MongoDB schemas have timestamps, validation, and indexes. Question activity is unique by `(userId, questionId)`.
- Frontend integration is still required: auth screens need API calls and loading/error handling; protect profile routes using `/api/auth/me`; dashboard sections need the matching profile calls; practice/tests and PDF annotations must submit activity records to persist.

## Tests

```powershell
npm test
```

Tests use `mongodb-memory-server`, not Atlas. Its MongoDB executable downloads on the first run and may be a large download. Tests cover signup validation/hash/cookie, login and session middleware, profile updates, owner isolation for annotations and learning records, health, and missing Gemini configuration.
