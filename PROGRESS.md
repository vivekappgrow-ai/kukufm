# StudyAI implementation progress

This ledger reflects verified repository state. Anything labeled partial is not production-ready.

| Phase | Status | Notes |
|---|---|---|
| 1. Design system and app shell | Complete | Existing responsive React shell, seven persisted themes, lazy catalog routes, keyboard/focus/reduced-motion support; theme tokens and Settings live-preview picker added. |
| 2. Pages | Partial | Home, Explore, New & Hot, Search, Series, Lesson, Library, Profile, Progress, Parent, Settings, Admin and Pricing routes exist. AI Tutor and some downloads/admin flows remain previews. |
| 3. Onboarding and profiles | Partial | Local onboarding, class/board/language/voice selection and guest demo exist; no verified guardian consent, multi-child accounts or real auth provider. |
| 4. Player | Partial | Real HTML audio for available sample, resume, speed, seek, queue, bookmarks and notes exist; no Media Session, generated content coverage or full video controls/lesson recap workflow. |
| 5. AI Tutor | Not done | Current tutor is explicitly a local demo; no safe provider adapter, camera vision, RAG, quotas or production LiveKit tutor agent. |
| 6. Real content and media | Partial | Fifteen original Class 5 Maths/Science lessons and idempotent generation pipeline exist; more curriculum coverage and provider-generated assets require content review, credentials and generation. |
| 7. Pricing and payments | Partial | Editable plan data and transparent pricing preview exist; Razorpay checkout/webhook route layer is now restored but still requires verified provider credentials and legal review. |
| 8. Backend, data and admin | Partial | LiveKit room API is present; route layer, persistent data store, and payment/admin scaffolding are in place, but production auth and provider secrets are still required. |
| 9. Safety, privacy and quality | Partial | Demo consent boundaries and room rate limits exist; add provider-independent safety, deletion and focused tests before production. |

## Changed in this implementation

- `src/App.tsx`: restored StudyAI as the root product and passed persisted theme state to the catalog routes.
- `src/styles.css`: added semantic accent, typography and spacing token aliases.
- `src/pages/catalog-pages.tsx`: added the live theme preview to Settings.
- `index.html`: StudyAI metadata and title restored.
- `server/payments.mjs`: removed malformed diff markers and restored the fail-closed Razorpay subscription/webhook route logic.
- `server/index.mjs`: registered payment routes and enabled raw webhook parsing for Razorpay signature verification.
- `npm run build`: verified the repo still compiles successfully after the restoration.

## Environment

See `.env.example`. Existing server-side variables include LiveKit credentials, `OPENAI_API_KEY`, and auth/session configuration. Never put secrets in `VITE_*` variables. Payment, database, vision and embedding providers are not configured.

## Known gaps

- This remains a local demo; authentication, parental consent, progress, billing, downloads and admin content approval are not server-backed.
- Do not collect real child data or accept payments until verified consent, authorization, provider integration, deletion, security review and legal review are complete.
