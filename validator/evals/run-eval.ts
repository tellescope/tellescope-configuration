import { execSync } from 'child_process';
import * as path from 'path';
import { validate } from '../src';
import { EvalDefinition, EvalResult } from './eval-types';
import { checkExpectations } from './matchers';

/**
 * Run a single eval definition
 */
export async function runEval(evalDef: EvalDefinition): Promise<EvalResult> {
  try {
    // Step 1: Run Claude Code with prompt and capture stdout
    const output = await runClaudeCode(evalDef.prompt);

    // Step 2: Extract JSON from output
    const config = extractJson(output);
    if (!config) {
      return {
        evalId: evalDef.id,
        passed: false,
        error: 'Failed to extract valid JSON from Claude Code output',
        rawOutput: output.substring(0, 2000), // Truncate for readability
      };
    }

    // Step 3: Validate the configuration
    const validationResult = validate(config);

    // Step 4: Check expectations
    const expectationResults = checkExpectations(config, evalDef.expectations);

    const passed =
      validationResult.valid &&
      validationResult.summary.errors === 0 &&
      validationResult.summary.warnings === 0 &&
      expectationResults.allPassed;

    return {
      evalId: evalDef.id,
      passed,
      validation: validationResult,
      expectations: expectationResults,
      config,
    };
  } catch (error) {
    return {
      evalId: evalDef.id,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run Claude Code with a prompt and capture stdout
 */
async function runClaudeCode(prompt: string): Promise<string> {
  // Build full prompt that asks for raw JSON output
  const fullPrompt = `${prompt}

Output ONLY the complete JSON configuration. Do not include any explanation, markdown formatting, or code blocks - just the raw JSON object starting with { and ending with }.`;

  // Get the repo root directory (parent of validator/)
  const repoRoot = path.resolve(__dirname, '../..');

  try {
    // Use claude CLI with -p flag in print mode
    // Run from repo root so Claude has access to CLAUDE.md and schemas
    const output = execSync(`claude -p "${escapeShellArg(fullPrompt)}"`, {
      cwd: repoRoot,
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large configs
      timeout: 120000, // 2 minute timeout
    });
    return output;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Claude Code failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Escape a string for use in shell command
 */
function escapeShellArg(arg: string): string {
  // Escape double quotes and backslashes
  return arg.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\$/g, '\\$').replace(/`/g, '\\`');
}

/**
 * Extract JSON from Claude's output, handling potential markdown code blocks
 */
export function extractJson(output: string): unknown | null {
  const trimmed = output.trim();

  // Try parsing raw output first (most common case when Claude follows instructions)
  try {
    return JSON.parse(trimmed);
  } catch {
    // Not raw JSON, continue
  }

  // Try extracting from markdown code block
  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim());
    } catch {
      // Not valid JSON in code block
    }
  }

  // Try finding JSON object in output (greedy match from first { to last })
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
