#!/usr/bin/env tsx
/**
 * Rewrite old-format review summaries that say "Popular dish at X. Customers praise..."
 * Uses the existing review data stored in DB (commonPraises, commonComplaints, etc.)
 * to regenerate summaries through the new Qwen prompt.
 *
 * For dishes where we have actual review text in the DB, re-summarize via LLM.
 * For seeded dishes with only praises/complaints arrays, build a summary from those.
 */
import "dotenv/config";

async function main() {
  const { PrismaClient } = await import("@/generated/prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { getQwenClient, QWEN_3 } = await import("../src/lib/ai/clients");

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  function extractJson<T>(text: string): T {
    try { return JSON.parse(text) as T; } catch { /* */ }
    const fm = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (fm?.[1]) { try { return JSON.parse(fm[1]) as T; } catch { /* */ } }
    const fb = text.indexOf("["), fc = text.indexOf("{");
    let s = -1, e = -1;
    if (fb >= 0 && (fc < 0 || fb < fc)) { s = fb; e = text.lastIndexOf("]") + 1; }
    else if (fc >= 0) { s = fc; e = text.lastIndexOf("}") + 1; }
    if (s >= 0 && e > s) { try { return JSON.parse(text.slice(s, e)) as T; } catch { /* */ } }
    throw new Error(`JSON extraction failed: ${text.slice(0, 150)}`);
  }

  try {
    // Find all old-format summaries (not starting with "Based on" and not empty)
    const oldSummaries = await prisma.reviewSummary.findMany({
      where: {
        NOT: [
          { summaryText: { startsWith: "Based on" } },
          { summaryText: { startsWith: "No reviews" } },
          { summaryText: "" },
        ],
      },
      select: {
        id: true,
        summaryText: true,
        totalReviewsAnalyzed: true,
        averageDishRating: true,
        commonPraises: true,
        commonComplaints: true,
        dietaryWarnings: true,
        dish: {
          select: {
            name: true,
            restaurant: { select: { name: true } },
          },
        },
      },
    });

    console.log(`\nFound ${oldSummaries.length} old-format summaries to rewrite\n`);

    const client = getQwenClient();
    let updated = 0;
    let errors = 0;

    // Process in batches of 5 for the LLM
    const BATCH = 5;
    for (let i = 0; i < oldSummaries.length; i += BATCH) {
      const batch = oldSummaries.slice(i, i + BATCH);

      const dishesForPrompt = batch.map((s) => ({
        dish_name: s.dish.name,
        restaurant: s.dish.restaurant.name,
        review_count: s.totalReviewsAnalyzed,
        avg_rating: Number(s.averageDishRating),
        praises: s.commonPraises,
        complaints: s.commonComplaints,
        dietary_warnings: s.dietaryWarnings,
      }));

      const prompt = `Rewrite these dish review summaries. For each dish I give you existing review data (praises, complaints, rating, review count). Generate a new summary following these STRICT RULES:

- Start with "Based on N reviews," (use the exact review count given)
- Be specific: use the actual praises and complaints given — don't add generic filler
- NEVER say "customers say", "diners report", "patrons mention" — just state the facts
- If there are complaints, mention them honestly
- If praises are generic like "Great flavor", rewrite to be more natural but don't invent details not in the data
- Keep each summary to 1-2 sentences. Every word should carry information.
- If review_count is 0, return "No reviews on this dish yet."

Dishes:
${JSON.stringify(dishesForPrompt, null, 2)}

Return JSON array:
[{"dish_name": "string", "summary": "string", "common_praises": ["specific short phrases"], "common_complaints": ["specific short phrases"]}]

Return ONLY valid JSON.`;

      try {
        const response = await client.chat.completions.create({
          model: QWEN_3,
          max_tokens: 2048,
          messages: [{ role: "user", content: prompt }],
        });

        const text = response.choices[0]?.message?.content;
        if (!text) continue;

        const results = extractJson<Array<{
          dish_name: string;
          summary: string;
          common_praises: string[];
          common_complaints: string[];
        }>>(text);

        if (!Array.isArray(results)) continue;

        for (const result of results) {
          const match = batch.find(
            (s) => s.dish.name.toLowerCase() === result.dish_name.toLowerCase()
          );
          if (!match) continue;

          await prisma.reviewSummary.update({
            where: { id: match.id },
            data: {
              summaryText: result.summary,
              commonPraises: result.common_praises || match.commonPraises,
              commonComplaints: result.common_complaints || match.commonComplaints,
              lastUpdated: new Date(),
            },
          });
          updated++;
        }

        console.log(`[${Math.min(i + BATCH, oldSummaries.length)}/${oldSummaries.length}] Batch done — ${results.length} rewritten`);
      } catch (err) {
        errors++;
        console.error(`[${i}] Batch failed: ${(err as Error).message.slice(0, 100)}`);
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`  Done: ${updated} summaries rewritten, ${errors} batch errors`);
    console.log(`${"=".repeat(50)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
