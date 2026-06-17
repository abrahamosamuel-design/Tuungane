import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { categories } from "@/data/categories";

// Classifies a free-text service description into one of the platform's
// categories + subcategories using Lovable AI. Called from the "describe
// first" step on /requests/new so customers don't need to pick a category.

const InputSchema = z.object({
  description: z.string().min(4).max(2000),
});

interface Suggestion {
  category_slug: string;
  subcategory: string;
  confidence: "low" | "medium" | "high";
  title: string;
}

export const suggestCategory = createServerFn({ method: "POST" })
  .inputValidator(InputSchema)
  .handler(async ({ data }): Promise<Suggestion | null> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.error("[suggest-category] LOVABLE_API_KEY missing");
      return null;
    }

    const taxonomy = categories
      .map((c) => `- ${c.slug} (${c.name}): ${c.subcategories.join(", ")}`)
      .join("\n");

    const system = `You classify customer service requests for a Ugandan marketplace called Tuungane into the right category and subcategory.

Available categories and subcategories:
${taxonomy}

Rules:
- Pick the single best category_slug from the list above (use the slug, not the name).
- Pick the single best subcategory — it MUST be one of the subcategory strings listed under the chosen category, copied verbatim.
- If nothing fits well, pick the closest match and set confidence to "low".
- title: a short 3-8 word task title for the request (e.g. "Fix leaking kitchen tap").
- Respond ONLY as compact JSON: {"category_slug":"...","subcategory":"...","confidence":"low|medium|high","title":"..."}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "raw-fetch",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: data.description },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        console.error("[suggest-category] gateway error", res.status, await res.text().catch(() => ""));
        return null;
      }

      const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) return null;

      const parsed = JSON.parse(content) as Partial<Suggestion>;
      const cat = categories.find((c) => c.slug === parsed.category_slug);
      if (!cat) return null;
      const sub = cat.subcategories.find((s) => s === parsed.subcategory) ?? cat.subcategories[0];
      const confidence: Suggestion["confidence"] =
        parsed.confidence === "high" || parsed.confidence === "medium" || parsed.confidence === "low"
          ? parsed.confidence
          : "medium";
      const title = (parsed.title ?? "").toString().slice(0, 120) || data.description.slice(0, 80);

      return { category_slug: cat.slug, subcategory: sub, confidence, title };
    } catch (err) {
      console.error("[suggest-category] failed", err);
      return null;
    }
  });
