# Imagine — Video/Short Script Feature Build Plan

**Tagline:** "Your idea goes in. Imagine gets it out — to the world!"

This plan covers building the **Video/Short Script** generator first (TikTok, Reels, YouTube Shorts), on top of the existing Anthropic integration and repurposing infrastructure. Other output types (blog, story, email, podcast, image prompts) come later — see "Future work."

Written 2026-07-05 against the current repo state. File/line references below were correct as of that read; re-check before assuming they still are.

---

## 1. Current state (what already exists)

The repo is a pnpm workspace (not Nx) with:
- `artifacts/mobile` — Expo/React Native 0.81 + React 19 app, currently one screen: `app/(tabs)/index.tsx` ("Repurpose.ai")
- `artifacts/api-server` — Express 5 server, routes in `artifacts/api-server/src/routes/`
- `lib/integrations-anthropic-ai` — Anthropic client wrapper + batch helpers
- `lib/db` — Drizzle/Postgres schema (`conversations`, `messages` — unused by repurposing today)
- `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` — OpenAPI (Orval) codegen pipeline that the repurpose feature does **not** use (it calls `fetch` directly from the mobile app)

**Existing content flow** (`artifacts/api-server/src/routes/repurpose.ts`):
- `POST /api/repurpose` takes `{ content, formats[], tone }`
- `formats` is one of `tweet | linkedin | tiktok | email | newsletter | youtube`
- Each format maps to a single instruction string in `FORMAT_INSTRUCTIONS`, all format outputs are generated in **one** Claude call, and the model is asked to return one flat JSON object `{ [formatId]: string }`
- Model: `claude-sonnet-4-6`, `max_tokens: 8192`, no streaming, **no error handling** (no try/catch around the API call or `JSON.parse`, no zod validation of the model's output)
- Mobile screen renders each result as a copy-pasteable text block

The current `tiktok` format only produces **3 alternative hooks** — a teaser, not a script. That's the gap this plan fills.

---

## 2. Why this needs its own feature, not just a new FORMAT_INSTRUCTIONS entry

A real short-form video script isn't a single string — it's structured: a hook, a sequence of scenes/beats (each with visual direction, voiceover/dialogue, and on-screen text), a caption, hashtags, and a duration estimate. Cramming that into the existing `Record<string, string>` result shape would mean either mangling structure into a formatted string (hard to render, hard to edit) or breaking the existing contract for other formats.

**Decision: build a dedicated endpoint and screen for video scripts**, reusing the Anthropic client, the visual design system (colors/typography/gradient patterns), and UX conventions (tone picker, copy-to-clipboard, loading/error states) from the existing screen — but with its own request shape, structured JSON response, and a scene-based UI instead of a flat text card.

This also sets the right precedent for the other content types in the roadmap (blog, story, podcast, image prompts): each gets its own typed schema and route, but shares the client, theme, and interaction patterns.

---

## 3. Data model

### 3.1 Request

```ts
const VideoScriptBodySchema = z.object({
  idea: z.string().min(1).max(4000),
  platforms: z
    .array(z.enum(["tiktok", "reels", "shorts"]))
    .min(1),
  durationSeconds: z.union([z.literal(15), z.literal(30), z.literal(60), z.literal(90)]),
  tone: z.enum(["Casual", "Professional", "Bold", "Witty", "Inspiring"]),
});
```

- `idea` — plain-English concept, reuse the same textarea UX as today's "raw content" input, just relabeled.
- `platforms` — multi-select; TikTok/Reels/Shorts scripts are similar enough to generate from one prompt, but each has caption-length/hashtag conventions worth calling out to the model.
- `durationSeconds` — a small fixed set of presets drives pacing (15s ≈ 3-4 beats, 60s ≈ 6-8 beats). Avoid open-ended duration input; it complicates prompting for little benefit at this stage.
- `tone` — reuse the exact same enum/UI already built for repurposing, don't reinvent it.

### 3.2 Response

```ts
const ScriptSceneSchema = z.object({
  order: z.number().int().min(1),
  visual: z.string(),       // shot/action direction, e.g. "Close-up on hands typing"
  voiceover: z.string(),    // spoken line/dialogue for this beat
  onScreenText: z.string(), // caption/overlay text, can be ""
  durationSeconds: z.number().min(1),
});

const VideoScriptResultSchema = z.object({
  hook: z.string(),                 // the strongest opening line, spoken in scene 1
  hookAlternatives: z.array(z.string()).length(2), // 2 backup hooks to A/B test
  scenes: z.array(ScriptSceneSchema).min(1),
  caption: z.string(),              // platform post caption
  hashtags: z.array(z.string()).min(3).max(8),
  cta: z.string(),                  // closing call-to-action line
  estimatedTotalSeconds: z.number(),
});
```

Store this schema in a shared location so both the API route and (eventually) a generated client can import it — see §6.

---

## 4. Backend implementation

**New file:** `artifacts/api-server/src/routes/video-script.ts`

Key differences from `repurpose.ts` worth deliberately fixing here (and candidates to backport later):

1. **Validate the model's JSON output with zod**, not just `JSON.parse`. Claude occasionally drifts from the requested shape; `safeParse` + a single retry-with-correction beats a silent 500 or, worse, malformed data reaching the client.
2. **Wrap the Anthropic call and JSON parsing in try/catch**, return a proper `502`/`500` with a message instead of letting Express's default error handler swallow it.
3. Keep using `claude-sonnet-4-6` (matches the rest of the app; no reason to introduce a second model for this yet).

Sketch:

```ts
import { Router } from "express";
import { z } from "zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

const VideoScriptBodySchema = z.object({ /* as in §3.1 */ });
const VideoScriptResultSchema = z.object({ /* as in §3.2 */ });

const PLATFORM_NOTES: Record<string, string> = {
  tiktok: "TikTok: punchy caption under 150 chars, trending-style hashtags",
  reels: "Instagram Reels: caption can be slightly longer, 1-2 line hook text overlay",
  shorts: "YouTube Shorts: caption doubles as searchable description, include a keyword-rich hashtag",
};

router.post("/video-script", async (req, res) => {
  const parse = VideoScriptBodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }
  const { idea, platforms, durationSeconds, tone } = parse.data;

  const prompt = buildPrompt({ idea, platforms, durationSeconds, tone, PLATFORM_NOTES });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    const clean = text.replace(/```json|```/g, "").trim();
    const json = JSON.parse(clean);
    const result = VideoScriptResultSchema.parse(json);

    res.json({ result });
  } catch (err) {
    res.status(502).json({ error: "Failed to generate script. Try again." });
  }
});

export default router;
```

Prompt design notes for `buildPrompt`:
- Tell the model the exact beat count implied by `durationSeconds` (e.g. 15s → 3 beats, 30s → 4-5, 60s → 6-8, 90s → 8-10) so `scenes[].durationSeconds` sums close to the target — validate/clamp `estimatedTotalSeconds` isn't wildly off rather than trusting the model's arithmetic.
- Ask for **one** script that works across all selected `platforms`, with a single `caption`/`hashtags` set informed by whichever platform notes are most restrictive (e.g. shortest caption limit) — simpler than generating N variants for v1.
- Explicitly forbid markdown fences and instruct "JSON only" like the existing prompt does — that pattern already works reliably in this codebase.

**Register the route** in `artifacts/api-server/src/routes/index.ts`:
```ts
import videoScriptRouter from "./video-script";
router.use(videoScriptRouter);
```

---

## 5. Frontend implementation

### 5.1 Navigation

Today `app/(tabs)/_layout.tsx` is just a `<Slot />` with a single screen — there's no tab bar yet. Since Imagine's roadmap has multiple content types (scripts, posts, blog, email, podcast, image prompts), introduce a lightweight **mode switcher** now rather than a second one-off screen, so the pattern scales:

- Add `app/(tabs)/scripts.tsx` as the new screen.
- Add a simple segmented control at the top of both screens (or promote to an actual Expo Router tab bar in `_layout.tsx` with `Tabs` from `expo-router` instead of `Slot`, using two tabs: "Repurpose" and "Scripts"). Recommend the real `Tabs` component — it's what `(tabs)` already implies, and Expo Router supports it directly; the current `Slot` looks like a placeholder that was never filled in.
- Keep the home screen (`index.tsx`) exactly as-is; don't touch it beyond what's needed to add a tab bar.

### 5.2 New screen: `app/(tabs)/scripts.tsx`

Reuse from `index.tsx`: `useColors()`, the header block, the gradient button, the card/input styling, haptics-on-interaction pattern, copy-to-clipboard pattern. Don't abstract these into shared components yet unless writing the second screen makes the duplication actively painful — two screens sharing a few `StyleSheet` blocks is fine for now (see "Explicitly out of scope").

Screen sections:
1. **Idea input** — same textarea pattern as today's "YOUR RAW CONTENT" card, relabeled "YOUR VIDEO IDEA", placeholder like "A day in the life of...", "3 mistakes beginners make when...".
2. **Platform picker** — checkboxes for TikTok / Reels / YouTube Shorts (same row/checkbox visual pattern as the existing format picker).
3. **Duration picker** — 4 pill buttons: 15s / 30s / 60s / 90s (same pill pattern as the tone picker).
4. **Tone picker** — literally reuse the existing `TONES` array/component pattern.
5. **Generate button** — same gradient/loading/disabled states as today.
6. **Results**, once `result` is set:
   - Hook card: primary hook large/bold, 2 alternates listed below as swappable options (tap to promote an alternate to primary — client-side only, no re-generation).
   - Scene list: one card per scene, numbered, showing a small icon row (🎬 visual / 🎙 voiceover / 💬 on-screen text) and a duration badge (e.g. "0:00–0:04"), computed client-side from cumulative `durationSeconds`.
   - Caption + hashtags card, with its own copy button.
   - A "Copy Full Script" button that flattens hook + scenes + caption into one paste-ready text block (teleprompter-style), in addition to per-section copy buttons — this is the most likely actual use case (pasting into a teleprompter app or notes).

### 5.3 API call

Match the existing pattern exactly — direct `fetch`, not the Orval-generated client (repurpose.ts doesn't use it either, so introducing it only for this one endpoint would be inconsistent; see §6 for the tradeoff if you want to fix this app-wide later):

```ts
const res = await fetch(`https://${process.env.EXPO_PUBLIC_DOMAIN}/api/video-script`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ idea, platforms: selectedPlatforms, durationSeconds, tone }),
});
```

---

## 6. Things deliberately deferred (don't do these in this pass)

- **OpenAPI/Orval integration**: `lib/api-spec/openapi.yaml` only documents `/healthz` today; `/repurpose` was never added to it. Adding `/video-script` to the generated-client pipeline would be more correct long-term but is a larger, separate refactor that should probably happen once for *all* endpoints (including retrofitting `/repurpose`), not piecemeal for just this feature.
- **Persistence**: `lib/db` has `conversations`/`messages` tables that aren't used by any content-generation feature yet. Don't wire up saving scripts to the database in this pass — confirm with the user first whether "history/saved scripts" is wanted before adding schema/migrations.
- **Streaming**: `batchProcessWithSSE` exists in the anthropic integration lib but nothing in the app uses SSE yet. A single script generation is one Claude call, not a batch — streaming isn't warranted unless generation latency turns out to be a UX problem worth solving.
- **Shared UI components**: don't extract `Card`/`Pill`/`GradientButton` from `index.tsx` preemptively. Revisit once 2-3 screens exist and the duplication is concrete, not hypothetical.
- **Testing framework**: there are currently zero test files or test runner configured anywhere in the repo. Introducing one (Vitest is the natural fit for the Express route logic) is a reasonable follow-up but is a separate decision from this feature and shouldn't be bundled in silently.

---

## 7. Implementation checklist

Backend:
- [ ] `artifacts/api-server/src/routes/video-script.ts` — schema, prompt builder, route handler with try/catch + zod-validated response
- [ ] Register route in `artifacts/api-server/src/routes/index.ts`
- [ ] Manually test with `curl`/Postman against a few idea prompts across all 4 duration presets before wiring up the UI

Frontend:
- [ ] Convert `app/(tabs)/_layout.tsx` from `Slot` to `Tabs` with "Repurpose" and "Scripts" tabs
- [ ] `app/(tabs)/scripts.tsx` — idea input, platform picker, duration picker, tone picker, generate button (mirror `index.tsx` patterns)
- [ ] Scene-list result rendering with per-scene and full-script copy
- [ ] Loading/error states matching `index.tsx` conventions
- [ ] Manual pass on both light and dark mode (the app already branches styling on `colors.background === "#080c14"`)

Polish:
- [ ] Confirm hashtag/caption limits per platform read naturally when multiple platforms are selected at once
- [ ] Sanity-check that `scenes[].durationSeconds` sums reasonably close to the selected `durationSeconds` across several generations; tighten the prompt if the model drifts

---

## 8. Future work (after this feature ships)

- Apply the same "dedicated endpoint + structured schema" pattern to: social posts (already partially covered by `/repurpose`), blog articles, stories, emails, podcasts, and AI image prompts.
- Consider whether "Imagine" should become the actual product name in-app (`index.tsx` currently still says "Repurpose.ai" in the header) — that's a branding decision for the user to make, not something to change silently as a side effect of this feature.
- Revisit OpenAPI/Orval adoption for all content-generation endpoints at once, including retrofitting `/repurpose`.
- Decide on persistence (save/history of generated scripts) once there's a second content type to compare it against.
