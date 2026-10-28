# StudyAI implementation progress

This ledger reflects verified repository state. Anything labeled partial is not production-ready.

| Phase | Status | Notes |
|---|---|---|
| 1. Design system and app shell | Complete | Existing responsive React shell, seven persisted themes, lazy catalog routes, keyboard/focus/reduced-motion support; theme tokens and Settings live-preview picker added. |
| 2. Pages | Partial | Home, Explore, New & Hot, Search, Series, Lesson, Library, Profile, Progress, Parent, Settings, Admin and Pricing routes exist. AI Tutor and some downloads/admin flows remain previews. |
| 3. Onboarding and profiles | Partial | Local onboarding, class/board/language/voice selection and guest demo exist; no verified guardian consent, multi-child accounts or real auth provider. |
| 4. Player | Partial | Real HTML audio for available sample, resume, speed, seek, queue, bookmarks and notes exist; authenticated chapter positions now sync through the backend, while guest totals remain local. No Media Session, generated content coverage or full video controls/lesson recap workflow. |
| 5. AI Tutor | Not done | Current tutor is explicitly a local demo; no safe provider adapter, camera vision, RAG, quotas or production LiveKit tutor agent. |
| 6. Real content and media | Partial | Fifteen original Class 5 Maths/Science lessons and idempotent generation pipeline exist; more curriculum coverage and provider-generated assets require content review, credentials and generation. |
| 7. Pricing and payments | Partial | Editable plan data and transparent pricing preview exist; Razorpay checkout/webhook route layer is now restored but still requires verified provider credentials and legal review. |
| 8. Backend, data and admin | Partial | Express/Socket.IO routes, PostgreSQL schema startup, owner-scoped progress API, AI quota storage, and payment scaffolding exist. Production identity/auth lifecycle, persistent rooms/reports/audit data, admin workflows, versioned migrations, and provider credentials remain missing. |
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

## Environment

See `.env.example`. PostgreSQL (`DATABASE_URL`) is optional for local development; memory storage is not durable. Existing server-side variables include LiveKit credentials, `OPENAI_API_KEY`, and auth/session configuration. Never put secrets in `VITE_*` variables. Payment, database, vision and embedding providers are not configured.

## Known gaps

- This remains a local demo; there is no production sign-up/login/verification lifecycle, trusted parental-consent workflow, server-backed billing, downloads or admin content approval. Progress APIs persist only when a configured PostgreSQL database and trusted bearer identity are used.
- Do not collect real child data or accept payments until verified consent, authorization, provider integration, deletion, security review and legal review are complete.
