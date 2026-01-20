/**
 * Error codes for categorizing validation failures
 */
export type ValidationErrorCode =
  // Field validation errors (from Tellescope validators)
  | 'FIELD_VALIDATION_FAILED'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_TYPE'
  | 'STRING_TOO_LONG'
  | 'STRING_TOO_SHORT'
  | 'INVALID_OBJECT_ID'
  | 'INVALID_ENUM_VALUE'
  | 'NUMBER_OUT_OF_RANGE'
  // Reference integrity errors
  | 'REFERENCE_NOT_FOUND'
  | 'CIRCULAR_REFERENCE'
  | 'ORPHANED_REFERENCE'
  // Form-specific errors
  | 'INVALID_PREVIOUS_FIELD'
  | 'MISSING_ROOT_FIELD'
  | 'DUPLICATE_ROOT_FIELD'
  | 'FIELD_COUNT_MISMATCH'
  | 'INVALID_SCORING_FIELD'
  | 'INVALID_SCORING_RESPONSE'
  // General value errors
  | 'INVALID_VALUE'
  // Journey-specific errors
  | 'INVALID_STEP_REFERENCE'
  // Template-specific errors
  | 'INVALID_VARIABLE_SYNTAX'
  | 'UNCLOSED_VARIABLE'
  // Export structure errors
  | 'INVALID_EXPORT_STRUCTURE'
  | 'MISSING_EXPORT_FIELD';

/**
 * Types of fixes that can be suggested
 */
export type FixType = 'replace' | 'remove' | 'add' | 'rename';

/**
 * Confidence level for auto-applying fixes
 * - high: Safe to auto-apply (e.g., fixing numFields count)
 * - medium: Likely correct but should be reviewed (e.g., truncating strings)
 * - low: Requires human decision (e.g., choosing between multiple IDs)
 */
export type FixConfidence = 'high' | 'medium' | 'low';

/**
 * A suggested fix for a validation error
 */
export interface FixSuggestion {
  /** Type of fix to apply */
  type: FixType;
  /** JSON path to modify (may differ from error path for 'add' operations) */
  targetPath: string;
  /** The value to set (for 'replace' or 'add') */
  value?: unknown;
  /** Human-readable description of what this fix does */
  description: string;
  /** How confident we are this fix is correct */
  confidence: FixConfidence;
}

/**
 * A single validation error with context and fix suggestions
 */
export interface ValidationError {
  /** Error code for categorization */
  code: ValidationErrorCode;
  /** Human-readable error message */
  message: string;
  /** JSON path to the error location (e.g., "data.journeys[0].title") */
  path: string;
  /** Severity level */
  severity: 'error' | 'warning';
  /** What the validator expected (if applicable) */
  expected?: string;
  /** What value was actually provided (stringified) */
  actual?: string;
  /** Suggested fix for this error */
  suggestion?: FixSuggestion;
  /** Additional context (e.g., list of available IDs) */
  context?: Record<string, unknown>;
}

/**
 * Summary of models validated
 */
export interface ModelsSummary {
  journeys: number;
  automationTriggers: number;
  forms: number;
  templates: number;
  calendarEventTemplates: number;
}

/**
 * Complete validation result
 */
export interface ValidationResult {
  /** Whether the configuration is valid */
  valid: boolean;
  /** Summary counts */
  summary: {
    errors: number;
    warnings: number;
    modelsValidated: ModelsSummary;
  };
  /** All validation errors found */
  errors: ValidationError[];
  /** ISO timestamp of when validation was performed */
  validatedAt: string;
  /** Input file path (if validating from CLI) */
  inputPath?: string;
}

/**
 * Options for the validate function
 */
export interface ValidateOptions {
  /** Only validate specific model types */
  only?: Array<'journeys' | 'automationTriggers' | 'forms' | 'templates' | 'calendarEventTemplates'>;
  /** Include warnings (default: true) */
  includeWarnings?: boolean;
}
