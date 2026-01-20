#!/usr/bin/env npx ts-node
import { execSync } from 'child_process';
import * as path from 'path';

// Import from validator
import { validate, extractJson, ValidationResult, TellescopeExport } from './validator/src';

// ============================================================================
// Types
// ============================================================================

export interface GenerateConfigOptions {
  /** Timeout for config generation in ms. Default: 600000 (10 minutes) */
  timeout?: number;
  /** Timeout for summary generation in ms. Default: 30000 (30 seconds) */
  summaryTimeout?: number;
  /** Max length of raw output to include in errors. Default: 2000 */
  maxOutputLength?: number;
  /** Skip Claude summary generation (faster, uses deterministic fallback). Default: false */
  skipSummary?: boolean;
  /** Max validation retry attempts. Default: 8 */
  maxRetries?: number;
}

export interface GenerateConfigSuccess {
  success: true;
  config: TellescopeExport;
  summary: string;
  validation: {
    valid: true;
    errors: 0;
    warnings: 0;
  };
}

export interface GenerateConfigError {
  success: false;
  error: {
    stage: 'generation' | 'extraction' | 'validation';
    message: string;
    details?: unknown;
  };
  rawOutput?: string;
  validation?: ValidationResult;
}

export type GenerateConfigResponse = GenerateConfigSuccess | GenerateConfigError;

// ============================================================================
// Main Function
// ============================================================================

/**
 * Generate a Tellescope configuration from a natural language prompt.
 *
 * This function:
 * 1. Invokes Claude Code to generate a configuration JSON (with CLAUDE.md context)
 * 2. Extracts and validates the JSON output
 * 3. If validation fails, retries with error feedback (up to maxRetries)
 * 4. Generates a human-readable summary
 * 5. Returns a structured response suitable for external clients
 *
 * @param prompt - Natural language description of the desired configuration
 * @param options - Configuration options
 * @returns A structured response with either the config or error details
 */
export async function generateConfig(
  prompt: string,
  options: GenerateConfigOptions = {}
): Promise<GenerateConfigResponse> {
  const {
    timeout = 600000, // 10 minutes for complex configs
    summaryTimeout = 30000, // 30 seconds for summary
    maxOutputLength = 2000,
    skipSummary = false,
    maxRetries = 8,
  } = options;

  const repoRoot = path.resolve(__dirname);

  // ========================================================================
  // Phase 1: Initial Generation with proper context
  // ========================================================================
  const initialPrompt = `${prompt}

IMPORTANT: Before generating, please:
1. Read the CLAUDE.md file in this repository for guidance on configuration structure
2. Reference the relevant schema files in schemas/ (automation-schema.md, form-schema.md, template-schema.md)
3. Look at similar examples in examples/models/ for reference

Output ONLY the complete JSON configuration. Do not include any explanation, markdown formatting, or code blocks - just the raw JSON object starting with { and ending with }.`;

  let config: unknown = null;
  let validationResult: ValidationResult | null = null;
  let lastError: string | null = null;
  let lastRawOutput: string | null = null;
  let attempts = 0;

  // ========================================================================
  // Phase 2: Iterative validation loop
  // ========================================================================
  while (attempts < maxRetries) {
    attempts++;

    // Build prompt - initial or retry with validation errors
    const currentPrompt =
      attempts === 1 ? initialPrompt : buildRetryPrompt(prompt, config, validationResult!);

    // Execute Claude Code
    let rawOutput: string;
    try {
      rawOutput = execSync(`claude -p "${escapeShellArg(currentPrompt)}"`, {
        cwd: repoRoot,
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout,
      });
      lastRawOutput = rawOutput;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      continue; // Try again
    }

    // Extract JSON from output
    config = extractJson(rawOutput);
    if (!config) {
      lastError = 'Failed to extract valid JSON from Claude Code output';
      continue; // Try again
    }

    // Validate the configuration
    validationResult = validate(config);

    // Check if valid
    if (
      validationResult.valid &&
      validationResult.summary.errors === 0 &&
      validationResult.summary.warnings === 0
    ) {
      break; // Success! Exit loop
    }

    lastError = `Validation failed: ${validationResult.summary.errors} error(s), ${validationResult.summary.warnings} warning(s)`;
  }

  // Check if we exhausted retries without success
  if (
    !config ||
    !validationResult?.valid ||
    validationResult.summary.errors > 0 ||
    validationResult.summary.warnings > 0
  ) {
    return {
      success: false,
      error: {
        stage: 'validation',
        message: lastError || 'Failed to generate valid configuration after max retries',
        details: validationResult?.errors,
      },
      rawOutput: lastRawOutput?.substring(0, maxOutputLength),
      validation: validationResult || undefined,
    };
  }

  // ========================================================================
  // Phase 3: Generate human-readable summary
  // ========================================================================
  const fallbackSummary = buildFallbackSummary(config);
  let summary = fallbackSummary;

  if (!skipSummary) {
    try {
      const summaryPrompt = `I just generated the following Tellescope configuration based on this request: "${prompt}"

Here is the configuration I created:
${JSON.stringify(config, null, 2)}

Please provide a brief, friendly summary (2-4 sentences) of what this configuration does. Focus on:
- What models were created (journeys, forms, templates, etc.)
- Key functionality (e.g., "sends a reminder SMS", "enrolls patients in a journey")
- Any notable features

Output ONLY the summary text, no formatting or prefixes.`;

      const summaryOutput = execSync(`claude -p "${escapeShellArg(summaryPrompt)}"`, {
        cwd: repoRoot,
        encoding: 'utf-8',
        maxBuffer: 1024 * 1024, // 1MB buffer for summary
        timeout: summaryTimeout,
      });

      summary = summaryOutput.trim();
    } catch {
      // Summary generation failed or timed out - use deterministic fallback
      // This is not an error - we still have a valid config
    }
  }

  // ========================================================================
  // Return success response
  // ========================================================================
  return {
    success: true,
    config: config as TellescopeExport,
    summary,
    validation: {
      valid: true,
      errors: 0,
      warnings: 0,
    },
  };
}

/**
 * Build a retry prompt that includes validation errors for Claude to fix
 */
function buildRetryPrompt(
  originalPrompt: string,
  previousConfig: unknown,
  validationResult: ValidationResult
): string {
  const errorDetails = validationResult.errors
    .map(
      (e) =>
        `- ${e.path}: ${e.message}${e.suggestion ? ` (Suggestion: ${e.suggestion.description})` : ''}`
    )
    .join('\n');

  return `The previous configuration I generated had validation errors. Please fix them.

Original request: ${originalPrompt}

Previous configuration (with errors):
${JSON.stringify(previousConfig, null, 2)}

Validation errors to fix:
${errorDetails}

Please reference the schemas in schemas/ and examples in examples/models/ to ensure the fixed configuration is valid.

Output ONLY the corrected JSON configuration. No explanation - just the raw JSON object starting with { and ending with }.`;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Escape a string for use in shell command arguments
 */
function escapeShellArg(arg: string): string {
  return arg
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/`/g, '\\`');
}

/**
 * Build a deterministic summary based on the actual config content.
 * Used as fallback when Claude summary times out or fails.
 */
function buildFallbackSummary(config: unknown): string {
  const data = (config as Record<string, unknown>)?.data as Record<string, unknown[]> | undefined;
  if (!data) {
    return 'Configuration generated successfully.';
  }

  const parts: string[] = [];

  // Count and describe each model type
  const modelTypes: Array<{ key: string; singular: string; plural: string }> = [
    { key: 'journeys', singular: 'journey', plural: 'journeys' },
    { key: 'forms', singular: 'form', plural: 'forms' },
    { key: 'templates', singular: 'template', plural: 'templates' },
    { key: 'automation_triggers', singular: 'automation trigger', plural: 'automation triggers' },
    { key: 'calendar_event_templates', singular: 'calendar event template', plural: 'calendar event templates' },
  ];

  for (const { key, singular, plural } of modelTypes) {
    const models = data[key];
    if (Array.isArray(models) && models.length > 0) {
      const count = models.length;
      const titles = models
        .slice(0, 2)
        .map((m) => (m as Record<string, unknown>).title as string | undefined)
        .filter((t): t is string => Boolean(t));

      const label = count === 1 ? singular : plural;
      const titleStr = titles.length > 0 ? ` (${titles.join(', ')})` : '';
      parts.push(`${count} ${label}${titleStr}`);
    }
  }

  if (parts.length === 0) {
    return 'Configuration generated successfully.';
  }

  return `Generated configuration containing: ${parts.join(', ')}.`;
}

// ============================================================================
// CLI Interface
// ============================================================================

if (require.main === module) {
  const args = process.argv.slice(2);
  const skipSummary = args.includes('--no-summary');
  const prompt = args.filter((a) => a !== '--no-summary').join(' ');

  if (!prompt) {
    console.error(
      JSON.stringify(
        {
          success: false,
          error: {
            stage: 'generation',
            message:
              'No prompt provided. Usage: npx ts-node generate-config.ts "your prompt here" [--no-summary]',
          },
        },
        null,
        2
      )
    );
    process.exit(1);
  }

  generateConfig(prompt, { skipSummary })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error(
        JSON.stringify(
          {
            success: false,
            error: {
              stage: 'generation',
              message: error instanceof Error ? error.message : String(error),
            },
          },
          null,
          2
        )
      );
      process.exit(1);
    });
}
