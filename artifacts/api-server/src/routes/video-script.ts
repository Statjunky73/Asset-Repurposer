import { Router } from "express";
import { z } from "zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

const VideoScriptBodySchema = z.object({
  idea: z.string().min(1).max(4000),
  platforms: z.array(z.enum(["tiktok", "reels", "shorts"])).min(1),
  durationSeconds: z.union([
    z.literal(15),
    z.literal(30),
    z.literal(60),
    z.literal(90),
  ]),
  tone: z.enum(["Casual", "Professional", "Bold", "Witty", "Inspiring"]),
});

const ScriptSceneSchema = z.object({
  order: z.number().int().min(1),
  visual: z.string(),
  voiceover: z.string(),
  onScreenText: z.string(),
  durationSeconds: z.number().min(1),
});

const VideoScriptResultSchema = z.object({
  hook: z.string(),
  hookAlternatives: z.array(z.string()).length(2),
  scenes: z.array(ScriptSceneSchema).min(1),
  caption: z.string(),
  hashtags: z.array(z.string()).min(3).max(8),
  cta: z.string(),
  estimatedTotalSeconds: z.number(),
});

const PLATFORM_NOTES: Record<string, string> = {
  tiktok:
    "TikTok: punchy caption under 150 characters, trending-style hashtags",
  reels:
    "Instagram Reels: caption can be slightly longer, 1-2 line hook text overlay",
  shorts:
    "YouTube Shorts: caption doubles as a searchable description, include at least one keyword-rich hashtag",
};

const BEAT_GUIDANCE: Record<number, string> = {
  15: "3-4 scenes",
  30: "4-5 scenes",
  60: "6-8 scenes",
  90: "8-10 scenes",
};

function buildPrompt(input: {
  idea: string;
  platforms: string[];
  durationSeconds: number;
  tone: string;
}) {
  const { idea, platforms, durationSeconds, tone } = input;

  const platformNotes = platforms
    .map((p) => `- ${PLATFORM_NOTES[p]}`)
    .join("\n");

  return `You are an expert short-form video scriptwriter who writes scroll-stopping TikTok/Reels/YouTube Shorts scripts.

VIDEO IDEA:
${idea}

TARGET PLATFORMS:
${platformNotes}

TONE: ${tone}
TARGET DURATION: ${durationSeconds} seconds (aim for ${BEAT_GUIDANCE[durationSeconds]}, and make each scene's "durationSeconds" sum to approximately ${durationSeconds})

Write a complete video script. Return ONLY a valid JSON object with this exact shape, no markdown, no explanation:

{
  "hook": "the strongest possible opening line, spoken in the first scene",
  "hookAlternatives": ["backup hook 1", "backup hook 2"],
  "scenes": [
    {
      "order": 1,
      "visual": "shot/action direction for this beat",
      "voiceover": "spoken line or dialogue for this beat",
      "onScreenText": "on-screen caption/overlay text, or empty string if none",
      "durationSeconds": 4
    }
  ],
  "caption": "a single post caption that works across the selected platforms, respecting the tightest length constraint above",
  "hashtags": ["3 to 8 relevant hashtags, no # symbol"],
  "cta": "a short closing call-to-action line",
  "estimatedTotalSeconds": ${durationSeconds}
}

JSON only:`;
}

router.post("/video-script", async (req, res) => {
  const parse = VideoScriptBodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { idea, platforms, durationSeconds, tone } = parse.data;
  const prompt = buildPrompt({ idea, platforms, durationSeconds, tone });

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
  } catch {
    res.status(502).json({ error: "Failed to generate script. Please try again." });
  }
});

export default router;
