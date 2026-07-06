import { Router } from "express";
import { z } from "zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { buildPolicyFlags, ContentCategorySchema, PolicyFlagSchema } from "../lib/policyKb";

const router = Router();

const PolicyCheckTextBodySchema = z.object({
  text: z.string().min(1).max(4000),
});

const CategoriesResultSchema = z.object({
  contentCategories: z.array(ContentCategorySchema),
});

const prompt = (text: string) => `You are reviewing a short piece of social media text for content policy concerns. Read it and note if it contains any of these categories (be conservative — only flag if genuinely present):
- nudity_sexual_content
- graphic_violence
- hate_speech (hateful symbols, slurs, targeted attacks based on protected characteristics)
- copyrighted_material (claims of ownership over clearly copyrighted characters/brands that aren't the user's)
- age_restricted_substances (promoting drugs, alcohol, tobacco)
- dangerous_activities (encouraging dangerous stunts)
- harassment_bullying (targeting a private individual)

TEXT:
"""
${text}
"""

Return ONLY a valid JSON object, no markdown, no explanation:
{ "contentCategories": ["zero or more of the category ids above, empty array if none apply"] }

JSON only:`;

router.post("/policy-check-text", async (req, res) => {
  const parse = PolicyCheckTextBodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt(parse.data.text) }],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("");

    const clean = text.replace(/```json|```/g, "").trim();
    const json = JSON.parse(clean);
    const parsed = CategoriesResultSchema.parse(json);

    const policyFlags = buildPolicyFlags(parsed.contentCategories, "text");

    res.json({ policyFlags: PolicyFlagSchema.array().parse(policyFlags) });
  } catch {
    res.status(502).json({ error: "Failed to check content. Please try again." });
  }
});

export default router;
