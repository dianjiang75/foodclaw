/**
 * Robustly extract JSON from an LLM text response.
 * Handles: raw JSON, markdown-fenced JSON, JSON with leading/trailing text.
 */
export function extractJson<T = unknown>(text: string): T {
  // 1. Try direct parse first (fastest path)
  try {
    return JSON.parse(text) as T;
  } catch {
    // continue to fallback strategies
  }

  // 2. Try extracting from markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch?.[1]) {
    try {
      return JSON.parse(fenceMatch[1]) as T;
    } catch {
      // continue
    }
  }

  // 3. Try finding the first [ or { and matching to last ] or }
  const firstBracket = text.indexOf("[");
  const firstBrace = text.indexOf("{");

  let start = -1;
  let end = -1;

  if (firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace)) {
    start = firstBracket;
    end = text.lastIndexOf("]") + 1;
  } else if (firstBrace >= 0) {
    start = firstBrace;
    end = text.lastIndexOf("}") + 1;
  }

  if (start >= 0 && end > start) {
    try {
      return JSON.parse(text.slice(start, end)) as T;
    } catch {
      // continue
    }
  }

  throw new Error(`Failed to extract JSON from LLM response: ${text.slice(0, 200)}...`);
}
