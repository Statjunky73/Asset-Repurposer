# Imagine — Master Handoff Document

**Read this file first.** It's the single source of truth for where this
project stands. If you're a new Claude Code session picking this up, this
document should let you understand the whole project and continue without
re-deriving context from git history or asking the user to re-explain
things.

Last updated: 2026-07-07 (end of session that added per-photo text
overlays, on top of earlier sessions that added multi-photo carousel post
creation and, before that, editable output/Remix, policy flagging, voice
settings, and profile/platform settings).

---

## 1. App name and tagline

**Imagine** — *"Your idea goes in. Imagine gets it out — to the world!"*

Note: the in-app UI still shows the older working name **"Repurpose.ai"**
in header logos across all screens. Renaming the visible brand to "Imagine"
has never been done and was explicitly deferred as a user decision, not an
oversight — see §10.

---

## 2. What the app does (full vision)

Imagine lets anyone type a plain-English idea, or hand over a photo/video,
and get back ready-to-post content:

- Short video scripts (TikTok, Reels, YouTube Shorts) — **built**
- Social media posts for every platform, from raw text — **built**
  (this is the original "repurposing" feature)
- AI analysis of an uploaded photo/video → caption, hashtags, platform
  suggestions, post preview — **built** (this is the flagship "Create" flow)
- Blog articles, stories, emails, podcasts — **not built**
- AI image prompts — **not built**

On top of content generation, the app is meant to feel like **"handing your
phone to a smart creative friend who instantly knows what to write and
where to post it"** — this tone requirement shaped a lot of prompt design
(see §10).

---

## 3. Everything built so far

### 3.0 Project structure (for orientation)

Not an Nx monorepo — a **pnpm workspace** monorepo:
- `artifacts/mobile` — Expo/React Native 0.81 + React 19, Expo Router (file-based routes), the actual app
- `artifacts/api-server` — Express 5 + TypeScript, all backend routes
- `lib/integrations-anthropic-ai` — Anthropic SDK client wrapper (`anthropic` export) + batch helpers
- `lib/db` — Drizzle/Postgres schema (`conversations`, `messages` tables) — **exists but is unused by any feature**
- `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` — Orval/OpenAPI codegen pipeline — **not used by any content-generation endpoint**, they all call `fetch` directly instead

### 3.1 Feature: Content Repurposing (original feature, pre-dates this session's plan)

One raw text input → fans out into multiple social formats in one Claude call.

- Backend: `artifacts/api-server/src/routes/repurpose.ts` — `POST /api/repurpose`
- Frontend: `artifacts/mobile/app/(tabs)/repurpose.tsx` — "Repurpose" tab
- Formats: tweet thread, LinkedIn post, TikTok hook, email subjects, newsletter blurb, YouTube description
- **Status: done**, plus this session added Remix editing (see 3.4) to every result block.

### 3.2 Feature: Video/Short Script Generator

Plain-English video idea → structured scene-by-scene script for TikTok/Reels/Shorts.

- Backend: `artifacts/api-server/src/routes/video-script.ts` — `POST /api/video-script`
- Frontend: `artifacts/mobile/app/(tabs)/scripts.tsx` — "Scripts" tab
- Structured output: hook + 2 alternates, scenes (visual/voiceover/on-screen text/duration), caption, hashtags, CTA, estimated duration
- **Status: done**, plus this session added Remix editing (hook, scene voiceover, caption, CTA — see 3.4).

### 3.3 Feature: Create (photo/video → AI-written post) — the flagship feature

Upload a photo or video → Claude (vision) analyzes it → writes a caption, hashtags, and suggests which of 10 platforms to post to → shows a mock post preview.

- Backend: `artifacts/api-server/src/routes/media.ts` — `POST /api/analyze-media`
  - Accepts `{ mediaType, imageBase64, mimeType, voice, personalContext }`
  - For video, the **client** extracts one representative frame first (see below) — Claude's API doesn't accept video directly, only images
  - Returns `{ result: { summary, caption, hashtags, platforms }, policyFlags }`
- Frontend: `artifacts/mobile/app/(tabs)/index.tsx` — "Create" tab, and it's the **first/default tab** (see §10 for why that required a file rename, not just tab reordering)
- Video frame extraction (platform-specific, Metro auto-resolves the right one):
  - `artifacts/mobile/lib/extractVideoFrame.ts` — native, via `expo-video-thumbnails`
  - `artifacts/mobile/lib/extractVideoFrame.web.ts` — web, via a hidden `<video>` + `<canvas>` frame grab (the native package's web implementation is a stub that always rejects)
- Image is resized/compressed client-side via `expo-image-manipulator` before upload (max width 1024, JPEG quality 0.7) to keep payloads small
- **Status: done and the most heavily tested/iterated screen this session.**

### 3.4 Feature: Editable AI output + Remix (this session)

Every generated caption/script/hook is directly editable (tap and type, like a Word doc), plus a "Remix" button per field that rewrites it from a plain-English instruction (e.g. "make it funnier").

- Backend: `artifacts/api-server/src/routes/remix.ts` — generic `POST /api/remix`, body `{ text, instruction }` → `{ result }`. Deliberately generic/reusable, not tied to any one content type.
- Frontend: `artifacts/mobile/components/RemixableField.tsx` — shared component: borderless auto-growing `TextInput` + inline "Remix" trigger → instruction box → submit → replaces the text. Has a `hideInput` prop for cases where the field is already editable via other means and only the Remix affordance is needed (used for video script scenes).
- Client helper: `artifacts/mobile/lib/remix.ts` exports `callRemix(text, instruction)`, used by all three screens below instead of duplicating fetch logic.
- Wired into:
  - `repurpose.tsx` — every format's result text
  - `scripts.tsx` — hook, each scene's voiceover (Remix button; visual/voiceover/on-screen text are all directly editable via plain TextInputs), caption, CTA
  - `index.tsx` (Create) — caption
- **Status: done, verified live** — tested "make it shorter, one sentence only" on a real caption and got back a correctly shortened result.

### 3.5 Feature: Platform policy flagging (this session)

Scans uploaded media (and edited captions) for content that might violate platform policies or Imagine's own guidelines, and shows specific, friendly (non-punitive) warnings — not generic ones.

- `artifacts/api-server/src/lib/policyKb.ts` — the core design piece. Contains:
  - `ContentCategorySchema`: 7 categories (nudity_sexual_content, graphic_violence, hate_speech, copyrighted_material, age_restricted_substances, dangerous_activities, harassment_bullying)
  - `PolicyPlatformSchema`: 10 platforms (instagram, tiktok, youtube, facebook, x, linkedin, pinterest, snapchat, threads, reddit — no Substack, it's not a visual-post platform)
  - A curated knowledge base (`KB`) of real, plain-language rule summaries per platform × category, plus `IMAGINE_RULES` (Imagine's own baseline guidelines) per category
  - `buildPolicyFlags(categories, source)` — maps detected categories to flags with the curated rule text attached
  - **Key design decision:** the model only classifies *which categories apply* (a fixed enum) — the actual rule text shown to the user always comes from this curated KB, server-side, never from the model's memory. This avoids hallucinated/fabricated policy citations while still satisfying "must show the SPECIFIC rule, not a generic message."
- `POST /api/analyze-media` also returns `policyFlags` from scanning the image (added `contentCategories` to the vision prompt's JSON output)
- `POST /api/policy-check-text` (`policy-check.ts`, new) — text-only scan, used to re-check the caption after edits
- `artifacts/mobile/components/PolicyWarnings.tsx` — renders a friendly amber "Heads up!" card, one row per flag (platform + category + exact curated rule text), ending with "You can edit your content or choose a different platform — totally your call."
- In `index.tsx`: image scanned once at analysis time; caption re-scanned 1.2s after the user stops typing/remixing (debounced), merging new text-flags with existing image-flags (each flag tagged `source: "image" | "text"` so one check never wipes the other's results)
- **Scope (intentional):** only wired into the Create screen, since that's the only screen with real media upload. Repurpose/Scripts text outputs are not scanned (the `/api/policy-check-text` endpoint is generic and reusable if this gets extended later).
- **Status: done, verified working** (tested with a clean image showing no flags; flag-rendering logic verified via the component).

### 3.6 Feature: Personal voice settings (this session)

Set a voice once, Imagine always writes in that style; optional per-post personal context gets woven into the caption naturally.

- `artifacts/mobile/lib/settings.ts` — `VOICE_OPTIONS`: `"Casual & Real" | "Funny & Light" | "Emotional & Heartfelt" | "Motivational" | "Storyteller"`. Persisted via `@react-native-async-storage/async-storage` (was already an installed-but-unused dependency — strong signal it was meant for exactly this).
- Voice picker lives in **Settings tab** (`settings.tsx`), not on the Create screen — it's a "set once" setting, not a per-generation choice.
- Create screen has a **separate**, per-post, one-line optional "Add anything personal about this moment" text box (not persisted — resets each session).
- Both `voice` and `personalContext` are sent to `/api/analyze-media` and woven into the prompt.
- Backend prompt in `media.ts` was rewritten with an explicit bad/good example pair (mirroring the user's own examples) to force short, conversational, "texting a friend" captions **by default**, regardless of which voice is chosen, with per-voice style guidance layered on top.
- **Status: done, verified live.** Test case: voice = "Funny & Light", personal context = "this is our team mascot logo, we just redesigned it" on a lightning-bolt logo image produced: *"We finally redesigned our mascot and honestly? She goes hard. The old one had a good run but this thing is built different. ⚡"*

### 3.7 Feature: Profile & platform settings (this session, redesigned in a later session — see below)

Store your handles once; check off every platform you intend to post to (not just the AI's top picks); optionally optimize the caption per platform; one-tap "Open & Post" per selected platform.

- `artifacts/mobile/lib/settings.ts` — `HandlePlatformId`: 11 platforms (the 10 from §3.5 plus `substack`). Handles stored as `Partial<Record<HandlePlatformId, string>>`, persisted via AsyncStorage.
- `artifacts/mobile/hooks/useSettings.ts` — hook wrapping load/save, using `useFocusEffect` (re-exported by `expo-router`, no phantom-dependency issue) so settings reload every time a tab regains focus — this is how a handle saved in Settings shows up immediately back on the Create tab without a full app reload.
- `artifacts/mobile/app/(tabs)/settings.tsx` — new screen: voice picker (§3.6) + 11 handle inputs, auto-save per field with a "Saved" flash confirmation. No separate save button — low-friction, matches "remembers forever" simplicity.
- `artifacts/mobile/lib/platforms.ts` — per-platform metadata: icon (MaterialCommunityIcons name), a `styleHint` string (used to build the "optimize for this platform" Remix instruction), `profileUrl(handle)` builder, and — only for **X and Reddit** — a real `composeUrl(caption, handle)` with the caption pre-filled via query param, since those are the only two platforms whose web intent URLs genuinely support text prefill without needing API approval. Every other platform falls back to profile/home URL + clipboard copy.
- **Redesigned (later session):** originally, tapping a suggested platform both *selected* it and *immediately triggered* an AI rewrite of the caption in the same action — see the bug this caused in §5. The "Where To Post" card now renders all 10 platforms (`ALL_PLATFORM_IDS` = `HANDLE_PLATFORM_IDS` minus `substack`) as a checkbox list, AI-suggested ones marked with an "AI PICK" badge and their reason text, ordered suggested-first. **Selecting a platform (the checkbox) is now a pure state toggle — it never touches the caption.** Each checked platform separately reveals an explicit "Optimize for {Platform}" action (still calls `/api/remix` with that platform's `styleHint`, same as before, just no longer auto-fired by selection) and its own "Open {Platform} & Post" button, so multiple platforms can be selected and posted to independently. The Post Preview's handle now picks the first *selected* platform that has a saved handle (falls back to "your.handle" if none do).
- **Extended again (this session): per-platform "Use by default" toggle in Settings.** `Settings.defaultPlatforms: Partial<Record<HandlePlatformId, boolean>>` (new field, `lib/settings.ts`) stores which platforms the user posts to regularly. In `settings.tsx`, each of the 11 handle rows now has a "Use by default" checkbox toggle above its handle input (the row layout changed from one line to two — icon+label+toggle on top, handle input below — since a single line got too cramped). On the Create screen, `analyze()`'s success handler now seeds `selectedPlatforms` from `ALL_PLATFORM_IDS.filter(id => settings.defaultPlatforms[id])` instead of always starting empty, so a user's regular platforms are pre-checked on every new post — AI suggestions still show their "AI PICK" badge/reason regardless of whether they're pre-checked, and the user can freely check/uncheck anything either way. The platform-hint copy changes conditionally (`hasDefaultPlatforms`) to explain the pre-checking when it applies. Substack gets a toggle too for consistency with the rest of the handles list, even though Create's checklist never shows it (existing design decision, §10) — the toggle is simply inert there today.
- **Status: done, verified live**, including a real bug fix — see §5.

### 3.8 Feature: Multi-photo carousel post creation (this session)

The Create screen now supports picking 2-10 photos at once and getting back
one cohesive caption/hashtag/platform analysis for the whole set — a real
Instagram/Facebook/LinkedIn-style carousel post, not a single photo.

- Backend: `artifacts/api-server/src/routes/media.ts` — `POST
  /api/analyze-media`'s request shape changed from a single `imageBase64` /
  `mimeType` pair to an `images: { imageBase64, mimeType }[]` array (1-10
  entries). Every entry becomes its own `{type:"image"}` content block in the
  same Claude message (the vision API natively supports multiple images per
  message — no new API surface needed there).
  - `buildPrompt` now takes `imageCount` and, when `mediaType === "photo" &&
    imageCount > 1`, injects a carousel-specific instruction: write **one**
    caption for the whole set as a single story (not per-photo), treat photo
    order as intentional (first = cover slide), and the `summary` field
    describes the set as a whole.
  - `contentCategories` classification is asked to flag a category if it
    appears in **any** photo in the set, not just the first.
- Frontend: `artifacts/mobile/app/(tabs)/index.tsx` — media state changed
  from a single nullable object to a `MediaItem[]` array.
  - Empty-state dropzone now uses `allowsMultipleSelection: true,
    selectionLimit: 10`. If more than one asset comes back, any videos in the
    selection are filtered out (carousels are **photos-only** by design — see
    below) with a friendly inline note if anything was dropped.
  - Once photos are selected, they render as a horizontal thumbnail strip,
    each with a small × remove button, plus a trailing "+" tile (shown only
    when the existing media is photos and there are fewer than 10) that opens
    a single-select, images-only picker to append one more.
  - "Start over with a different file" replaces the old "Choose a different
    file" link and re-opens the full multi-select picker from scratch.
  - The `analyze()` call now sends `images: media.map(m => ({ imageBase64,
    mimeType }))` and `mediaType: media[0].kind`.
- New component: `artifacts/mobile/components/CarouselPreview.tsx` — a
  swipeable, paginated image carousel (horizontal `ScrollView` with
  `pagingEnabled`) with dot page indicators, used in the Post Preview card.
  Renders identically to a single static image when there's only one photo
  (no dots shown), so the single-photo/video path is visually unchanged.
- **Scope decisions (confirmed with the user before building):**
  - **Photos only** — video stays exactly as it was, a single video with one
    extracted frame, never mixed into a carousel.
  - **No drag-to-reorder** — slide order is pick order; remove-and-re-add is
    the only way to change composition.
  - **Cap at 10 slides**, matching Instagram's real limit.
- Everything downstream of analysis (Remix, policy flags, platform
  suggestions, Open & Post) is completely unchanged — it all still operates
  on the single `result` object the backend returns, regardless of how many
  photos went in.
- **Status: done, verified live** via a real Playwright + Anthropic API pass:
  picked 3 photos → removed one → re-added a different one via the "+" tile
  → generated and got one caption/summary describing "three bold primary
  color swatches" as a set (not three separate captions), with platform
  suggestions explicitly referencing "carousels" (Pinterest, Instagram,
  Threads) → confirmed the Post Preview carousel pages between slides with
  working dot indicators (verified via a horizontal wheel-scroll gesture,
  since raw mouse-drag doesn't trigger web scroll containers the way touch
  does). Also regression-tested the single-photo path end to end — the model
  correctly still writes single-photo language ("a bold, solid red image"),
  no carousel phrasing, no console errors either run.
  - **Not independently re-tested this session:** the single-video path
    (frame extraction + analysis). It shares 100% of its code path with the
    pre-existing single-photo flow (same `processAsset` helper, same
    `analyze()` call with a 1-length `images` array), so risk is low, but it
    wasn't clicked through live — no video test fixture was available in this
    environment.

### 3.9 Feature: Per-photo text overlays (this session)

Each photo gets an AI-suggested, editable, draggable, stylable text overlay
("sticker/quote card") — separate from and alongside the single post
caption, not instead of it. Scope, confirmed with the user before building:
one overlay per photo (no stacked layers), a real flattened/exported image
(not just an in-app preview), basic styling only (color/size/background
pill — no rotation, no font choices), photos only (not video).

- **Data model:** `PhotoOverlay` type (`artifacts/mobile/lib/overlay.ts`) —
  `text`, `xPct`/`yPct` (0-1, position relative to image size),
  `fontSize` (authored at a 1080px reference width, scaled at render time),
  `color`, `backgroundEnabled`, `backgroundColor`. `MediaItem.overlay` is
  `undefined` (no suggestion/not visited), `null` (explicitly
  skipped/removed), or a `PhotoOverlay`.
- **Backend:** `POST /api/analyze-media` (`media.ts`) now also returns
  `photoOverlaySuggestions: string[]`, one short (≤8 words) suggestion per
  input photo, aligned by index, empty string if a photo doesn't need one —
  only generated when `mediaType === "photo"`. The route defensively pads/
  truncates the model's array to `images.length` rather than trusting the
  count, same defensive philosophy as the rest of this file's error
  handling.
- **`artifacts/mobile/components/OverlaidPhoto.tsx`** (new): the single
  shared renderer — image + positioned/styled overlay text — reused by the
  thumbnail strip, the Post Preview carousel (`CarouselPreview.tsx`), so
  what's shown always matches what gets exported. Styling math itself lives
  in `overlayTextStyle()` (`lib/overlay.ts`) so the interactive editor can
  reuse the exact same computation for its own draggable text.
- **`artifacts/mobile/components/PhotoOverlayEditor.tsx`** (new): a
  full-screen modal opened by tapping any photo thumbnail. Drag-to-reposition
  uses `react-native-gesture-handler`'s `Gesture.Pan().runOnJS(true)` (plain
  JS-thread callbacks driving normal React state — deliberately not
  worklet/Reanimated-driven, since a single draggable text label doesn't
  need UI-thread animation and this keeps the gesture code simple).
  Gesture-handler and Reanimated were already installed and already wired
  at the app root (`app/_layout.tsx`'s `GestureHandlerRootView`) — no new
  gesture infrastructure needed. Style controls: 6 color swatches, a
  6-step size stepper, a background-pill on/off toggle. "Remove overlay"
  clears it; tapping a photo with no suggestion yet opens the same editor
  with an empty draft (the "Add text" path — there's no separate button for
  this, tapping the thumbnail is the one entry point for both editing and
  adding).
- **Export ("Save Photo"):** `artifacts/mobile/lib/exportOverlay.ts` /
  `.web.ts` (Metro platform-resolved split, matching the existing
  `extractVideoFrame.ts`/`.web.ts` pattern). Web: draws the photo onto an
  offscreen `<canvas>` at 1080×1080, draws the overlay text at the matching
  position/size/color/pill (with its own greedy line-wrap and rounded-rect
  helpers, since Canvas 2D has no built-in text wrapping), exports via
  `canvas.toBlob()` and a generated `<a download>` link — no new dependency
  needed on web. Native: `react-native-view-shot`'s `captureRef` captures
  the editor's live canvas view directly (no separate hidden render needed
  — view-shot can render a view at an arbitrary output resolution regardless
  of its on-screen size) to a file, then `expo-media-library` saves it to
  the photo library (with an `expo-media-library` plugin entry added to
  `app.json` for the permission prompt string), falling back to
  `expo-sharing`'s share sheet if the save permission is denied.
- **New dependencies** (`artifacts/mobile/package.json`, installed via
  `npx expo install` for SDK-54-correct versions): `react-native-view-shot`,
  `expo-media-library`, `expo-sharing`.
- **Status: done, verified live** via real Playwright runs against the real
  API: generated a 3-photo carousel, confirmed all 3 thumbnails got an "Aa"
  badge for their AI-suggested overlay; opened the editor, dragged the text
  to a new position (confirmed via before/after DOM coordinates), toggled
  the background pill off, tapped Save Photo, and confirmed a real ~12.7KB
  JPEG downloaded via the browser — **opened the downloaded file and
  visually confirmed the dragged text was baked into the actual pixels at
  the correct position with no background pill**, a genuine WYSIWYG export.
  Also verified: manually typing text into a photo that already had a
  (different) AI suggestion correctly replaces it; the Post Preview carousel
  renders the same overlay, same position/style, on the correct slide.
  - **Not tested this session:** the native capture/save path
    (`exportOverlay.ts`, `react-native-view-shot` + `expo-media-library` +
    `expo-sharing`) — written carefully against the documented Expo APIs but
    genuinely unverified, since only Expo web was exercised, consistent with
    every other native-path gap already tracked in this file. If it doesn't
    work on a real device, start by checking `app.json`'s
    `expo-media-library` plugin config and whether a dev client rebuild
    (not just a JS reload) is needed to pick up the three new native
    modules.

---

## 4. Current status of each feature (at a glance)

| Feature | Status | Tested how |
|---|---|---|
| Content Repurposing | ✅ Done (pre-existing) | Manually, prior session |
| Video/Short Script Generator | ✅ Done | Playwright + real API, prior session |
| Create (photo/video → post) | ✅ Done | Playwright + real API, this session |
| Editable output + Remix | ✅ Done | Playwright + real API, this session |
| Policy flagging | ✅ Done (Create screen only) | Playwright + real API, this session |
| Voice settings | ✅ Done | Playwright + real API, this session |
| Personal context weaving | ✅ Done | Playwright + real API, this session |
| Profile/platform settings | ✅ Done | Playwright + real API, this session |
| Multi-select platform checkboxes + per-platform optimize | ✅ Done (redesigned from single-tap-select) | Playwright + real API, this session |
| Per-platform "Use by default" → pre-checked on Create | ✅ Done | Playwright, this session |
| Per-photo text overlays (suggest/edit/drag/style) | ✅ Done (web export verified; native export unverified) | Playwright + real API, this session |
| Open & Post | ✅ Done (after a bug fix, see §5) | Playwright, this session |
| Multi-photo carousel creation | ✅ Done (photos only, no reorder, 10-slide cap) | Playwright + real API, this session |
| Blog/story/email/podcast generation | ❌ Not built | — |
| AI image prompts | ❌ Not built | — |
| Native (iOS/Android) testing | ❌ Not done | Only Expo web tested |
| Automated test suite | ❌ Not built | No test framework exists in repo at all |

---

## 5. Known bugs or issues

**Fixed this session (documented so it isn't "rediscovered" as new):**
- `openAndPost` in `index.tsx` originally called `await Clipboard.setStringAsync(...)` **before** `window.open(...)`. Browsers only allow `window.open` synchronously within a trusted click's call stack — anything after an `await` gets silently blocked as a popup. Fixed by moving `window.open` to fire first (synchronously), then awaiting the clipboard write. Confirmed fixed with a real new-tab-opens test.
- `POST /api/analyze-media` (`media.ts`) returned a generic "Something went wrong" for **any** failure — the `catch {}` block didn't bind or log the error at all, so real failures were invisible in the server logs. Reported live: uploading 7 photos in a carousel and generating threw this generic error. Root-caused and fixed:
  - The catch block now logs via the existing pino `logger` (`err`, `imageCount`, `mediaType`, and the raw model response text) so any future failure is diagnosable instead of a black box.
  - `contentCategories` used a **strict** zod enum (exactly 7 fixed values) for the model's per-photo policy classification. If the model's category wording for even one photo in a set didn't match exactly (e.g. `"violence"` instead of `"graphic_violence"`), the *entire* response failed schema validation and 502'd — directly tying an apparent "carousel" bug to the policy-scanning step. Fixed by preprocessing the array to silently drop any category the model returns that isn't one of the 7 known values, instead of failing the whole request over one hallucinated label.
  - JSON extraction from the model's response now takes the substring between the first `{` and last `}` (instead of trusting the whole trimmed response is valid JSON), guarding against stray prose before/after the JSON object.
  - `max_tokens` bumped from 2048 → 4096 as headroom against truncation on longer carousel responses.
  - Verified after the fix with three separate 7-photo reproductions (solid-color test images, 7 full-resolution real photos totaling 8.75MB, and a live UI-driven Playwright run through the actual Create screen) — all three now return 200 with valid results and no console errors. Could not force a deterministic repro of the exact original failure (LLM output is inherently non-deterministic — one of the real-photo runs did legitimately trigger `copyrighted_material` policy flags on Windows wallpaper images, a later identical-input run did not), so the logging is the safety net if it recurs: check `logger.error` output for `rawModelText` and the zod/JSON error next time.
- **Caption got wiped after editing it, then tapping an AI-suggested platform.** Root cause: tapping a platform did two things at once — select it *and* immediately call `/api/remix` to rewrite the caption in that platform's style, overwriting `editedCaption` with whatever the model returned. Confirmed live that `/api/remix`'s model can occasionally misinterpret unusual input as a "placeholder" and return a conversational non-caption reply instead of a rewrite (reproduced directly: feeding it a template-looking string like `MY_DISTINCTIVE_EDIT_12345` got back *"It looks like the original text didn't come through..."* instead of a rewritten caption) — that reply would silently become the new "caption." Fixed by decoupling the two actions entirely: selecting a platform (now a checkbox — see §3.7's redesign) is a pure state toggle that never touches `editedCaption`; optimizing for a platform's style is now a separate, explicit "Optimize for {Platform}" action the user triggers on purpose. Verified live: manually edited caption, checked/unchecked multiple platform checkboxes (0 `/api/remix` calls fired), then tapped "Optimize for Facebook" explicitly (exactly 1 call fired, correctly rewrote the manually-edited text while preserving its meaning).

**Pre-existing, NOT introduced by any of this work — do not "fix" these without checking if it's in scope:**
- `artifacts/mobile/hooks/useColors.ts` line ~21: `TS2352` type error casting the colors object. Present before any of this session's work.
- Every API route file (`repurpose.ts`, `video-script.ts`, `media.ts`, `remix.ts`, `policy-check.ts`) shows a `TS6305` project-reference build error (`lib/integrations-anthropic-ai/dist/index.d.ts` not built from source) plus two `TS7006` implicit-`any` errors on the same lines in each file. This is a repo-wide tsconfig project-references quirk confirmed present on `main` before this feature work began (verified via `git stash` at the time). Runtime is unaffected — esbuild bundles from source directly, not from the unbuilt `.d.ts`.

**Open, not yet fixed (lower priority):**
- Threads uses the MaterialCommunityIcons `"at"` glyph and Substack uses `"newspaper-variant-outline"` as fallbacks — MDI has no dedicated icons for either. Cosmetic only.
- No test framework exists in the repo at all (Jest/Vitest/etc.) — every verification this project has had has been manual Playwright-driven browser testing, not committed automated tests.

---

## 6. What still needs to be built (next priorities, suggested order)

1. **Extend policy scanning to Scripts/Repurpose screens**, if wanted — `/api/policy-check-text` already exists and is generic; this is mostly frontend wiring (reuse `PolicyWarnings` component).
2. **Native (iOS/Android) verification pass** — literally everything has only been tested via Expo web in a browser. Video frame extraction in particular (`extractVideoFrame.ts`, the native path) has not been exercised end-to-end with a real device/simulator this session. Same for the text-overlay export path (`exportOverlay.ts` — `react-native-view-shot` + `expo-media-library` + `expo-sharing`), which needs a dev client rebuild (new native modules, not just a JS reload) before it can even be tried.
3. **Re-test the video-upload path** against the new pipeline (voice/context/policy/remix) — this session's live testing only exercised the photo path.
4. **Remaining content types from the original vision**: blog articles, stories, emails, podcasts, AI image prompts. None have a backend route or screen yet. Follow the same pattern as `video-script.ts`/`media.ts`: dedicated endpoint + zod-validated structured response + a screen matching the existing visual language.
5. **Branding decision**: rename in-app "Repurpose.ai" header text to "Imagine" — deferred as a user decision every time it's come up, never actioned. Ask before touching it.
6. **OpenAPI/Orval adoption**: none of the 5 content-generation endpoints are in `lib/api-spec/openapi.yaml`. If this matters, do it once for all endpoints together, not piecemeal.
7. **Testing framework**: consider Vitest for the Express routes if the project matures past manual verification.

---

## 7. How to start the app locally

There is no committed "one command" dev script that starts both servers together — start them separately in two terminals.

### Backend (api-server)

```bash
cd artifacts/api-server
pnpm run build
# Load .env vars into the shell, then start (no dotenv auto-loading exists):
set -a && source ../../.env && set +a
PORT=4300 node --enable-source-maps ./dist/index.mjs
```

Health check: `curl http://localhost:4300/api/healthz` → `{"status":"ok"}`

### Frontend (mobile, web target)

```bash
cd artifacts/mobile
EXPO_PUBLIC_DOMAIN="localhost:4300" npx expo start --web --port 8081
```

Then open **http://localhost:8081**. Four tabs at the bottom: Create (default/first), Repurpose, Scripts, Settings.

**Important local-dev quirk:** the app's `fetch` calls (`lib/apiBase.ts`'s `apiUrl()`) use `https://` for any real domain but `http://` specifically when the domain starts with `"localhost"` — this was a deliberate fix (see §10) to support local testing while keeping the original Replit-deployed behavior (`https://` always) intact for production, where `EXPO_PUBLIC_DOMAIN` is a real hostname.

If you rename/move files under `app/(tabs)/`, **clear the Expo cache and fully restart** (`npx expo start --web --clear`) — Metro's route manifest can go stale after file renames and won't pick up the change with a normal hot-reload (this bit us once this session; a simple restart fixed it).

---

## 8. All important file locations

### Backend — `artifacts/api-server/src/`
| Path | Purpose |
|---|---|
| `app.ts` | Express app setup; JSON body limit is 15mb (bumped for photo uploads) |
| `index.ts` | Server entry, requires `PORT` env var |
| `routes/index.ts` | Registers all routers |
| `routes/health.ts` | `GET /api/healthz` |
| `routes/repurpose.ts` | `POST /api/repurpose` — content repurposing |
| `routes/video-script.ts` | `POST /api/video-script` — video script generator |
| `routes/media.ts` | `POST /api/analyze-media` — Create flow: vision analysis + policy scan |
| `routes/remix.ts` | `POST /api/remix` — generic text rewrite |
| `routes/policy-check.ts` | `POST /api/policy-check-text` — text-only policy scan |
| `lib/policyKb.ts` | Curated policy rule knowledge base + flag-building logic |
| `lib/logger.ts` | pino logger |

### Frontend — `artifacts/mobile/`
| Path | Purpose |
|---|---|
| `app/_layout.tsx` | Root layout (fonts, providers) |
| `app/(tabs)/_layout.tsx` | Tab bar — order: Create (`index`), Repurpose, Scripts, Settings |
| `app/(tabs)/index.tsx` | **Create** screen — the flagship feature, all 4 new features integrated here |
| `app/(tabs)/repurpose.tsx` | Repurpose screen |
| `app/(tabs)/scripts.tsx` | Scripts screen |
| `app/(tabs)/settings.tsx` | Settings screen — voice + 11 handles |
| `components/RemixableField.tsx` | Shared editable-text + Remix component |
| `components/PolicyWarnings.tsx` | Shared policy-flag warning card |
| `components/CarouselPreview.tsx` | Swipeable, paginated image carousel with dot indicators (Post Preview) |
| `components/OverlaidPhoto.tsx` | Shared image + positioned/styled text-overlay renderer |
| `components/PhotoOverlayEditor.tsx` | Full-screen modal: drag-to-position overlay text, style controls, save/remove |
| `hooks/useColors.ts` | Design tokens (pre-existing) |
| `hooks/useSettings.ts` | Settings load/save hook, refreshes on tab focus |
| `lib/settings.ts` | Settings types + AsyncStorage persistence |
| `lib/platforms.ts` | Client-side platform metadata (icons, style hints, URLs) |
| `lib/overlay.ts` | `PhotoOverlay` type, default/swatch/size-step constants, shared `overlayTextStyle()` |
| `lib/exportOverlay.ts` / `.web.ts` | Platform-specific overlay export: native view-shot+media-library+sharing, web canvas+download |
| `lib/apiBase.ts` | `apiUrl(path)` — protocol-aware API base URL helper |
| `lib/remix.ts` | `callRemix(text, instruction)` shared client helper |
| `lib/extractVideoFrame.ts` / `.web.ts` | Platform-specific video-frame extraction |

### Shared libs — `lib/`
| Path | Purpose |
|---|---|
| `lib/integrations-anthropic-ai/src/client.ts` | Exports `anthropic` client, requires the two env vars in §9 |
| `lib/integrations-anthropic-ai/src/batch/` | Batch processing helpers (unused by any current feature) |
| `lib/db/` | Drizzle/Postgres schema — unused by any current feature |
| `lib/api-spec/openapi.yaml` | Only documents `/healthz` — none of the content endpoints are here |

### Root docs
| Path | Purpose |
|---|---|
| `IMAGINE_MASTER.md` | This file |
| `IMAGINE_BUILD_PLAN.md` | Original plan for the video/short script feature (historical) |
| `PROGRESS.md` | End-of-session notes from the four-feature session (historical, superseded by this file for current status) |

---

## 9. API keys and environment variables needed

All in a root-level `.env` (gitignored, never commit it):

| Variable | Used by | Notes |
|---|---|---|
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | `lib/integrations-anthropic-ai` | Typically `https://api.anthropic.com` |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | `lib/integrations-anthropic-ai` | Real Anthropic API key — required, the client throws at import time if empty/missing |

Also required at runtime (not secrets, just required):
| Variable | Used by | Notes |
|---|---|---|
| `PORT` | `artifacts/api-server/src/index.ts` | Server throws if not set |
| `EXPO_PUBLIC_DOMAIN` | Mobile app's `apiUrl()` helper | Set to `localhost:4300` for local dev against the local backend |

Model used throughout: **`claude-sonnet-4-6`** (all 5 backend routes use this same model — no reason found to introduce a second model).

---

## 10. Important decisions made along the way

- **AsyncStorage over a backend DB for settings.** `@react-native-async-storage/async-storage` was already an installed-but-unused dependency — treated as a strong signal it was meant for local device settings. No auth/accounts exist, so this avoids inventing a user-identity system just to store a voice preference and some handles. Settings are device-local, not synced across devices.
- **Policy flags: curated KB, not model-recited rule text.** The model only classifies which content categories apply (a fixed enum); the actual rule text shown to the user always comes from a server-side curated knowledge base (`policyKb.ts`). This was chosen specifically to avoid hallucinated/fabricated citations while still meeting the requirement to show the *specific* rule, not a generic warning.
- **Video → image, not native video analysis.** Claude's API accepts images, not video. For any video upload, the client extracts one representative frame (native: `expo-video-thumbnails`; web: manual `<video>`+`<canvas>` grab, since the native package's web shim is a permanent stub that rejects) and sends that frame as if it were a photo.
- **Create tab had to become the actual `index.tsx` file, not just be reordered.** Expo Router always maps the URL `/` to whichever file is literally named `index.tsx` in a route group — `initialRouteName` on the `Tabs` navigator does *not* override this. Making Create the first screen users see required physically renaming files: the old Repurpose `index.tsx` became `repurpose.tsx`, and the Create screen became the new `index.tsx`.
- **`http://` vs `https://` for local dev.** The app's fetch calls originally hardcoded `https://` (correct for the real Replit deployment). For local dev against a plain-HTTP local server, `apiUrl()` in `lib/apiBase.ts` uses `http://` specifically when the domain string starts with `"localhost"`, and `https://` otherwise — preserves production behavior while making local dev actually work.
- **Remix is one generic endpoint, not per-feature ones.** `POST /api/remix` takes any `{ text, instruction }` and is reused for: per-field remixing (Feature 1) *and* "optimize this caption for platform X" (Feature 4, by constructing the instruction client-side from that platform's style hint). Kept the backend simple; all platform-specific knowledge lives client-side in `lib/platforms.ts`.
- **Captions must sound human by default, not just when a specific "casual" voice is picked.** The user was explicit that *all* captions, regardless of chosen voice, should be short and conversational ("texting a friend," not "a marketing agency") — this is a base prompt requirement in `media.ts`, with the 5 named voice styles (`lib/settings.ts`) layered on top as flavor, not as the only source of a casual tone.
- **"Open & Post" scope is intentionally limited.** Per the original ask, this copies the caption to clipboard and opens the platform's web profile/home (with real text-prefill only for X and Reddit, the two platforms whose web intent URLs genuinely support it without API approval). True one-click posting to all platforms requires API approvals from each platform and was explicitly called out as future work, not a gap in this implementation.
- **Branding ("Repurpose.ai" vs "Imagine") was never changed.** Flagged multiple times as a decision for the user to make explicitly, not something to change as a side effect of unrelated feature work. Still says "Repurpose.ai" in every screen header as of this writing.
- **No test framework was introduced.** All verification across every feature in this project has been manual, live, Playwright-driven browser testing against the real Anthropic API — deliberately, so as not to bundle an unrequested infrastructure decision (choosing Jest vs. Vitest, etc.) into feature work.
