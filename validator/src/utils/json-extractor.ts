/**
 * Extract JSON from Claude's output, handling potential markdown code blocks.
 *
 * This function tries multiple extraction strategies in order:
 * 1. Parse raw output directly (when Claude follows instructions)
 * 2. Extract from markdown code blocks (```json ... ```)
 * 3. Find JSON object by locating first { and last }
 *
 * @param output - Raw output from Claude Code
 * @returns Parsed JSON object or null if extraction failed
 */
export function extractJson(output: string): unknown | null {
  const trimmed = output.trim();

  // Strategy 1: Try parsing raw output first (most common case when Claude follows instructions)
  try {
    return JSON.parse(trimmed);
  } catch {
    // Not raw JSON, continue
  }

  // Strategy 2: Try extracting from markdown code block
  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim());
    } catch {
      // Not valid JSON in code block
    }
  }

  // Strategy 3: Try finding JSON object in output (greedy match from first { to last })
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch {
      // Not valid JSON
    }
  }

  return null;
}
