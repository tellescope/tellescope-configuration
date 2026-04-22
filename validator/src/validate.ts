import { ValidationError, ValidationErrorCode, ValidateOptions, ValidationResult, ModelsSummary } from './errors/types';
export { ValidateOptions } from './errors/types';
import { createValidationResult } from './errors/formatter';
import { safeStringify } from './utils/path-builder';
import { validateJourneys } from './validators/journey';
import { validateAutomationTriggers } from './validators/trigger';
import { validateForms } from './validators/form';
import { validateTemplates } from './validators/template';
import { validateCalendarEventTemplates } from './validators/calendar';
import { validateCrossReferences } from './cross-references';

/**
 * Expected structure of a Tellescope configuration export
 */
export interface TellescopeExport {
  exportedAt?: string;
  organizationId?: string;
  organizationName?: string;
  version?: string;
  data?: {
    journeys?: unknown[];
    automation_triggers?: unknown[];
    forms?: unknown[];
    templates?: unknown[];
    calendar_event_templates?: unknown[];
    databases?: unknown[];
  };
}

/**
 * Wrapper type for Tellescope validators
 */
export interface ValidatorDefinition<R = unknown> {
  validate: (options?: ValidatorOptions) => (value: unknown) => R;
  getType: () => string | object;
  getExample: () => string | number | boolean | object;
}

export interface ValidatorOptions {
  isOptional?: boolean;
  emptyStringOk?: boolean;
  emptyListOk?: boolean;
  nullOk?: boolean;
  listOf?: boolean;
  maxLength?: number;
  minLength?: number;
}

/**
 * Wrap a Tellescope validator to catch errors and return ValidationError
 */
export function wrapValidator<T>(
  validator: ValidatorDefinition<T>,
  path: string,
  options?: ValidatorOptions
): (value: unknown) => ValidationError | null {
  return (value: unknown) => {
    try {
      validator.validate(options)(value);
      return null;
    } catch (error) {
      return convertErrorToValidationError(error, path, value);
    }
  };
}

/**
 * Convert a thrown error from Tellescope validator to ValidationError
 */
export function convertErrorToValidationError(
  error: unknown,
  path: string,
  value: unknown
): ValidationError {
  let message: string;
  let code: ValidationErrorCode = 'FIELD_VALIDATION_FAILED';
  let field: string | undefined;

  // Handle different error formats from Tellescope validators
  if (typeof error === 'string') {
    message = error;
  } else if (error && typeof error === 'object') {
    const errObj = error as { message?: string; field?: string };
    message = errObj.message || String(error);
    field = errObj.field;
  } else {
    message = String(error);
  }

  // Detect specific error types from message content
  if (message.includes('missing value') || message.includes('required')) {
    code = 'MISSING_REQUIRED_FIELD';
  } else if (message.includes('exceeds maxLength') || message.includes('too long')) {
    code = 'STRING_TOO_LONG';
  } else if (message.includes('shorter than minLength') || message.includes('too short')) {
    code = 'STRING_TOO_SHORT';
  } else if (message.includes('Expecting string') || message.includes('Expecting number') || message.includes('Expecting') && message.includes('got')) {
    code = 'INVALID_TYPE';
  } else if (message.includes('ObjectId') || message.includes('24-character')) {
    code = 'INVALID_OBJECT_ID';
  } else if (message.includes('enum') || message.includes('must be one of')) {
    code = 'INVALID_ENUM_VALUE';
  }

  return {
    code,
    message,
    path: field ? `${path}.${field}` : path,
    severity: 'error',
    actual: safeStringify(value),
  };
}

/**
 * Validate a field value and collect errors
 */
export function validateField<T>(
  validator: ValidatorDefinition<T>,
  value: unknown,
  path: string,
  errors: ValidationError[],
  options?: ValidatorOptions
): void {
  const error = wrapValidator(validator, path, options)(value);
  if (error) {
    errors.push(error);
  }
}

/**
 * Validate the root export structure
 */
function validateExportStructure(config: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!config || typeof config !== 'object') {
    errors.push({
      code: 'INVALID_EXPORT_STRUCTURE',
      message: 'Configuration must be an object',
      path: '',
      severity: 'error',
      expected: 'object',
      actual: safeStringify(config),
    });
    return errors;
  }

  const exportConfig = config as TellescopeExport;

  if (!exportConfig.data) {
    errors.push({
      code: 'MISSING_EXPORT_FIELD',
      message: 'Missing required "data" field in export',
      path: 'data',
      severity: 'error',
      expected: 'object with journeys, forms, templates, etc.',
    });
  } else if (typeof exportConfig.data !== 'object') {
    errors.push({
      code: 'INVALID_TYPE',
      message: '"data" field must be an object',
      path: 'data',
      severity: 'error',
      expected: 'object',
      actual: typeof exportConfig.data,
    });
  } else {
    // Detect common structural mistake: form_fields placed at data root instead of inside each form
    const dataObj = exportConfig.data as Record<string, unknown>;
    if (Array.isArray(dataObj['form_fields'])) {
      errors.push({
        code: 'MISPLACED_FORM_FIELDS',
        message: 'data.form_fields is not a valid export key. Form fields must be nested inside each form object under a "fields" array (e.g. data.forms[0].fields), not at the top level of data.',
        path: 'data.form_fields',
        severity: 'error',
        expected: 'fields nested inside each form: data.forms[N].fields',
        actual: 'data.form_fields (top-level array)',
        suggestion: {
          type: 'rename',
          targetPath: 'data.form_fields',
          description: 'Move each item into the corresponding form object under a "fields" array',
          confidence: 'low',
        },
      });
    }
  }

  return errors;
}

/**
 * Main validation function
 */
export function validate(
  config: unknown,
  options?: ValidateOptions,
  inputPath?: string
): ValidationResult {
  const errors: ValidationError[] = [];
  const modelsValidated: ModelsSummary = {
    journeys: 0,
    automationTriggers: 0,
    forms: 0,
    templates: 0,
    calendarEventTemplates: 0,
  };

  // Validate root structure first
  const structureErrors = validateExportStructure(config);
  errors.push(...structureErrors);

  // If structure is invalid, return early
  if (structureErrors.some(e => e.code === 'INVALID_EXPORT_STRUCTURE' || e.code === 'MISSING_EXPORT_FIELD')) {
    return createValidationResult(errors, modelsValidated, inputPath);
  }

  const exportConfig = config as TellescopeExport;
  const data = exportConfig.data!;
  const only = options?.only;

  // Validate each model type
  if (!only || only.includes('journeys')) {
    const journeys = data.journeys || [];
    modelsValidated.journeys = journeys.length;
    errors.push(...validateJourneys(journeys));
  }

  if (!only || only.includes('automationTriggers')) {
    const triggers = data.automation_triggers || [];
    modelsValidated.automationTriggers = triggers.length;
    errors.push(...validateAutomationTriggers(triggers));
  }

  if (!only || only.includes('forms')) {
    const forms = data.forms || [];
    modelsValidated.forms = forms.length;
    errors.push(...validateForms(forms));
  }

  if (!only || only.includes('templates')) {
    const templates = data.templates || [];
    modelsValidated.templates = templates.length;
    errors.push(...validateTemplates(templates));
  }

  if (!only || only.includes('calendarEventTemplates')) {
    const calendarTemplates = data.calendar_event_templates || [];
    modelsValidated.calendarEventTemplates = calendarTemplates.length;
    errors.push(...validateCalendarEventTemplates(calendarTemplates));
  }

  // Validate cross-references between models
  errors.push(...validateCrossReferences(data));

  // Filter out warnings if requested
  const filteredErrors = options?.includeWarnings === false
    ? errors.filter(e => e.severity === 'error')
    : errors;

  return createValidationResult(filteredErrors, modelsValidated, inputPath);
}
