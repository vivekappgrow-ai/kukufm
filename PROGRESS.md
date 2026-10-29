# StudyAI implementation progress

This ledger reflects verified repository state. Anything labeled partial is not production-ready.

| Phase | Status | Notes |
|---|---|---|
| 1. Design system and app shell | Complete | Existing responsive React shell, seven persisted themes, lazy catalog routes, keyboard/focus/reduced-motion support; theme tokens and Settings live-preview picker added. |
| 2. Pages | Partial | Added Current Affairs & Practice and Study Planner routes with authenticated APIs. AI Tutor, admin and some download flows still have preview or partial boundaries. |
| 3. Onboarding and profiles | Partial | Local onboarding, class/board/language/voice selection and guest demo exist; no verified guardian consent, multi-child accounts or real auth provider. |
| 4. Player | Partial | Real HTML audio for available sample, resume, speed, seek, queue, bookmarks and notes exist; authenticated chapter positions now sync through the backend, while guest totals remain local. No Media Session, generated content coverage or full video controls/lesson recap workflow. |
| 5. AI Tutor | Not done | Current tutor is explicitly a local demo; no safe provider adapter, camera vision, RAG, quotas or production LiveKit tutor agent. |
| 6. Real content and media | Partial | Fifteen original Class 5 Maths/Science lessons and idempotent generation pipeline exist; more curriculum coverage and provider-generated assets require content review, credentials and generation. |
| 7. Pricing and payments | Partial | Editable plan data and transparent pricing preview exist; Razorpay checkout/webhook route layer is now restored but still requires verified provider credentials and legal review. |
| 8. Backend, data and admin | Partial | Added PostgreSQL tables and authenticated APIs for allowlisted RSS sources/articles, admin review, MCQs, study plans, tasks and timed focus sessions. The in-process RSS scheduler is single-instance only; identity lifecycle, distributed scheduling, persistent room reports/audit, migrations and providers remain missing. |
| 9. Safety, privacy and quality | Partial | Demo consent boundaries and room rate limits exist; add provider-independent safety, deletion and focused tests before production. |

## Changed in this implementation

- `src/App.tsx`: restored StudyAI as the root product and passed persisted theme state to the catalog routes.
- `src/styles.css`: added semantic accent, typography and spacing token aliases.
- `src/pages/catalog-pages.tsx`: added the live theme preview to Settings.
- `index.html`: StudyAI metadata and title restored.
- `server/payments.mjs`: removed malformed diff markers and restored the fail-closed Razorpay subscription/webhook route logic.
- `server/index.mjs`: PostgreSQL schema initialization now runs before the HTTP listener; startup fails closed if it cannot complete. Demo JWTs use a process-random signing key if none is configured.
- `server/progress.mjs`: added authenticated owner-scoped read/write routes for course-chapter playback progress.
- `src/App.tsx`: authenticated tutor sessions load and sync chapter positions; guest progress remains browser-local.
- `tests/progress.test.mjs`: added API validation and cross-user isolation tests.
- `server/current-affairs.mjs`, `server/current-affairs-routes.mjs`, `server/data/schema.sql`, and `server/data/store.mjs`: added allowlisted RSS/Atom ingestion with retries, URL deduplication, PostgreSQL/memory persistence, approval-gated publishing, question approval, server-side scoring and user-scoped bookmarks/history.
- `src/pages/current-affairs-page.tsx` and `src/App.tsx`: added the authenticated Current Affairs & Practice page, filters, source links, MCQ flow, review panel and URL route.
- `tests/current-affairs.test.mjs`: covers RSS date/source preservation, deduplication, approval, role checks, owner isolation, hidden answer keys, negative marking and retries.
- `server/study-plan.mjs`, `server/data/schema.sql`, and `server/data/store.mjs`: added authenticated daily-goal/timetable APIs and server-timed, exclusive focus/break sessions with UTC weekly study summaries.
- `src/pages/study-planner-page.tsx` and `src/App.tsx`: replaced the Study Planner “coming soon” action with the persistent target, task, timer and weekly progress UI.
- `tests/study-plan.test.mjs`: covers validation, per-user task/timer isolation, premature finish rejection and saved focus totals.
- `server/current-affairs-routes.mjs` and `src/pages/current-affairs-page.tsx`: added server-validated 10/25/50 question-count caps; only the approved questions actually available are returned.
- `README.md`: documented endpoints, scheduler limits, feed restrictions and the remaining scope gaps.

## Environment

See `.env.example`. PostgreSQL (`DATABASE_URL`) is optional for local development; memory storage is not durable. Existing server-side variables include LiveKit credentials, `OPENAI_API_KEY`, and auth/session configuration. Never put secrets in `VITE_*` variables. Payment, database, vision and embedding providers are not configured.

## Known gaps

- This remains a local demo; there is no production sign-up/login/verification lifecycle, trusted parental-consent workflow, or server-backed billing/downloads. Current affairs persistence requires configured PostgreSQL; memory storage is development-only. The RSS scheduler is process-local and needs a dedicated worker/lock for multiple API replicas.
- Current affairs has no generated notes/PDFs, verified syllabus/previous-year question catalog, timed full-length mocks, ranks, notification delivery, or verified automated fact-check. Articles/questions are source-preserving drafts until admin approval; no feed or exam data is bundled as real content.
- The Advanced add-on is not a complete implementation of every requested area. The README status table records current Live Rooms, AI, subscription, community, careers, accessibility, admin and reliability boundaries; persistent class schedules/attendance, verified job-alert directory, server-backed rewards, billing lifecycle, OCR, community moderation, and production compliance remain unimplemented.
- Do not collect real child data or accept payments until verified consent, authorization, provider integration, deletion, security review and legal review are complete.
