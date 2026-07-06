import { Router } from "express";
import { z } from "zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { buildPolicyFlags, ContentCategorySchema, PolicyFlagSchema, PolicyPlatformSchema } from "../lib/policyKb";

const router = Router();

const VoiceSchema = z.enum([
  "Casual & Real",
  "Funny & Light",
  "Emotional & Heartfelt",
  "Motivational",
  "Storyteller",
]);

const AnalyzeMediaBodySchema = z.object({
  mediaType: z.enum(["photo", "video"]),
  imageBase64: z.string().min(1),
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  voice: VoiceSchema.nullish(),
  personalContext: z.string().max(300).nullish(),
});

const PlatformSchema = z.object({
  id: PolicyPlatformSchema,
  label: z.string(),
  reason: z.string(),
});

const MediaAnalysisResultSchema = z.object({
  summary: z.string(),
  caption: z.string(),
  hashtags: z.array(z.string()).min(5).max(12),
  platforms: z.array(PlatformSchema).min(1).max(4),
  contentCategories: z.array(ContentCategorySchema),
});

const VOICE_GUIDANCE: Record<z.infer<typeof VoiceSchema>, string> = {
  "Casual & Real":
    "Casual & Real: write exactly like texting a close friend. Plain words, no flourish.",
  "Funny & Light":
    "Funny & Light: find the genuine humor in the moment, a little playful, self-aware, never forced.",
  "Emotional & Heartfelt":
    "Emotional & Heartfelt: let real feeling come through, sincere and warm, but still brief — don't over-explain the emotion.",
  Motivational:
    "Motivational: give it a little lift and momentum, like encouragement from someone who believes in you, without sounding like a poster.",
  Storyteller:
    "Storyteller: hint at a small narrative or moment in time, but keep it tight — a caption, not a paragraph.",
};

function buildPrompt(input: {
  mediaType: "photo" | "video";
  voice?: string | null;
  personalContext?: string | null;
}) {
  const subject = input.mediaType === "video" ? "video (shown as a key frame)" : "photo";

  const voiceInstruction = input.voice
    ? VOICE_GUIDANCE[input.voice as keyof typeof VOICE_GUIDANCE]
    : "No specific voice was chosen — default to warm, plain, conversational.";

  const personalContextInstruction = input.personalContext
    ? `The user told you this personal context about the moment: "${input.personalContext}". Weave it in naturally like a real detail they'd mention to a friend — don't just tack it on as a separate sentence.`
    : "No personal context was given — just react to what's in the image.";

  return `You are a sharp, creative friend who just got handed someone's phone with this ${subject} on it. You instantly know what it's about and exactly how to caption it. Be warm and specific — never generic or corporate.

CRITICAL CAPTION STYLE RULE: captions must sound like a real person texting a friend, not a marketing agency. Short. Plain. A little rough around the edges is good.
Bad example (too polished/corporate): "A dad and his kid showing up together, because some lessons are worth teaching in person."
Good example (real, short, human): "Took my kid to his first march today. Proud doesn't even cover it. 🙏"
Default captions to 1-3 short sentences unless the voice below calls for more.

VOICE: ${voiceInstruction}

PERSONAL CONTEXT: ${personalContextInstruction}

Also look carefully at the image itself and note if it contains any of these categories (be conservative — only flag if genuinely present, not just adjacent-themed):
- nudity_sexual_content
- graphic_violence
- hate_speech (hateful symbols, slurs, imagery)
- copyrighted_material (recognizable copyrighted characters, logos, or footage that isn't the user's own)
- age_restricted_substances (drugs, alcohol, tobacco use)
- dangerous_activities (stunts or activities that could cause real injury)
- harassment_bullying

Respond with ONLY a valid JSON object in this exact shape, no markdown, no explanation:

{
  "summary": "one enthusiastic sentence describing what you see, in a friend's voice",
  "caption": "the caption, following the style rule above",
  "hashtags": ["5 to 12 relevant, specific hashtags, no # symbol"],
  "platforms": [
    {
      "id": "instagram | tiktok | youtube | facebook | x | linkedin | pinterest | snapchat | threads | reddit",
      "label": "human-readable platform name",
      "reason": "one short sentence on why this ${subject} fits this platform"
    }
  ],
  "contentCategories": ["zero or more of the category ids listed above, empty array if none apply"]
}

Pick 1-4 platforms that genuinely fit the content.

JSON only:`;
}

router.post("/analyze-media", async (req, res) => {
  const parse = AnalyzeMediaBodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { mediaType, imageBase64, mimeType, voice, personalContext } = parse.data;
  const prompt = buildPrompt({ mediaType, voice, personalContext });

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mimeType, data: imageBase64 },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    const clean = text.replace(/```json|```/g, "").trim();
    const json = JSON.parse(clean);
    const parsed = MediaAnalysisResultSchema.parse(json);

    const policyFlags = buildPolicyFlags(parsed.contentCategories, "image");

    res.json({
      result: {
        summary: parsed.summary,
        caption: parsed.caption,
        hashtags: parsed.hashtags,
        platforms: parsed.platforms,
      },
      policyFlags: PolicyFlagSchema.array().parse(policyFlags),
    });
  } catch {
    res.status(502).json({ error: "Failed to analyze media. Please try again." });
  }
});

export default router;
