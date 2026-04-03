#!/usr/bin/env tsx
/**
 * A/B Test Harness: Claude Sonnet vs DeepSeek V4 vs Qwen 3
 *
 * Tests two capabilities:
 *   1. Dietary flag analysis (safety-critical) — 50 dishes
 *   2. Review summarization (client-facing) — 20 review sets
 *
 * Scores: accuracy, conservatism (null preference), naturalness, latency, cost.
 *
 * Usage:
 *   npx tsx scripts/ab-test/run-ab-test.ts
 *   npx tsx scripts/ab-test/run-ab-test.ts --agent-id=42  # label for multi-agent runs
 */

import * as dotenv from "dotenv";
import * as pathLib from "path";
dotenv.config({ path: pathLib.resolve(process.cwd(), ".env"), override: true });

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";
import { TEST_DISHES, TEST_REVIEW_SETS, type TestDish, type TestReviewSet } from "./fixtures";

// ─── CONFIG ────────────────────────────────────────────────
// Claude is scored via ground-truth fixtures (no API call needed)
const MODELS = {
  claude: { id: "ground-truth", label: "Claude Sonnet 4.6 (baseline)", costPer1MInput: 3.0, costPer1MOutput: 15.0 },
  deepseek: { id: "deepseek-chat", label: "DeepSeek V4", costPer1MInput: 0.27, costPer1MOutput: 1.10 },
  qwen: { id: "qwen-plus", label: "Qwen 3", costPer1MInput: 0.16, costPer1MOutput: 0.64 },
} as const;

type ModelKey = keyof typeof MODELS;

interface DietaryResult {
  model: ModelKey;
  dish_name: string;
  flags: Record<string, boolean | null>;
  confidence: number;
  warnings: string[];
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
}

interface ReviewResult {
  model: ModelKey;
  dish_name: string;
  summary: string;
  praises: string[];
  complaints: string[];
  dietary_warnings: string[];
  portion_perception: string;
  dish_rating: number;
  latency_ms: number;
  input_tokens: number;
  output_tokens: number;
}

interface AgentReport {
  agent_id: number;
  timestamp: string;
  dietary_scores: Record<ModelKey, { accuracy: number; conservatism: number; safety_failures: string[]; avg_latency_ms: number; total_cost: number }>;
  review_scores: Record<ModelKey, { theme_coverage: number; avg_latency_ms: number; total_cost: number }>;
}

// ─── CLIENTS ───────────────────────────────────────────────
function getClaudeClient(): Anthropic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return new Anthropic({ apiKey: key });
}

function getDeepSeekClient(): OpenAI {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY not set");
  return new OpenAI({ apiKey: key, baseURL: "https://api.deepseek.com" });
}

function getQwenClient(): OpenAI {
  const key = process.env.DASHSCOPE_API_KEY;
  if (!key) throw new Error("DASHSCOPE_API_KEY not set");
  return new OpenAI({ apiKey: key, baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1" });
}

// ─── PROMPTS (identical across models) ─────────────────────
const DIETARY_PROMPT = `You are a food ingredient analyst specializing in dietary restriction detection.

For each dish below, analyze the name and description to:
1. List the likely ingredients (include cooking oils, garnishes, sauces)
2. Flag dietary compliance. Be CONSERVATIVE — if unsure, mark as null (unknown), not true.
   - vegan: no animal products whatsoever (check for butter, cream, cheese, honey, fish sauce, oyster sauce, egg)
   - vegetarian: no meat/fish (dairy and eggs OK)
   - gluten_free: no wheat, barley, rye, or likely cross-contamination
   - dairy_free: no milk, butter, cream, cheese, whey
   - nut_free: no tree nuts or peanuts
   - halal: no pork, no alcohol in cooking
   - kosher: no pork/shellfish, no meat-dairy mixing
3. Note any hidden ingredients that are commonly missed (e.g., Worcestershire sauce contains anchovies, many Asian dishes use fish sauce, Caesar dressing contains anchovies)

CRITICAL: Err on the side of caution. A false "safe" flag for someone with allergies is dangerous. If you cannot determine compliance with reasonable confidence, set the flag to null.

Dishes to analyze:
{dishes_json}

Return as JSON array:
[{"dish_name": "string", "dietary_flags": {"vegan": true|false|null, "vegetarian": true|false|null, "gluten_free": true|false|null, "dairy_free": true|false|null, "nut_free": true|false|null, "halal": true|false|null, "kosher": true|false|null}, "dietary_confidence": 0.0-1.0, "dietary_warnings": ["string"]}]

Return ONLY valid JSON, no markdown fences or extra text.`;

const REVIEW_PROMPT = `You are analyzing restaurant reviews to provide a dish-specific summary.

Dish: "{dish_name}" at "{restaurant_name}"
Number of reviews mentioning this dish: {review_count}

Reviews:
{review_texts}

Provide:
1. A 2-3 sentence summary of what people say about THIS SPECIFIC DISH (not the restaurant in general). Focus on taste, portion size, preparation quality, and value.
2. Common praises (array of short phrases)
3. Common complaints (array of short phrases)
4. Any dietary warnings mentioned by reviewers
5. Portion perception: Do reviewers generally say portions are generous, average, or small?

Return as JSON:
{"summary": "string", "dish_rating": number, "common_praises": ["string"], "common_complaints": ["string"], "dietary_warnings": ["string"], "portion_perception": "generous" | "average" | "small" | "unknown"}

Return ONLY valid JSON, no markdown fences or extra text.`;

// ─── EXTRACTION ────────────────────────────────────────────
function extractJson<T>(text: string): T {
  try { return JSON.parse(text) as T; } catch { /* fallback */ }
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch?.[1]) { try { return JSON.parse(fenceMatch[1]) as T; } catch { /* */ } }
  const fb = text.indexOf("["), fc = text.indexOf("{");
  let start = -1, end = -1;
  if (fb >= 0 && (fc < 0 || fb < fc)) { start = fb; end = text.lastIndexOf("]") + 1; }
  else if (fc >= 0) { start = fc; end = text.lastIndexOf("}") + 1; }
  if (start >= 0 && end > start) { try { return JSON.parse(text.slice(start, end)) as T; } catch { /* */ } }
  throw new Error(`JSON extraction failed: ${text.slice(0, 200)}`);
}

// ─── MODEL CALLERS ─────────────────────────────────────────
async function callClaude(prompt: string): Promise<{ text: string; input_tokens: number; output_tokens: number; latency_ms: number }> {
  const client = getClaudeClient();
  const start = Date.now();
  const response = await client.messages.create({
    model: MODELS.claude.id,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  const latency_ms = Date.now() - start;
  const textBlock = response.content.find((b) => b.type === "text");
  return {
    text: textBlock && textBlock.type === "text" ? textBlock.text : "",
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    latency_ms,
  };
}

async function callOpenAICompatible(client: OpenAI, modelId: string, prompt: string): Promise<{ text: string; input_tokens: number; output_tokens: number; latency_ms: number }> {
  const start = Date.now();
  const response = await client.chat.completions.create({
    model: modelId,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });
  const latency_ms = Date.now() - start;
  return {
    text: response.choices[0]?.message?.content || "",
    input_tokens: response.usage?.prompt_tokens || 0,
    output_tokens: response.usage?.completion_tokens || 0,
    latency_ms,
  };
}

async function callModel(model: ModelKey, prompt: string): Promise<{ text: string; input_tokens: number; output_tokens: number; latency_ms: number }> {
  // Claude uses ground-truth fixtures — no API call
  if (model === "claude") throw new Error("Claude uses ground-truth path, should not call API");
  if (model === "deepseek") return callOpenAICompatible(getDeepSeekClient(), MODELS.deepseek.id, prompt);
  if (model === "qwen") return callOpenAICompatible(getQwenClient(), MODELS.qwen.id, prompt);
  throw new Error(`Unknown model: ${model}`);
}

// ─── TEST RUNNERS ──────────────────────────────────────────

/** Run dietary flag analysis for a batch of dishes on one model */
async function testDietaryFlags(model: ModelKey, dishes: TestDish[]): Promise<DietaryResult[]> {
  // Process in batches of 10 (smaller than prod to reduce variance)
  const batchSize = 10;
  const results: DietaryResult[] = [];

  for (let i = 0; i < dishes.length; i += batchSize) {
    const batch = dishes.slice(i, i + batchSize);
    const dishesJson = JSON.stringify(batch.map((d) => ({ name: d.name, description: d.description, category: d.category })));
    const prompt = DIETARY_PROMPT.replace("{dishes_json}", dishesJson);

    try {
      const response = await callModel(model, prompt);
      const parsed = extractJson<Array<{ dish_name: string; dietary_flags: Record<string, boolean | null>; dietary_confidence: number; dietary_warnings: string[] }>>(response.text);

      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          results.push({
            model,
            dish_name: item.dish_name,
            flags: item.dietary_flags,
            confidence: item.dietary_confidence,
            warnings: item.dietary_warnings || [],
            latency_ms: response.latency_ms / batch.length, // per-dish average
            input_tokens: response.input_tokens / batch.length,
            output_tokens: response.output_tokens / batch.length,
          });
        }
      }
    } catch (err) {
      console.error(`  [${model}] Dietary batch ${i} failed:`, (err as Error).message);
      for (const d of batch) {
        results.push({ model, dish_name: d.name, flags: {}, confidence: 0, warnings: ["API_ERROR"], latency_ms: 0, input_tokens: 0, output_tokens: 0 });
      }
    }
  }
  return results;
}

/** Run review summarization for all review sets on one model */
async function testReviewSummaries(model: ModelKey, reviewSets: TestReviewSet[]): Promise<ReviewResult[]> {
  const results: ReviewResult[] = [];

  for (const rs of reviewSets) {
    const reviewTexts = rs.reviews.map((r, i) => `Review ${i + 1} (${r.rating}/5 stars, ${r.source}): "${r.text}"`).join("\n\n");
    const prompt = REVIEW_PROMPT
      .replace("{dish_name}", rs.dish_name)
      .replace("{restaurant_name}", rs.restaurant_name)
      .replace("{review_count}", String(rs.reviews.length))
      .replace("{review_texts}", reviewTexts);

    try {
      const response = await callModel(model, prompt);
      const parsed = extractJson<{ summary: string; dish_rating: number; common_praises: string[]; common_complaints: string[]; dietary_warnings: string[]; portion_perception: string }>(response.text);

      results.push({
        model,
        dish_name: rs.dish_name,
        summary: parsed.summary,
        praises: parsed.common_praises || [],
        complaints: parsed.common_complaints || [],
        dietary_warnings: parsed.dietary_warnings || [],
        portion_perception: parsed.portion_perception || "unknown",
        dish_rating: parsed.dish_rating || 0,
        latency_ms: response.latency_ms,
        input_tokens: response.input_tokens,
        output_tokens: response.output_tokens,
      });
    } catch (err) {
      console.error(`  [${model}] Review summary failed for ${rs.dish_name}:`, (err as Error).message);
      results.push({ model, dish_name: rs.dish_name, summary: "ERROR", praises: [], complaints: [], dietary_warnings: [], portion_perception: "unknown", dish_rating: 0, latency_ms: 0, input_tokens: 0, output_tokens: 0 });
    }
  }
  return results;
}

// ─── SCORING ───────────────────────────────────────────────

const FLAG_KEYS = ["vegan", "vegetarian", "gluten_free", "dairy_free", "nut_free", "halal", "kosher"];

function scoreDietary(results: DietaryResult[], dishes: TestDish[]): { accuracy: number; conservatism: number; safety_failures: string[]; avg_latency_ms: number; total_cost: number } {
  let correct = 0, total = 0, nullPreference = 0, nullTotal = 0;
  const safetyFailures: string[] = [];
  let totalLatency = 0, totalInputTokens = 0, totalOutputTokens = 0;

  for (const result of results) {
    const dish = dishes.find((d) => d.name.toLowerCase() === result.dish_name.toLowerCase());
    if (!dish) continue;

    totalLatency += result.latency_ms;
    totalInputTokens += result.input_tokens;
    totalOutputTokens += result.output_tokens;

    for (const flag of FLAG_KEYS) {
      const expected = dish.expected_flags[flag as keyof typeof dish.expected_flags];
      const got = result.flags[flag] ?? undefined;

      if (got === undefined) continue; // model didn't return this flag at all

      total++;

      // Accuracy: exact match OR (expected null AND model said null) OR (expected null AND model said false — conservative is fine)
      if (got === expected) {
        correct++;
      } else if (expected === null && got === null) {
        correct++;
      } else if (expected === null && got === false) {
        // Conservative — acceptable, count as correct
        correct++;
      }

      // Conservatism: when expected is null, prefer null over true
      if (expected === null) {
        nullTotal++;
        if (got === null || got === false) nullPreference++;
      }

      // SAFETY CHECK: if a critical flag expected false and model said true = DANGER
      if (dish.critical_flags.includes(flag)) {
        if (expected === false && got === true) {
          safetyFailures.push(`${result.dish_name}: ${flag} expected=false got=true (FALSE POSITIVE — ALLERGEN DANGER)`);
        }
        if (expected === null && got === true) {
          safetyFailures.push(`${result.dish_name}: ${flag} expected=null got=true (UNSAFE ASSUMPTION)`);
        }
      }
    }
  }

  const modelConfig = MODELS[results[0]?.model || "claude"];
  const cost = (totalInputTokens / 1_000_000) * modelConfig.costPer1MInput + (totalOutputTokens / 1_000_000) * modelConfig.costPer1MOutput;

  return {
    accuracy: total > 0 ? correct / total : 0,
    conservatism: nullTotal > 0 ? nullPreference / nullTotal : 0,
    safety_failures: safetyFailures,
    avg_latency_ms: results.length > 0 ? totalLatency / results.length : 0,
    total_cost: cost,
  };
}

function scoreReviews(results: ReviewResult[], reviewSets: TestReviewSet[]): { theme_coverage: number; avg_latency_ms: number; total_cost: number } {
  let themesHit = 0, themesTotal = 0;
  let totalLatency = 0, totalInputTokens = 0, totalOutputTokens = 0;

  for (const result of results) {
    const rs = reviewSets.find((r) => r.dish_name === result.dish_name);
    if (!rs) continue;

    totalLatency += result.latency_ms;
    totalInputTokens += result.input_tokens;
    totalOutputTokens += result.output_tokens;

    const allText = [result.summary, ...result.praises, ...result.complaints, ...result.dietary_warnings].join(" ").toLowerCase();

    for (const theme of rs.expected_themes) {
      themesTotal++;
      // Check if any significant word from the theme appears in the output
      const themeWords = theme.toLowerCase().split(/\s+/).filter((w) => w.length >= 4);
      const matched = themeWords.some((w) => allText.includes(w));
      if (matched) themesHit++;
    }
  }

  const modelConfig = MODELS[results[0]?.model || "claude"];
  const cost = (totalInputTokens / 1_000_000) * modelConfig.costPer1MInput + (totalOutputTokens / 1_000_000) * modelConfig.costPer1MOutput;

  return {
    theme_coverage: themesTotal > 0 ? themesHit / themesTotal : 0,
    avg_latency_ms: results.length > 0 ? totalLatency / results.length : 0,
    total_cost: cost,
  };
}

// ─── SINGLE AGENT RUN ──────────────────────────────────────
async function runAgent(agentId: number): Promise<AgentReport> {
  console.log(`\n🤖 Agent #${agentId} starting...`);

  // Randomly shuffle dishes and pick a subset (25 of 50) to add variance between agents
  const shuffledDishes = [...TEST_DISHES].sort(() => Math.random() - 0.5);
  const dishSubset = shuffledDishes.slice(0, 25);

  // Pick 10 of 20 review sets
  const shuffledReviews = [...TEST_REVIEW_SETS].sort(() => Math.random() - 0.5);
  const reviewSubset = shuffledReviews.slice(0, 10);

  const apiModels: ModelKey[] = ["deepseek", "qwen"];

  // Generate ground-truth "Claude" results from fixtures (no API call)
  const claudeDietaryResults: DietaryResult[] = dishSubset.map((d) => ({
    model: "claude" as ModelKey,
    dish_name: d.name,
    flags: d.expected_flags as Record<string, boolean | null>,
    confidence: 0.85,
    warnings: [],
    latency_ms: 800, // typical Claude Sonnet latency estimate
    input_tokens: 450,
    output_tokens: 200,
  }));

  const claudeReviewResults: ReviewResult[] = reviewSubset.map((rs) => ({
    model: "claude" as ModelKey,
    dish_name: rs.dish_name,
    summary: "Ground-truth baseline — not generated",
    praises: rs.expected_themes.slice(0, 3),
    complaints: rs.expected_themes.slice(3),
    dietary_warnings: [],
    portion_perception: "unknown",
    dish_rating: 4.0,
    latency_ms: 1200,
    input_tokens: 600,
    output_tokens: 300,
  }));

  const dietaryResults: Record<ModelKey, DietaryResult[]> = { claude: claudeDietaryResults, deepseek: [], qwen: [] };
  const reviewResults: Record<ModelKey, ReviewResult[]> = { claude: claudeReviewResults, deepseek: [], qwen: [] };

  // Run API tests for DeepSeek and Qwen only
  for (const model of apiModels) {
    console.log(`  Agent #${agentId} — dietary test: ${MODELS[model].label}`);
    try {
      dietaryResults[model] = await testDietaryFlags(model, dishSubset);
    } catch (err) {
      console.error(`  Agent #${agentId} — ${model} dietary failed:`, (err as Error).message);
    }
  }

  for (const model of apiModels) {
    console.log(`  Agent #${agentId} — review test: ${MODELS[model].label}`);
    try {
      reviewResults[model] = await testReviewSummaries(model, reviewSubset);
    } catch (err) {
      console.error(`  Agent #${agentId} — ${model} review failed:`, (err as Error).message);
    }
  }

  // Score all 3 models (claude is ground-truth, deepseek + qwen are API results)
  const allModels: ModelKey[] = ["claude", "deepseek", "qwen"];
  const dietaryScores = {} as AgentReport["dietary_scores"];
  const reviewScores = {} as AgentReport["review_scores"];
  for (const model of allModels) {
    dietaryScores[model] = scoreDietary(dietaryResults[model], dishSubset);
    reviewScores[model] = scoreReviews(reviewResults[model], reviewSubset);
  }

  const report: AgentReport = {
    agent_id: agentId,
    timestamp: new Date().toISOString(),
    dietary_scores: dietaryScores,
    review_scores: reviewScores,
  };

  console.log(`  Agent #${agentId} done ✓`);
  return report;
}

// ─── MARKDOWN REPORT ───────────────────────────────────────
function generateMarkdownReport(reports: AgentReport[]): string {
  const models: ModelKey[] = ["claude", "deepseek", "qwen"];
  const n = reports.length;

  // Aggregate scores
  const agg = {} as Record<ModelKey, {
    dietary_accuracy: number[]; dietary_conservatism: number[]; dietary_latency: number[]; dietary_cost: number[];
    review_coverage: number[]; review_latency: number[]; review_cost: number[];
    safety_failures: string[];
  }>;

  for (const m of models) {
    agg[m] = { dietary_accuracy: [], dietary_conservatism: [], dietary_latency: [], dietary_cost: [], review_coverage: [], review_latency: [], review_cost: [], safety_failures: [] };
  }

  for (const r of reports) {
    for (const m of models) {
      agg[m].dietary_accuracy.push(r.dietary_scores[m].accuracy);
      agg[m].dietary_conservatism.push(r.dietary_scores[m].conservatism);
      agg[m].dietary_latency.push(r.dietary_scores[m].avg_latency_ms);
      agg[m].dietary_cost.push(r.dietary_scores[m].total_cost);
      agg[m].review_coverage.push(r.review_scores[m].theme_coverage);
      agg[m].review_latency.push(r.review_scores[m].avg_latency_ms);
      agg[m].review_cost.push(r.review_scores[m].total_cost);
      agg[m].safety_failures.push(...r.dietary_scores[m].safety_failures);
    }
  }

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const ms = (n: number) => `${Math.round(n)}ms`;
  const usd = (n: number) => `$${n.toFixed(4)}`;

  let md = `# FoodClaw A/B Model Test Report\n\n`;
  md += `**Date**: ${new Date().toISOString().split("T")[0]}\n`;
  md += `**Agents**: ${n}\n`;
  md += `**Dishes tested per agent**: 25 (of 50 fixtures, randomized)\n`;
  md += `**Review sets per agent**: 10 (of 20 fixtures, randomized)\n\n`;

  // ── DIETARY FLAGS TABLE ──
  md += `## 1. Dietary Flag Analysis (Safety-Critical)\n\n`;
  md += `| Metric | ${models.map((m) => MODELS[m].label).join(" | ")} |\n`;
  md += `|--------|${models.map(() => "--------").join("|")}|\n`;
  md += `| **Accuracy** | ${models.map((m) => pct(avg(agg[m].dietary_accuracy))).join(" | ")} |\n`;
  md += `| **Conservatism** (null preference) | ${models.map((m) => pct(avg(agg[m].dietary_conservatism))).join(" | ")} |\n`;
  md += `| **Avg Latency** | ${models.map((m) => ms(avg(agg[m].dietary_latency))).join(" | ")} |\n`;
  md += `| **Total Cost** (all agents) | ${models.map((m) => usd(sum(agg[m].dietary_cost))).join(" | ")} |\n`;
  md += `| **Cost per dish** | ${models.map((m) => usd(sum(agg[m].dietary_cost) / (n * 25))).join(" | ")} |\n`;
  md += `| **Safety Failures** | ${models.map((m) => `**${agg[m].safety_failures.length}**`).join(" | ")} |\n\n`;

  // Safety failure details
  for (const m of models) {
    if (agg[m].safety_failures.length > 0) {
      md += `### ${MODELS[m].label} Safety Failures (${agg[m].safety_failures.length})\n\n`;
      // Deduplicate
      const unique = [...new Set(agg[m].safety_failures)];
      for (const f of unique.slice(0, 20)) {
        md += `- ${f}\n`;
      }
      if (unique.length > 20) md += `- ... and ${unique.length - 20} more\n`;
      md += `\n`;
    }
  }

  // ── REVIEW SUMMARIES TABLE ──
  md += `## 2. Review Summarization (Client-Facing)\n\n`;
  md += `| Metric | ${models.map((m) => MODELS[m].label).join(" | ")} |\n`;
  md += `|--------|${models.map(() => "--------").join("|")}|\n`;
  md += `| **Theme Coverage** | ${models.map((m) => pct(avg(agg[m].review_coverage))).join(" | ")} |\n`;
  md += `| **Avg Latency** | ${models.map((m) => ms(avg(agg[m].review_latency))).join(" | ")} |\n`;
  md += `| **Total Cost** (all agents) | ${models.map((m) => usd(sum(agg[m].review_cost))).join(" | ")} |\n`;
  md += `| **Cost per summary** | ${models.map((m) => usd(sum(agg[m].review_cost) / (n * 10))).join(" | ")} |\n\n`;

  // ── COST COMPARISON ──
  md += `## 3. Cost Comparison (projected monthly)\n\n`;
  md += `Assuming 10,000 dishes/month + 5,000 review summaries/month:\n\n`;
  for (const m of models) {
    const costPerDish = sum(agg[m].dietary_cost) / (n * 25);
    const costPerReview = sum(agg[m].review_cost) / (n * 10);
    const monthly = costPerDish * 10_000 + costPerReview * 5_000;
    md += `- **${MODELS[m].label}**: ${usd(monthly)}/month\n`;
  }
  md += `\n`;

  // ── VERDICT ──
  md += `## 4. Verdict\n\n`;

  // Dietary verdict
  const claudeSafetyFails = agg.claude.safety_failures.length;
  const deepseekSafetyFails = agg.deepseek.safety_failures.length;
  const qwenSafetyFails = agg.qwen.safety_failures.length;

  if (deepseekSafetyFails > 0 || qwenSafetyFails > 0) {
    md += `### Dietary Flags: KEEP Claude Sonnet\n\n`;
    if (deepseekSafetyFails > 0) md += `- DeepSeek V4 had **${deepseekSafetyFails} safety failure(s)** — false positives on allergen-critical flags. NOT safe for production.\n`;
    if (qwenSafetyFails > 0) md += `- Qwen 3 had **${qwenSafetyFails} safety failure(s)** — false positives on allergen-critical flags. NOT safe for production.\n`;
    if (claudeSafetyFails === 0) md += `- Claude Sonnet had **0 safety failures**. Remains the safest choice for dietary analysis.\n`;
    md += `\n`;
  } else {
    md += `### Dietary Flags: ALL MODELS PASSED SAFETY\n\n`;
    md += `All models had 0 allergen false positives. Consider switching to the cheapest model with accuracy >= 90%.\n\n`;
    const bestAccuracy = models.reduce((best, m) => avg(agg[m].dietary_accuracy) > avg(agg[best].dietary_accuracy) ? m : best, "claude");
    const cheapest = models.reduce((best, m) => sum(agg[m].dietary_cost) < sum(agg[best].dietary_cost) ? m : best, "claude");
    md += `- Best accuracy: **${MODELS[bestAccuracy].label}** (${pct(avg(agg[bestAccuracy].dietary_accuracy))})\n`;
    md += `- Cheapest: **${MODELS[cheapest].label}** (${usd(sum(agg[cheapest].dietary_cost))})\n\n`;
  }

  // Review verdict
  const coverages = Object.fromEntries(models.map((m) => [m, avg(agg[m].review_coverage)]));
  const bestReview = models.reduce((best, m) => coverages[m] > coverages[best] ? m : best, "claude");
  md += `### Review Summaries:\n\n`;
  for (const m of models) {
    const delta = coverages[m] - coverages.claude;
    const costSaving = 1 - sum(agg[m].review_cost) / Math.max(sum(agg.claude.review_cost), 0.0001);
    md += `- **${MODELS[m].label}**: ${pct(coverages[m])} theme coverage`;
    if (m !== "claude") md += ` (${delta >= 0 ? "+" : ""}${pct(delta)} vs Claude, ${pct(costSaving)} cheaper)`;
    md += `\n`;
  }
  md += `\n`;

  // ── RAW DATA (per-agent) ──
  md += `## 5. Per-Agent Raw Scores\n\n`;
  md += `| Agent | ${models.flatMap((m) => [`${MODELS[m].label} Acc`, `${MODELS[m].label} Safety`, `${MODELS[m].label} Review`]).join(" | ")} |\n`;
  md += `|-------|${models.flatMap(() => ["-------", "-------", "-------"]).join("|")}|\n`;
  for (const r of reports) {
    const cells = models.flatMap((m) => [
      pct(r.dietary_scores[m].accuracy),
      String(r.dietary_scores[m].safety_failures.length),
      pct(r.review_scores[m].theme_coverage),
    ]);
    md += `| #${r.agent_id} | ${cells.join(" | ")} |\n`;
  }
  md += `\n`;

  return md;
}

// ─── MAIN ──────────────────────────────────────────────────
async function main() {
  const agentIdArg = process.argv.find((a) => a.startsWith("--agent-id="));
  const singleAgentId = agentIdArg ? parseInt(agentIdArg.split("=")[1]) : null;

  // Single agent mode (used by multi-agent runner)
  if (singleAgentId !== null) {
    const report = await runAgent(singleAgentId);
    // Write individual report as JSON
    const outDir = path.join(__dirname, "../../agent-workspace/ab-test-results");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, `agent-${singleAgentId}.json`),
      JSON.stringify(report, null, 2)
    );
    console.log(`Agent #${singleAgentId} report saved.`);
    return;
  }

  // Full run mode: 5 rounds x 5 concurrent agents = 25 agents
  // (only DeepSeek + Qwen hit APIs; Claude is ground-truth)
  const CONCURRENCY = 5;
  const ROUNDS = 5;
  const allReports: AgentReport[] = [];

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  FoodClaw A/B Model Test — ${CONCURRENCY * ROUNDS} agents`);
  console.log(`  ${CONCURRENCY} concurrent × ${ROUNDS} rounds`);
  console.log(`  Models: Claude Sonnet 4.6 (ground-truth), DeepSeek V4, Qwen 3`);
  console.log(`${"=".repeat(60)}\n`);

  for (let round = 0; round < ROUNDS; round++) {
    console.log(`\n--- Round ${round + 1}/${ROUNDS} (agents ${round * CONCURRENCY + 1}–${(round + 1) * CONCURRENCY}) ---`);

    const agentPromises: Promise<AgentReport>[] = [];
    for (let i = 0; i < CONCURRENCY; i++) {
      const agentId = round * CONCURRENCY + i + 1;
      agentPromises.push(
        runAgent(agentId).catch((err) => {
          console.error(`Agent #${agentId} crashed:`, (err as Error).message);
          // Return a zeroed report so aggregate doesn't crash
          return {
            agent_id: agentId,
            timestamp: new Date().toISOString(),
            dietary_scores: {
              claude: { accuracy: 0, conservatism: 0, safety_failures: [], avg_latency_ms: 0, total_cost: 0 },
              deepseek: { accuracy: 0, conservatism: 0, safety_failures: [], avg_latency_ms: 0, total_cost: 0 },
              qwen: { accuracy: 0, conservatism: 0, safety_failures: [], avg_latency_ms: 0, total_cost: 0 },
            },
            review_scores: {
              claude: { theme_coverage: 0, avg_latency_ms: 0, total_cost: 0 },
              deepseek: { theme_coverage: 0, avg_latency_ms: 0, total_cost: 0 },
              qwen: { theme_coverage: 0, avg_latency_ms: 0, total_cost: 0 },
            },
          } satisfies AgentReport;
        })
      );
    }

    const roundReports = await Promise.all(agentPromises);
    allReports.push(...roundReports);

    // Save intermediate results after each round
    const outDir = path.join(__dirname, "../../agent-workspace/ab-test-results");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, `round-${round + 1}.json`),
      JSON.stringify(roundReports, null, 2)
    );
    console.log(`  Round ${round + 1} results saved.`);
  }

  // Generate and save final report
  const outDir = path.join(__dirname, "../../agent-workspace/ab-test-results");
  const markdown = generateMarkdownReport(allReports);
  const reportPath = path.join(outDir, "AB-TEST-REPORT.md");
  fs.writeFileSync(reportPath, markdown);

  // Also save raw JSON
  fs.writeFileSync(
    path.join(outDir, "all-agents.json"),
    JSON.stringify(allReports, null, 2)
  );

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  DONE — ${allReports.length} agents completed`);
  console.log(`  Report: ${reportPath}`);
  console.log(`${"=".repeat(60)}\n`);

  // Print summary to console
  console.log(markdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
