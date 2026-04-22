import { ValidationError } from '../errors/types';
import { appendPath, safeStringify } from '../utils/path-builder';
import { convertErrorToValidationError } from '../validate';

// Import validators from Tellescope
let stringValidator100: any;
let mongoIdStringValidator: any;
let automationTriggerEventValidator: any;
let automationTriggerActionValidator: any;

try {
  const validation = require('@tellescope/validation');
  stringValidator100 = validation.stringValidator100;
  mongoIdStringValidator = validation.mongoIdStringValidator;
  automationTriggerEventValidator = validation.automationTriggerEventValidator;
  automationTriggerActionValidator = validation.automationTriggerActionValidator;
} catch {
  // Package not installed - will use fallback validation
}

interface AutomationTriggerLike {
  id?: string;
  title?: string;
  event?: { type?: string; info?: unknown };
  action?: { type?: string; info?: unknown };
  status?: string;
  [key: string]: unknown;
}

const VALID_TRIGGER_STATUSES = ['Active', 'Inactive'];

/**
 * Validate a single automation trigger
 */
function validateAutomationTrigger(trigger: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const basePath = `data.automation_triggers[${index}]`;

  if (!trigger || typeof trigger !== 'object') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'AutomationTrigger must be an object',
      path: basePath,
      severity: 'error',
      expected: 'object',
      actual: safeStringify(trigger),
    });
    return errors;
  }

  const t = trigger as AutomationTriggerLike;

  // Validate id
  if (t.id !== undefined) {
    if (mongoIdStringValidator) {
      try {
        mongoIdStringValidator.validate()(t.id);
      } catch (error) {
        errors.push(convertErrorToValidationError(error, appendPath(basePath, 'id'), t.id));
      }
    } else if (typeof t.id !== 'string' || !/^[a-f0-9]{24}$/i.test(t.id)) {
      errors.push({
        code: 'INVALID_OBJECT_ID',
        message: 'AutomationTrigger id must be a valid 24-character hex ObjectId',
        path: appendPath(basePath, 'id'),
        severity: 'error',
        expected: '24-character hex string',
        actual: safeStringify(t.id),
      });
    }
  }

  // Validate title (required)
  if (t.title === undefined || t.title === null || t.title === '') {
    errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'AutomationTrigger title is required',
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'non-empty string (max 100 chars)',
    });
  } else if (stringValidator100) {
    try {
      stringValidator100.validate()(t.title);
    } catch (error) {
      errors.push(convertErrorToValidationError(error, appendPath(basePath, 'title'), t.title));
    }
  } else if (typeof t.title !== 'string') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'AutomationTrigger title must be a string',
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'string',
      actual: typeof t.title,
    });
  } else if (t.title.length > 100) {
    errors.push({
      code: 'STRING_TOO_LONG',
      message: `AutomationTrigger title exceeds maximum length of 100 characters (got ${t.title.length})`,
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'string with max 100 characters',
      actual: safeStringify(t.title),
    });
  }

  // Validate event (required)
  if (t.event === undefined || t.event === null) {
    errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'AutomationTrigger event is required',
      path: appendPath(basePath, 'event'),
      severity: 'error',
      expected: 'object with type and info',
    });
  } else if (automationTriggerEventValidator) {
    try {
      automationTriggerEventValidator.validate()(t.event);
    } catch (error) {
      errors.push(convertErrorToValidationError(error, appendPath(basePath, 'event'), t.event));
    }
  } else if (typeof t.event !== 'object') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'AutomationTrigger event must be an object',
      path: appendPath(basePath, 'event'),
      severity: 'error',
      expected: 'object with type and info',
      actual: typeof t.event,
    });
  } else if (!t.event.type) {
    errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'AutomationTrigger event.type is required',
      path: appendPath(basePath, 'event', 'type'),
      severity: 'error',
      expected: 'string (event type)',
    });
  }

  // Validate action (required)
  if (t.action === undefined || t.action === null) {
    errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'AutomationTrigger action is required',
      path: appendPath(basePath, 'action'),
      severity: 'error',
      expected: 'object with type and info',
    });
  } else if (automationTriggerActionValidator) {
    try {
      automationTriggerActionValidator.validate()(t.action);
    } catch (error) {
      errors.push(convertErrorToValidationError(error, appendPath(basePath, 'action'), t.action));
    }
  } else if (typeof t.action !== 'object') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'AutomationTrigger action must be an object',
      path: appendPath(basePath, 'action'),
      severity: 'error',
      expected: 'object with type and info',
      actual: typeof t.action,
    });
  } else if (!t.action.type) {
    errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'AutomationTrigger action.type is required',
      path: appendPath(basePath, 'action', 'type'),
      severity: 'error',
      expected: 'string (action type)',
    });
  }

  // Validate status (if present)
  if (t.status !== undefined && t.status !== null) {
    if (!VALID_TRIGGER_STATUSES.includes(t.status)) {
      errors.push({
        code: 'INVALID_ENUM_VALUE',
        message: `AutomationTrigger status must be one of: ${VALID_TRIGGER_STATUSES.join(', ')}`,
        path: appendPath(basePath, 'status'),
        severity: 'error',
        expected: VALID_TRIGGER_STATUSES.join(' | '),
        actual: safeStringify(t.status),
        suggestion: {
          type: 'replace',
          targetPath: appendPath(basePath, 'status'),
          value: 'active',
          description: 'Set status to "active"',
          confidence: 'medium',
        },
      });
    }
  }

  return errors;
}

/**
 * Validate all automation triggers in an export
 */
export function validateAutomationTriggers(triggers: unknown[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(triggers)) {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'data.automation_triggers must be an array',
      path: 'data.automation_triggers',
      severity: 'error',
      expected: 'array',
      actual: typeof triggers,
    });
    return errors;
  }

  triggers.forEach((trigger, index) => {
    errors.push(...validateAutomationTrigger(trigger, index));
  });

  return errors;
}
