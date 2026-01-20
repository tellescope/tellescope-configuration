import { ValidationResult } from './types';

/**
 * Format validation result as JSON string
 */
export function formatAsJson(result: ValidationResult, pretty = true): string {
  return JSON.stringify(result, null, pretty ? 2 : 0);
}

/**
 * Create a validation result object
 */
export function createValidationResult(
  errors: ValidationResult['errors'],
  modelsValidated: ValidationResult['summary']['modelsValidated'],
  inputPath?: string
): ValidationResult {
  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return {
    valid: errorCount === 0,
    summary: {
      errors: errorCount,
      warnings: warningCount,
      modelsValidated,
    },
    errors,
    validatedAt: new Date().toISOString(),
    inputPath,
  };
}
