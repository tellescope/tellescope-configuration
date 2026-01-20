// Main exports for programmatic use

// Core validation
export { validate, ValidateOptions, TellescopeExport } from './validate';

// Individual model validators
export { validateJourneys } from './validators/journey';
export { validateAutomationTriggers } from './validators/trigger';
export { validateForms } from './validators/form';
export { validateTemplates } from './validators/template';
export { validateCalendarEventTemplates } from './validators/calendar';

// Cross-reference validation
export { validateCrossReferences } from './cross-references';

// Error types and utilities
export {
  ValidationError,
  ValidationErrorCode,
  ValidationResult,
  FixSuggestion,
  FixType,
  FixConfidence,
  ModelsSummary,
} from './errors/types';

export { formatAsJson, createValidationResult } from './errors/formatter';
export { applyFix, applyAutoFixes } from './errors/suggestions';

// Utility exports
export { buildPath, appendPath, safeStringify } from './utils/path-builder';
export { extractJson } from './utils/json-extractor';
