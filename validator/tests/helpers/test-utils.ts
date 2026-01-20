import * as fs from 'fs';
import * as path from 'path';
import { validate, ValidationResult } from '../../src';

/**
 * Load a fixture file from the fixtures directory
 */
export function loadFixture(relativePath: string): unknown {
  const fullPath = path.resolve(__dirname, '../fixtures', relativePath);
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Load and validate a fixture file
 */
export function validateFixture(relativePath: string): ValidationResult {
  const config = loadFixture(relativePath);
  return validate(config);
}

/**
 * Assert that a validation result contains a specific error
 */
export function expectError(
  result: ValidationResult,
  code: string,
  pathPattern?: string
): void {
  const matchingError = result.errors.find(
    (e) => e.code === code && (!pathPattern || e.path.includes(pathPattern))
  );

  if (!matchingError) {
    throw new Error(
      `Expected error with code "${code}"${pathPattern ? ` at path containing "${pathPattern}"` : ''}\n` +
        `Actual errors: ${JSON.stringify(result.errors, null, 2)}`
    );
  }
}

/**
 * Assert that a validation result does not contain a specific error code
 */
export function expectNoError(result: ValidationResult, code: string): void {
  const matchingError = result.errors.find((e) => e.code === code);

  if (matchingError) {
    throw new Error(
      `Did not expect error with code "${code}", but found:\n` +
        JSON.stringify(matchingError, null, 2)
    );
  }
}

/**
 * Create a minimal valid export wrapper for testing
 */
export function wrapInExport(data: Record<string, unknown[]>): unknown {
  return {
    exportedAt: new Date().toISOString(),
    organizationId: '507f1f77bcf86cd799439011',
    organizationName: 'Test Organization',
    version: '1.0',
    title: 'Test Export',
    data: {
      journeys: [],
      automation_triggers: [],
      forms: [],
      templates: [],
      calendar_event_templates: [],
      ...data,
    },
  };
}
