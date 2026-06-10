import { Router } from "express";
import { z } from "zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

const RepurposeBodySchema = z.object({
  content: z.string().min(1).max(10000),
  formats: z
    .array(z.enum(["tweet", "linkedin", "tiktok", "email", "newsletter", "youtube"]))
    .min(1),
  tone: z.enum(["Casual", "Professional", "Bold", "Witty", "Inspiring"]),
});

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  tweet: `"tweet": a string with 3 tweets separated by \\n\\n (each tweet max 280 chars, formatted as "1/ ...", "2/ ...", "3/ ...")`,
  linkedin: `"linkedin": a string for a LinkedIn post (150-200 words, starts with a hook, uses line breaks, ends with a CTA)`,
  tiktok: `"tiktok": a string with 3 alternative TikTok/Reels hooks (each 1-2 sentences, separated by \\n\\n, numbered 1. 2. 3.)`,
  email: `"email": a string with 5 email subject lines, each on a new line, numbered 1-5`,
  newsletter: `"newsletter": a string for a newsletter teaser paragraph (2-3 sentences, creates curiosity, invites click-through)`,
  youtube: `"youtube": a string with a YouTube video title (max 70 chars, SEO-optimised, no clickbait) on the first line, then a blank line, then a 150-200 word video description (hooks viewers, includes relevant keywords, ends with a subscribe CTA)`,
};

router.post("/repurpose", async (req, res) => {
  const parse = RepurposeBodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { content, formats, tone } = parse.data;

  const formatInstructions = formats
    .map((id) => FORMAT_INSTRUCTIONS[id] ?? `"${id}": generated content`)
    .join(",\n");

  const prompt = `You are an expert content strategist and copywriter. A creator has given you raw content and wants it repurposed into multiple formats.

TONE: ${tone}

RAW CONTENT:
${content}

Generate the following content formats. Return ONLY a valid JSON object with keys matching the format IDs below. No markdown, no explanation.

Formats needed:
${formatInstructions}

JSON only:`;

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
  const results = JSON.parse(clean);

  res.json({ results });
});

export default router;
