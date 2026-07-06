import { Router } from "express";
import { z } from "zod";
import { anthropic } from "@workspace/integrations-anthropic-ai";

const router = Router();

const RemixBodySchema = z.object({
  text: z.string().min(1).max(4000),
  instruction: z.string().min(1).max(500),
});

router.post("/remix", async (req, res) => {
  const parse = RemixBodySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { text, instruction } = parse.data;

  const prompt = `You are helping someone quickly edit a piece of content they wrote or generated. Apply their instruction to the text below. Keep the same general format and length ballpark unless the instruction asks you to change it. Preserve their voice as much as possible while applying the change.

ORIGINAL TEXT:
${text}

INSTRUCTION:
${instruction}

Return ONLY the rewritten text. No quotes, no markdown, no explanation, no preamble — just the new text.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const result = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim();

    if (!result) throw new Error("Empty result");

    res.json({ result });
  } catch {
    res.status(502).json({ error: "Failed to remix. Please try again." });
  }
});

export default router;
