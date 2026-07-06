# Imagine — Four-Feature Build: Progress Notes

Written at end of session, 2026-07-06. Picks up after the video/short script
feature (see `IMAGINE_BUILD_PLAN.md` for that earlier feature's plan/history).

This session built four requested features together: (1) editable AI output
+ Remix, (2) platform policy flagging, (3) personal voice settings, (4)
profile/platform settings with clickable platform optimization and Open & Post.

## Status: all four features are DONE and verified working

Everything below was implemented, typechecks clean (`pnpm run typecheck` in
both `artifacts/api-server` and `artifacts/mobile` — only pre-existing,
unrelated errors remain, see "Known pre-existing issues" at the bottom), and
was tested live in a browser against the real Anthropic API with a real image
upload. Nothing here is a stub or partial implementation.

### Feature 1 — Editable AI output + Remix
- `artifacts/api-server/src/routes/remix.ts` — generic `POST /api/remix`
  (`{ text, instruction }` → `{ result }`), reused everywhere below.
- `artifacts/mobile/components/RemixableField.tsx` — shared component: a
  borderless `TextInput` (tap-and-type editing) plus an inline "Remix" button
  that opens a plain-English instruction box and rewrites just that field.
  Supports a `hideInput` prop for the one case (video script scenes) where
  editing already happens via manual TextInputs and only the Remix trigger
  is needed.
- Wired into all three content screens:
  - `app/(tabs)/index.tsx` (Create) — caption is a `RemixableField`.
  - `app/(tabs)/scripts.tsx` — hook, each scene's voiceover (via a
    `hideInput` RemixableField + manual TextInputs for visual/voiceover/
    on-screen text), caption, and CTA are all editable/remixable.
  - `app/(tabs)/repurpose.tsx` — every generated format result is editable/
    remixable.
- Verified live: typed "make it shorter, one sentence only" into a real
  caption's Remix box and got back a correctly shortened single sentence.

### Feature 2 — Platform policy flagging
- `artifacts/api-server/src/lib/policyKb.ts` — curated, plain-language rule
  text per platform (Instagram/TikTok/YouTube/Facebook/X/LinkedIn/Pinterest/
  Snapchat/Threads/Reddit) × category (nudity, graphic violence, hate
  speech, copyright, age-restricted substances, dangerous activities,
  harassment), plus Imagine's own baseline guidelines per category.
  **Design choice:** the model only classifies which categories apply (a
  fixed enum) — the actual rule text shown to the user always comes from
  this curated KB, never from the model's memory, to avoid hallucinated
  citations.
- `POST /api/analyze-media` (in `media.ts`) now also returns `policyFlags`
  from scanning the uploaded image.
- `POST /api/policy-check-text` (new, `policy-check.ts`) — text-only scan,
  used to re-check the caption whenever it's edited/remixed.
- `components/PolicyWarnings.tsx` — friendly amber "Heads up!" card, one
  entry per flag with platform + rule title + exact rule text + a
  non-punitive closing line ("edit your content or choose a different
  platform — totally your call").
- In `index.tsx`: image is scanned at analysis time; caption is re-scanned
  1.2s after the user stops typing (debounced), merging new text-flags
  with existing image-flags (tagged by `source: "image" | "text"` so one
  check never wipes the other).
- **Scoping decision (intentional, not a gap):** policy scanning only runs
  on the Create screen, since that's the only screen with real media
  upload. Repurpose/Scripts text outputs are not scanned — flag this to the
  user if they want it extended there.

### Feature 3 — Personal voice settings
- `lib/settings.ts` — `VOICE_OPTIONS` (5 fixed styles), persisted via
  `@react-native-async-storage/async-storage` (device-local, no
  auth/backend involved — this was already an unused dependency in the
  project, a strong signal it was intended for exactly this).
- `app/(tabs)/settings.tsx` — voice picker (pill buttons, same pattern as
  existing tone pickers elsewhere in the app).
- `index.tsx` — one-line optional "Add anything personal about this
  moment" box; both `voice` and `personalContext` are sent to
  `/api/analyze-media` and woven into the prompt.
- Backend prompt (`media.ts`) rewritten with an explicit bad/good example
  pair (matching the user's own examples) forcing short, conversational,
  "texting a friend" captions by default, with per-voice style guidance
  layered on top.
- Verified live: personal context "this is our team mascot logo, we just
  redesigned it" + Funny & Light voice produced: *"We finally redesigned
  our mascot and honestly? She goes hard. The old one had a good run but
  this thing is built different. ⚡"* — short, natural, context woven in
  correctly.

### Feature 4 — Profile & platform settings
- `lib/settings.ts` / `settings.tsx` — 11 platform handles (Instagram,
  TikTok, X, Facebook, LinkedIn, Pinterest, Snapchat, Threads, Reddit,
  YouTube, Substack), auto-saved per field with a "Saved" flash, persisted
  via AsyncStorage — confirmed surviving navigation away and back.
- `lib/platforms.ts` — per-platform metadata: icon, a style hint used to
  build the "optimize for this platform" Remix instruction, a profile URL
  builder, and (for X and Reddit only) a real compose-URL with the caption
  pre-filled via query param, since those two are the only platforms whose
  web intent URLs actually support text prefill without API approval.
- `index.tsx` — tapping a suggested platform: highlights it, calls
  `/api/remix` with an instruction built from that platform's style hint,
  replaces the caption with the rewritten version, and reveals an
  "Open {Platform} & Post" button using the user's real saved handle.
  Preview card's handle now shows the real `@handle` once a platform is
  selected (falls back to "your.handle" placeholder otherwise).
- Verified live: tapping Instagram rewrote the caption to a more
  emoji-heavy, engagement-style caption and correctly suggested Instagram/
  Pinterest/Reddit (not TikTok/LinkedIn) as fits.

### Bug found and fixed during testing (real, not test-only)
`openAndPost`'s original implementation did `await Clipboard.setStringAsync(...)`
**before** calling `window.open(...)` on web. Browsers only allow
`window.open` within the synchronous call stack of a trusted user gesture
(click) — once you `await` something first, the browser silently blocks the
popup. Fixed by calling `window.open` first (synchronously), then awaiting
the clipboard write. Confirmed fixed: a real new tab opens to
`https://www.instagram.com/` and the clipboard holds the caption.

## New/changed files this session

Backend:
- `artifacts/api-server/src/lib/policyKb.ts` (new)
- `artifacts/api-server/src/routes/media.ts` (extended: voice, personalContext, policyFlags)
- `artifacts/api-server/src/routes/remix.ts` (new)
- `artifacts/api-server/src/routes/policy-check.ts` (new)
- `artifacts/api-server/src/routes/index.ts` (registered new routes)
- `artifacts/api-server/src/app.ts` (bumped JSON body limit to 15mb — needed earlier for photo uploads, still relevant)

Frontend:
- `artifacts/mobile/app/(tabs)/index.tsx` (Create screen — all 4 features integrated)
- `artifacts/mobile/app/(tabs)/scripts.tsx` (Remix added)
- `artifacts/mobile/app/(tabs)/repurpose.tsx` (Remix added)
- `artifacts/mobile/app/(tabs)/settings.tsx` (new screen)
- `artifacts/mobile/app/(tabs)/_layout.tsx` (Settings added as 4th tab)
- `artifacts/mobile/components/RemixableField.tsx` (new)
- `artifacts/mobile/components/PolicyWarnings.tsx` (new)
- `artifacts/mobile/hooks/useSettings.ts` (new)
- `artifacts/mobile/lib/settings.ts`, `lib/platforms.ts`, `lib/apiBase.ts`, `lib/remix.ts` (new)

## What's NOT done / follow-ups for next session

1. **Policy scanning is Create-screen-only.** If the user wants Scripts/Repurpose
   text also scanned, that's a small addition (the `/api/policy-check-text`
   endpoint already exists and is reusable) but wasn't wired in there.
2. **No native (iOS/Android) testing this session** — everything was verified
   via Expo web in a browser. `expo-video-thumbnails` (native video frame
   extraction) was tested in isolation in an earlier session, not re-tested
   with the new 4-feature flow. Worth a real-device pass before shipping.
3. **Video-upload path not re-tested this session** — only the photo path
   was exercised against the new caption/voice/context/policy pipeline.
4. **Threads and Substack use fallback icons** (`at` and
   `newspaper-variant-outline`) since MaterialCommunityIcons has no
   dedicated glyphs for them. Cosmetic only.
5. **"Open & Post" is copy-to-clipboard + open-URL, not true one-click
   posting** — this was explicit in the original ask ("eventually this
   becomes full one-click posting when we get API approvals"), not a gap.
6. **Settings are device-local only** (AsyncStorage, no account/sync). Fine
   for a single-device use case; would need real backend + auth to sync
   across devices, which hasn't been discussed/requested.
7. Nothing has been committed yet as of this note being written — see next
   section.

## Known pre-existing issues (not introduced this session, don't re-fix blindly)

- `artifacts/mobile/hooks/useColors.ts` has a pre-existing TS2352 type error
  (unrelated cast issue), present before this session started.
- All API route files show a `TS6305` project-reference build error and two
  `TS7006` implicit-any errors tied to `lib/integrations-anthropic-ai`'s
  build output not being pre-built — this is a repo-wide tsconfig
  project-references quirk, confirmed present on `main` before any of this
  work began. Runtime is unaffected (esbuild bundles from source directly).
- No test framework exists anywhere in the repo (still true).
- `/repurpose`, `/video-script`, `/analyze-media`, `/remix`,
  `/policy-check-text` are still not registered in
  `lib/api-spec/openapi.yaml` — the Orval-generated client pipeline has
  never been used for any content-generation endpoint, this one included.

## Commit plan

Everything described above is complete and ready to commit as one feature
commit (four features were built together since they're interdependent —
matches how the work was requested). Dev servers were stopped cleanly
before this commit; nothing is running in the background.
