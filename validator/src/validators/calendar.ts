import { ValidationError } from '../errors/types';
import { appendPath, safeStringify } from '../utils/path-builder';
import { convertErrorToValidationError } from '../validate';

// Import validators from Tellescope
let stringValidator250: any;
let mongoIdStringValidator: any;
let nonNegNumberValidator: any;

try {
  const validation = require('@tellescope/validation');
  stringValidator250 = validation.stringValidator250;
  mongoIdStringValidator = validation.mongoIdStringValidator;
  nonNegNumberValidator = validation.nonNegNumberValidator;
} catch {
  // Package not installed - will use fallback validation
}

interface CalendarEventTemplateLike {
  id?: string;
  title?: string;
  durationInMinutes?: number;
  videoIntegration?: string;
  enableVideoCall?: boolean;
  enableSelfScheduling?: boolean;
  reminders?: Array<{
    type?: string;
    msBeforeStartTime?: number;
    info?: unknown;
  }>;
  [key: string]: unknown;
}

const VALID_VIDEO_INTEGRATIONS = ['Zoom', 'No Integration'];
const VALID_REMINDER_TYPES = ['webhook', 'add-to-journey', 'send-form', 'send-email', 'send-sms'];

/**
 * Validate a single calendar event template
 */
function validateCalendarEventTemplate(template: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const basePath = `data.calendar_event_templates[${index}]`;

  if (!template || typeof template !== 'object') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'CalendarEventTemplate must be an object',
      path: basePath,
      severity: 'error',
      expected: 'object',
      actual: safeStringify(template),
    });
    return errors;
  }

  const t = template as CalendarEventTemplateLike;

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
        message: 'CalendarEventTemplate id must be a valid 24-character hex ObjectId',
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
      message: 'CalendarEventTemplate title is required',
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'non-empty string (max 250 chars)',
    });
  } else if (stringValidator250) {
    try {
      stringValidator250.validate()(t.title);
    } catch (error) {
      errors.push(convertErrorToValidationError(error, appendPath(basePath, 'title'), t.title));
    }
  } else if (typeof t.title !== 'string') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'CalendarEventTemplate title must be a string',
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'string',
      actual: typeof t.title,
    });
  } else if (t.title.length > 250) {
    errors.push({
      code: 'STRING_TOO_LONG',
      message: `CalendarEventTemplate title exceeds maximum length of 250 characters (got ${t.title.length})`,
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'string with max 250 characters',
      actual: safeStringify(t.title),
    });
  }

  // Validate durationInMinutes
  if (t.durationInMinutes !== undefined) {
    if (nonNegNumberValidator) {
      try {
        nonNegNumberValidator.validate()(t.durationInMinutes);
      } catch (error) {
        errors.push(convertErrorToValidationError(error, appendPath(basePath, 'durationInMinutes'), t.durationInMinutes));
      }
    } else if (typeof t.durationInMinutes !== 'number' || t.durationInMinutes < 0) {
      errors.push({
        code: 'NUMBER_OUT_OF_RANGE',
        message: 'CalendarEventTemplate durationInMinutes must be a non-negative number',
        path: appendPath(basePath, 'durationInMinutes'),
        severity: 'error',
        expected: 'non-negative number',
        actual: safeStringify(t.durationInMinutes),
      });
    }
  }

  // Validate videoIntegration (if present)
  if (t.videoIntegration !== undefined && t.videoIntegration !== null) {
    if (!VALID_VIDEO_INTEGRATIONS.includes(t.videoIntegration)) {
      errors.push({
        code: 'INVALID_ENUM_VALUE',
        message: `CalendarEventTemplate videoIntegration must be one of: ${VALID_VIDEO_INTEGRATIONS.join(', ')}`,
        path: appendPath(basePath, 'videoIntegration'),
        severity: 'error',
        expected: VALID_VIDEO_INTEGRATIONS.join(' | '),
        actual: safeStringify(t.videoIntegration),
      });
    }
  }

  // Validate reminders array
  if (t.reminders !== undefined && t.reminders !== null) {
    if (!Array.isArray(t.reminders)) {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'CalendarEventTemplate reminders must be an array',
        path: appendPath(basePath, 'reminders'),
        severity: 'error',
        expected: 'array',
        actual: typeof t.reminders,
      });
    } else {
      t.reminders.forEach((reminder, reminderIndex) => {
        const reminderPath = appendPath(basePath, 'reminders', reminderIndex);

        if (!reminder || typeof reminder !== 'object') {
          errors.push({
            code: 'INVALID_TYPE',
            message: 'Reminder must be an object',
            path: reminderPath,
            severity: 'error',
            expected: 'object',
            actual: safeStringify(reminder),
          });
          return;
        }

        // Validate reminder type
        if (reminder.type && !VALID_REMINDER_TYPES.includes(reminder.type)) {
          errors.push({
            code: 'INVALID_ENUM_VALUE',
            message: `Reminder type must be one of: ${VALID_REMINDER_TYPES.join(', ')}`,
            path: appendPath(reminderPath, 'type'),
            severity: 'error',
            expected: VALID_REMINDER_TYPES.join(' | '),
            actual: safeStringify(reminder.type),
          });
        }

        // Validate msBeforeStartTime
        if (reminder.msBeforeStartTime !== undefined) {
          if (typeof reminder.msBeforeStartTime !== 'number') {
            errors.push({
              code: 'INVALID_TYPE',
              message: 'Reminder msBeforeStartTime must be a number',
              path: appendPath(reminderPath, 'msBeforeStartTime'),
              severity: 'error',
              expected: 'number',
              actual: typeof reminder.msBeforeStartTime,
            });
          }
        }
      });
    }
  }

  return errors;
}

/**
 * Validate all calendar event templates in an export
 */
export function validateCalendarEventTemplates(templates: unknown[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(templates)) {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'data.calendar_event_templates must be an array',
      path: 'data.calendar_event_templates',
      severity: 'error',
      expected: 'array',
      actual: typeof templates,
    });
    return errors;
  }

  templates.forEach((template, index) => {
    errors.push(...validateCalendarEventTemplate(template, index));
  });

  return errors;
}
