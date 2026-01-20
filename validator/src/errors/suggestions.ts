import { ValidationError, FixSuggestion, FixConfidence } from './types';

/**
 * Apply a fix suggestion to a configuration object
 * Returns a new object with the fix applied
 */
export function applyFix(config: object, suggestion: FixSuggestion): object {
  const result = JSON.parse(JSON.stringify(config)); // Deep clone
  const pathParts = suggestion.targetPath.split(/\.|\[|\]/).filter(Boolean);

  let current: Record<string, unknown> = result;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const key = pathParts[i];
    if (current[key] === undefined) {
      return result; // Path doesn't exist, can't apply fix
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = pathParts[pathParts.length - 1];

  switch (suggestion.type) {
    case 'replace':
      current[lastKey] = suggestion.value;
      break;
    case 'remove':
      delete current[lastKey];
      break;
    case 'add':
      current[lastKey] = suggestion.value;
      break;
    case 'rename':
      if (suggestion.value && typeof suggestion.value === 'string') {
        const oldValue = current[lastKey];
        delete current[lastKey];
        current[suggestion.value] = oldValue;
      }
      break;
  }

  return result;
}

/**
 * Apply all fixes with a minimum confidence level
 */
export function applyAutoFixes(
  config: object,
  errors: ValidationError[],
  minConfidence: FixConfidence = 'high'
): { config: object; appliedFixes: number; skippedFixes: number } {
  const confidenceLevels: Record<FixConfidence, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  const minLevel = confidenceLevels[minConfidence];
  let result = config;
  let appliedFixes = 0;
  let skippedFixes = 0;

  for (const error of errors) {
    if (error.suggestion) {
      const suggestionLevel = confidenceLevels[error.suggestion.confidence];
      if (suggestionLevel >= minLevel) {
        result = applyFix(result, error.suggestion);
        appliedFixes++;
      } else {
        skippedFixes++;
      }
    }
  }

  return { config: result, appliedFixes, skippedFixes };
}

/**
 * Generate a truncation suggestion for a string that's too long
 */
export function generateTruncationSuggestion(
  value: string,
  maxLength: number,
  path: string
): FixSuggestion {
  return {
    type: 'replace',
    targetPath: path,
    value: value.substring(0, maxLength - 3) + '...',
    description: `Truncate to ${maxLength} characters`,
    confidence: 'low', // Truncation may lose important information
  };
}

/**
 * Generate an ID replacement suggestion
 */
export function generateIdReplacementSuggestion(
  availableIds: Array<{ id: string; title: string }>,
  path: string,
  modelType: string
): FixSuggestion | undefined {
  if (availableIds.length === 0) {
    return undefined;
  }

  const first = availableIds[0];
  return {
    type: 'replace',
    targetPath: path,
    value: first.id,
    description: `Replace with existing ${modelType}: "${first.title}" (${first.id})`,
    confidence: availableIds.length === 1 ? 'medium' : 'low',
  };
}
