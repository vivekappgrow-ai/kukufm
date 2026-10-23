# StudyAI

An original, responsive study-and-audio-learning starter built with React, TypeScript, and Vite. It is intentionally branded and designed independently; it does not reuse KukuFM branding, assets, or course content.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```powershell
npm install
# Copy the configuration template and add LiveKit credentials on the server:
Copy-Item .env.example .env
# Terminal 1: run the LiveKit room API + Socket.IO signaling
npm run rooms
# Terminal 2: run the StudyAI UI
npm run dev
```

Open the local URL printed by Vite. Create a local demo profile to personalize the dashboard. No account or password is sent to a server.
Live Rooms need a LiveKit project URL, API key, and API secret in the server `.env`; credentials stay server-side. Device preview requires browser camera/microphone permission, and the lobby offers available input-device selection. `ROOMS_DEMO_MODE=true` only issues short-lived local-development identities; do not expose the demo API publicly. For production set it to `false`, configure `AUTH_JWT_SECRET`, and integrate an identity provider that issues signed HS256 tokens with `sub`, `name`, and trusted `ageBand`/`parentConsent` claims. Optionally configure issuer/audience checks using `AUTH_JWT_ISSUER` and `AUTH_JWT_AUDIENCE`. The development lobby checkbox is not verified parental consent. Use HTTPS/WSS, a proper identity provider, consent records, persistent database and moderation workflows before inviting students.

```powershell
npm run build
npm run preview
```

Regenerate the bundled six-subject demo catalog with:

```powershell
npm run seed:demo
npm run seed:rooms
```

## Included in this starter

- Responsive home, course discovery, course lesson, tutor, profile, quiz games, dashboard, and demo content studio screens
- Audio-first home catalog with browse chips, horizontal shelves, class/exam groupings, and a Hindi/English catalog toggle
- Six seeded demo subjects (Mathematics, Science, English, Hindi, GK, Computer), with five chapters and three lesson-unit labels per seeded course
- Search and subject filters, saved courses, course curriculum, and local learning progress
- Persistent mini-player backed by a real HTML audio element, with pause/resume, seeking, playback speed, volume, 10-second skip, chapter selection, sleep timer, and local playback-position resume
- One original sample narrated WAV lesson (`public/audio/physics-01.wav`) with a matching transcript; chapters without media are clearly marked unavailable and cannot be played
- Timestamped visual lesson slides that follow audio position and seek the sample player when selected; seeded sample slides are illustrative, not instructor-authored
- Timestamp bookmarks and personal chapter notes saved to local browser storage
- A sample practice quiz with explanations and locally saved results
- Local-only quiz room-code/game screens, progress dashboard, read-only parent preview, and content-upload preview
- Live Rooms screens with pre-join camera preview, invite link/code, schedule + `.ics`, participant grid/speaker/game layouts, mic/camera toggles, room-only chat, hand raise, reactions, host moderation and safety reporting
- LiveKit SFU media tokens issued only by the server; Socket.IO room signaling and server-timed quiz scoring when LiveKit credentials are configured
- An explicitly labeled sample tutor that does not send questions to an AI provider
- Local demo profile and progress in `localStorage`
- First-run learner setup for classes 1–12, UP Board/NCERT/CBSE, Hindi/Hinglish/English, and a persisted voice preference
- Six original voice profiles in `src/data/voices.ts`, with on-device browser speech previews, pitch/speed controls, and an auto-play-next preference
- Seven selectable themes (Dark, Light, AMOLED, Sunrise, Forest, Ocean, Kids Bright), persisted locally; first-time theme follows the operating-system color preference
- A web app manifest and production service worker shell cache
- Light/dark themes, keyboard-friendly controls, responsive mobile navigation, and reduced-motion styling

`.env.example` documents the room API configuration. Live Rooms use these server-side environment variables; LiveKit keys are not sent to the browser. Without LiveKit settings the rest of the demo runs, but joining media reports the missing provider configuration.

## Important: demo mode, not production authentication

This remains a demo-first starter. Live Rooms now have an Express/Socket.IO service and LiveKit integration, but **room metadata, schedule data, reports, and scores are in server memory (not a database); demo identities are not real authentication; there is no cloud sync, production identity provider, verified parent-consent workflow, live AI, paid content, payments, or persistent moderation/audit storage**. The room service is a single-process development implementation and rooms disappear when it restarts. Before production, use the identity-provider JWT contract described above, persistent shared storage, distributed rate limits, abuse review/escalation, retention policies, and a horizontally scalable room service. Profile details and course progress still live only in this browser's local storage. The deterministic course catalog is generated by `scripts/seed-demo.mjs`; seeded courses reuse the bundled sample WAV and are not reviewed course audio. Demo tutor responses are not live AI.

With valid LiveKit credentials and both local services running, room participants can make real audio/video calls and exchange moderated room chat/reactions. The lobby supports device selection, and the in-call layout includes grid/speaker/game modes, mic/camera toggles, host screen sharing, and a picture-in-picture attempt. Without LiveKit credentials, room creation, invites, schedule calendar files, and UI preview work, but joining media returns an explicit configuration error. Server quiz answers are checked against the server seed bank and scored by server receipt time. Public matchmaking is intentionally disabled; no 1:1 DMs are provided; recording is not implemented. Room reports are sent to the live host and held in memory for the current process only. Classroom waiting rooms, host mute/remove/lock/end, and host-started quiz rounds are included. Ludo, Carrom, Chess, Ask-a-Friend and Team mode entries currently launch the same seeded quiz-round flow; dedicated board and turn-rule implementations are still future work. Individual host mute behavior depends on LiveKit provider capabilities and participant permissions.

The room lobby's under-18 consent checkbox and onboarding guardian confirmation are only local demo gates. They are not verified parent/guardian consent. In production, the demo session endpoint is disabled; only a trusted auth JWT with a verified consent claim can enable under-18 room access. The admin upload screen selects a local file name but does not upload it. Dashboard charts include illustrative sample activity. Parent progress preview is local-only. Hindi/Hinglish/English selection is saved, but does not translate every existing page or seeded lesson. The six voice profiles and browser speech-synthesis previews are local UI/data mappings; selecting a profile does not yet synthesize course audio or change the sample WAV narrator. Seeded lesson units reuse placeholder narration; there is no separate video lesson asset, PDF pipeline, or provider-backed multi-narrator playback yet.

Do not use demo mode to collect real student information or to unlock paid content. Before production, add a server-side API, managed PostgreSQL/authentication, server-enforced authorization and entitlements, secure storage, validated AI provider adapters, verified payment webhooks, privacy/deletion workflows, and tests for those boundaries. Never expose provider, database, or payment secrets in browser code.

## Next implementation steps

1. Add a versioned API and PostgreSQL schema/migrations; replace local demo progress with authenticated, owner-scoped API operations.
2. Add verified sign-up, email confirmation, session handling, password reset, and backend role/permission checks.
3. Add authorized course/media management and secure streaming; replace the bundled demo WAV with licensed or approved course audio.
4. Add server-side AI provider adapters, per-user quotas, safe document ingestion/retrieval, and deterministic tests.
5. Implement server-scored assessments, subscriptions, payment webhooks, admin workflows, deployment configuration, and production monitoring.

## PWA

The app manifest is at `public/manifest.webmanifest`; the service worker is registered for production builds only. Installability and offline behavior should be verified on the target browsers after deploying to HTTPS. The worker caches the app shell and same-origin static assets; it deliberately does not intercept audio/video or range requests.
