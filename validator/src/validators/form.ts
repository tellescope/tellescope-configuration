import { ValidationError } from '../errors/types';
import { appendPath, safeStringify } from '../utils/path-builder';
import { convertErrorToValidationError } from '../validate';

// Import validators from Tellescope
let stringValidator250: any;
let stringValidator5000: any;
let mongoIdStringValidator: any;
let nonNegNumberValidator: any;

try {
  const validation = require('@tellescope/validation');
  stringValidator250 = validation.stringValidator250;
  stringValidator5000 = validation.stringValidator5000;
  mongoIdStringValidator = validation.mongoIdStringValidator;
  nonNegNumberValidator = validation.nonNegNumberValidator;
} catch {
  // Package not installed - will use fallback validation
}

interface FormFieldLike {
  id?: string;
  title?: string;
  type?: string;
  previousFields?: Array<{
    type?: string;
    info?: { fieldId?: string; equals?: string };
  }>;
  [key: string]: unknown;
}

interface FormLike {
  id?: string;
  title?: string;
  description?: string;
  numFields?: number;
  fields?: FormFieldLike[];
  type?: string;
  [key: string]: unknown;
}

const VALID_FORM_TYPES = ['note', 'enduserFacing'];

/**
 * Validate form field chain (previousFields references)
 */
function validateFormFieldChain(form: FormLike, basePath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const fields = form.fields || [];

  if (!Array.isArray(fields) || fields.length === 0) {
    return errors;
  }

  // Build a set of valid field IDs
  const fieldIds = new Set(fields.map(f => f.id).filter(Boolean));
  let rootCount = 0;

  fields.forEach((field, index) => {
    const fieldPath = appendPath(basePath, 'fields', index);
    const previousFields = field.previousFields || [];

    if (!Array.isArray(previousFields)) {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'FormField previousFields must be an array',
        path: appendPath(fieldPath, 'previousFields'),
        severity: 'error',
        expected: 'array',
        actual: typeof previousFields,
      });
      return;
    }

    previousFields.forEach((prev, prevIndex) => {
      const prevPath = appendPath(fieldPath, 'previousFields', prevIndex);

      if (prev.type === 'root') {
        rootCount++;
      } else if (prev.type === 'after' || prev.type === 'previousEquals') {
        const refId = prev.info?.fieldId;
        if (refId && !fieldIds.has(refId)) {
          errors.push({
            code: 'INVALID_PREVIOUS_FIELD',
            message: `previousFields references non-existent field ID: ${refId}`,
            path: appendPath(prevPath, 'info', 'fieldId'),
            severity: 'error',
            expected: 'valid field ID from same form',
            actual: refId,
            context: {
              availableFieldIds: Array.from(fieldIds),
            },
          });
        }
      }
    });
  });

  // Check for exactly one root field
  if (rootCount === 0 && fields.length > 0) {
    errors.push({
      code: 'MISSING_ROOT_FIELD',
      message: 'Form has no root field (no field with previousFields type "root")',
      path: appendPath(basePath, 'fields'),
      severity: 'error',
      suggestion: {
        type: 'add',
        targetPath: appendPath(basePath, 'fields', 0, 'previousFields'),
        value: [{ type: 'root', info: {} }],
        description: 'Add root type to first field previousFields',
        confidence: 'medium',
      },
    });
  } else if (rootCount > 1) {
    errors.push({
      code: 'DUPLICATE_ROOT_FIELD',
      message: `Form has ${rootCount} root fields (should have exactly 1)`,
      path: appendPath(basePath, 'fields'),
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Validate a single form field
 */
function validateFormField(field: unknown, index: number, formPath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const fieldPath = appendPath(formPath, 'fields', index);

  if (!field || typeof field !== 'object') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'FormField must be an object',
      path: fieldPath,
      severity: 'error',
      expected: 'object',
      actual: safeStringify(field),
    });
    return errors;
  }

  const f = field as FormFieldLike;

  // Validate id
  if (f.id !== undefined) {
    if (mongoIdStringValidator) {
      try {
        mongoIdStringValidator.validate()(f.id);
      } catch (error) {
        errors.push(convertErrorToValidationError(error, appendPath(fieldPath, 'id'), f.id));
      }
    } else if (typeof f.id !== 'string' || !/^[a-f0-9]{24}$/i.test(f.id)) {
      errors.push({
        code: 'INVALID_OBJECT_ID',
        message: 'FormField id must be a valid 24-character hex ObjectId',
        path: appendPath(fieldPath, 'id'),
        severity: 'error',
        expected: '24-character hex string',
        actual: safeStringify(f.id),
      });
    }
  }

  // Validate title (required)
  if (f.title === undefined || f.title === null || f.title === '') {
    errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'FormField title is required',
      path: appendPath(fieldPath, 'title'),
      severity: 'error',
      expected: 'non-empty string',
    });
  } else if (typeof f.title !== 'string') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'FormField title must be a string',
      path: appendPath(fieldPath, 'title'),
      severity: 'error',
      expected: 'string',
      actual: typeof f.title,
    });
  }

  // Validate type (required)
  if (f.type === undefined || f.type === null || f.type === '') {
    errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'FormField type is required',
      path: appendPath(fieldPath, 'type'),
      severity: 'error',
      expected: 'string (field type)',
    });
  } else if (typeof f.type !== 'string') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'FormField type must be a string',
      path: appendPath(fieldPath, 'type'),
      severity: 'error',
      expected: 'string',
      actual: typeof f.type,
    });
  }

  return errors;
}

/**
 * Validate a single form
 */
function validateForm(form: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const basePath = `data.forms[${index}]`;

  if (!form || typeof form !== 'object') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'Form must be an object',
      path: basePath,
      severity: 'error',
      expected: 'object',
      actual: safeStringify(form),
    });
    return errors;
  }

  const f = form as FormLike;

  // Validate id
  if (f.id !== undefined) {
    if (mongoIdStringValidator) {
      try {
        mongoIdStringValidator.validate()(f.id);
      } catch (error) {
        errors.push(convertErrorToValidationError(error, appendPath(basePath, 'id'), f.id));
      }
    } else if (typeof f.id !== 'string' || !/^[a-f0-9]{24}$/i.test(f.id)) {
      errors.push({
        code: 'INVALID_OBJECT_ID',
        message: 'Form id must be a valid 24-character hex ObjectId',
        path: appendPath(basePath, 'id'),
        severity: 'error',
        expected: '24-character hex string',
        actual: safeStringify(f.id),
      });
    }
  }

  // Validate title (required)
  if (f.title === undefined || f.title === null || f.title === '') {
    errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'Form title is required',
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'non-empty string (max 250 chars)',
    });
  } else if (stringValidator250) {
    try {
      stringValidator250.validate()(f.title);
    } catch (error) {
      errors.push(convertErrorToValidationError(error, appendPath(basePath, 'title'), f.title));
    }
  } else if (typeof f.title !== 'string') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'Form title must be a string',
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'string',
      actual: typeof f.title,
    });
  } else if (f.title.length > 250) {
    errors.push({
      code: 'STRING_TOO_LONG',
      message: `Form title exceeds maximum length of 250 characters (got ${f.title.length})`,
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'string with max 250 characters',
      actual: safeStringify(f.title),
    });
  }

  // Validate type (if present)
  if (f.type !== undefined && f.type !== null) {
    if (!VALID_FORM_TYPES.includes(f.type)) {
      errors.push({
        code: 'INVALID_ENUM_VALUE',
        message: `Form type must be one of: ${VALID_FORM_TYPES.join(', ')}`,
        path: appendPath(basePath, 'type'),
        severity: 'error',
        expected: VALID_FORM_TYPES.join(' | '),
        actual: safeStringify(f.type),
      });
    }
  }

  // Validate numFields matches actual count
  if (f.fields && Array.isArray(f.fields)) {
    const actualCount = f.fields.length;
    if (f.numFields !== undefined && f.numFields !== actualCount) {
      errors.push({
        code: 'FIELD_COUNT_MISMATCH',
        message: `Form numFields (${f.numFields}) does not match actual field count (${actualCount})`,
        path: appendPath(basePath, 'numFields'),
        severity: 'warning',
        expected: String(actualCount),
        actual: String(f.numFields),
        suggestion: {
          type: 'replace',
          targetPath: appendPath(basePath, 'numFields'),
          value: actualCount,
          description: 'Update numFields to match actual field count',
          confidence: 'high',
        },
      });
    }

    // Validate each field
    f.fields.forEach((field, fieldIndex) => {
      errors.push(...validateFormField(field, fieldIndex, basePath));
    });

    // Validate field chain
    errors.push(...validateFormFieldChain(f, basePath));
  }

  return errors;
}

/**
 * Validate all forms in an export
 */
export function validateForms(forms: unknown[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(forms)) {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'data.forms must be an array',
      path: 'data.forms',
      severity: 'error',
      expected: 'array',
      actual: typeof forms,
    });
    return errors;
  }

  forms.forEach((form, index) => {
    errors.push(...validateForm(form, index));
  });

  return errors;
}
