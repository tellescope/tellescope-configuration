import { ValidationError } from '../errors/types';
import { appendPath, safeStringify } from '../utils/path-builder';
import { convertErrorToValidationError } from '../validate';

// Import validators from Tellescope - we'll use try/catch with dynamic import
// to handle cases where the package isn't installed
let stringValidator100: any;
let stringValidator1000: any;
let listOfStringsValidatorOptionalOrEmptyOk: any;
let mongoIdStringValidator: any;

try {
  const validation = require('@tellescope/validation');
  stringValidator100 = validation.stringValidator100;
  stringValidator1000 = validation.stringValidator1000;
  listOfStringsValidatorOptionalOrEmptyOk = validation.listOfStringsValidatorOptionalOrEmptyOk;
  mongoIdStringValidator = validation.mongoIdStringValidator;
} catch {
  // Package not installed - will use fallback validation
}

interface AutomationStepEvent {
  type?: string;
  info?: {
    automationStepId?: string;
    [key: string]: unknown;
  };
}

interface AutomationStepAction {
  type?: string;
  info?: unknown;
  continueOnError?: boolean;
}

interface AutomationStep {
  id?: string;
  journeyId?: string;
  events?: AutomationStepEvent[];
  action?: AutomationStepAction;
  conditions?: unknown[];
  enduserConditions?: unknown;
  flowchartUI?: { x?: number; y?: number };
}

interface JourneyLike {
  id?: string;
  title?: string;
  description?: string;
  tags?: string[];
  steps?: AutomationStep[];
  [key: string]: unknown;
}

/**
 * Helper to validate ObjectId format
 */
function isValidObjectId(id: string): boolean {
  return typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
}

/**
 * Validate journey automation steps
 */
function validateJourneySteps(journey: JourneyLike, basePath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const steps = journey.steps;

  if (steps === undefined || steps === null) {
    // Steps are optional
    return errors;
  }

  if (!Array.isArray(steps)) {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'Journey steps must be an array',
      path: appendPath(basePath, 'steps'),
      severity: 'error',
      expected: 'array',
      actual: typeof steps,
    });
    return errors;
  }

  // Build step ID set for reference validation
  const stepIds = new Set<string>();
  for (const step of steps) {
    if (step && typeof step === 'object' && step.id) {
      stepIds.add(step.id);
    }
  }

  steps.forEach((step, stepIndex) => {
    const stepPath = appendPath(basePath, 'steps', stepIndex);

    if (!step || typeof step !== 'object') {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'Automation step must be an object',
        path: stepPath,
        severity: 'error',
        expected: 'object',
        actual: safeStringify(step),
      });
      return;
    }

    // Validate step.id
    if (step.id !== undefined) {
      if (mongoIdStringValidator) {
        try {
          mongoIdStringValidator.validate()(step.id);
        } catch (error) {
          errors.push(convertErrorToValidationError(error, appendPath(stepPath, 'id'), step.id));
        }
      } else if (!isValidObjectId(step.id)) {
        errors.push({
          code: 'INVALID_OBJECT_ID',
          message: 'Automation step id must be a valid 24-character hex ObjectId',
          path: appendPath(stepPath, 'id'),
          severity: 'error',
          expected: '24-character hex string',
          actual: safeStringify(step.id),
        });
      }
    }

    // Validate journeyId matches parent journey
    if (step.journeyId !== undefined && journey.id !== undefined) {
      if (step.journeyId !== journey.id) {
        errors.push({
          code: 'REFERENCE_NOT_FOUND',
          message: `Step journeyId '${step.journeyId}' does not match parent journey ID '${journey.id}'`,
          path: appendPath(stepPath, 'journeyId'),
          severity: 'error',
          expected: journey.id,
          actual: step.journeyId,
          suggestion: {
            type: 'replace',
            targetPath: appendPath(stepPath, 'journeyId'),
            value: journey.id,
            description: 'Update journeyId to match parent journey',
            confidence: 'high',
          },
        });
      }
    }

    // Validate events array
    if (step.events === undefined || step.events === null) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Automation step events is required',
        path: appendPath(stepPath, 'events'),
        severity: 'error',
        expected: 'array of event objects',
      });
    } else if (!Array.isArray(step.events)) {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'Automation step events must be an array',
        path: appendPath(stepPath, 'events'),
        severity: 'error',
        expected: 'array',
        actual: typeof step.events,
      });
    } else if (step.events.length === 0) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Automation step must have at least one event',
        path: appendPath(stepPath, 'events'),
        severity: 'error',
        expected: 'non-empty array of events',
      });
    } else {
      step.events.forEach((event, eventIndex) => {
        const eventPath = appendPath(stepPath, 'events', eventIndex);

        if (!event || typeof event !== 'object') {
          errors.push({
            code: 'INVALID_TYPE',
            message: 'Event must be an object',
            path: eventPath,
            severity: 'error',
            expected: 'object',
            actual: safeStringify(event),
          });
          return;
        }

        // Validate event.type is present
        if (!event.type) {
          errors.push({
            code: 'MISSING_REQUIRED_FIELD',
            message: 'Event type is required',
            path: appendPath(eventPath, 'type'),
            severity: 'error',
            expected: 'string (event type)',
          });
        }

        // Check automationStepId references for events that reference other steps
        const refId = event.info?.automationStepId;
        if (refId && typeof refId === 'string') {
          if (!stepIds.has(refId)) {
            errors.push({
              code: 'INVALID_STEP_REFERENCE',
              message: `Event references non-existent step ID: ${refId}`,
              path: appendPath(eventPath, 'info', 'automationStepId'),
              severity: 'error',
              expected: 'valid step ID from same journey',
              actual: refId,
              context: {
                availableStepIds: Array.from(stepIds),
              },
            });
          }
        }
      });
    }

    // Validate action
    if (step.action === undefined || step.action === null) {
      errors.push({
        code: 'MISSING_REQUIRED_FIELD',
        message: 'Automation step action is required',
        path: appendPath(stepPath, 'action'),
        severity: 'error',
        expected: 'object with type and info',
      });
    } else if (typeof step.action !== 'object') {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'Automation step action must be an object',
        path: appendPath(stepPath, 'action'),
        severity: 'error',
        expected: 'object',
        actual: typeof step.action,
      });
    } else {
      // Validate action.type is present
      if (!step.action.type) {
        errors.push({
          code: 'MISSING_REQUIRED_FIELD',
          message: 'Action type is required',
          path: appendPath(stepPath, 'action', 'type'),
          severity: 'error',
          expected: 'string (action type)',
        });
      }

      // Validate continueOnError is boolean if present
      if (step.action.continueOnError !== undefined && typeof step.action.continueOnError !== 'boolean') {
        errors.push({
          code: 'INVALID_TYPE',
          message: 'Action continueOnError must be a boolean',
          path: appendPath(stepPath, 'action', 'continueOnError'),
          severity: 'error',
          expected: 'boolean',
          actual: typeof step.action.continueOnError,
        });
      }
    }
  });

  return errors;
}

/**
 * Validate a single journey
 */
function validateJourney(journey: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const basePath = `data.journeys[${index}]`;

  if (!journey || typeof journey !== 'object') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'Journey must be an object',
      path: basePath,
      severity: 'error',
      expected: 'object',
      actual: safeStringify(journey),
    });
    return errors;
  }

  const j = journey as JourneyLike;

  // Validate id (required for exports)
  if (j.id !== undefined) {
    if (mongoIdStringValidator) {
      try {
        mongoIdStringValidator.validate()(j.id);
      } catch (error) {
        errors.push(convertErrorToValidationError(error, appendPath(basePath, 'id'), j.id));
      }
    } else if (typeof j.id !== 'string' || !/^[a-f0-9]{24}$/i.test(j.id)) {
      errors.push({
        code: 'INVALID_OBJECT_ID',
        message: 'Journey id must be a valid 24-character hex ObjectId',
        path: appendPath(basePath, 'id'),
        severity: 'error',
        expected: '24-character hex string',
        actual: safeStringify(j.id),
      });
    }
  }

  // Validate title (required)
  if (j.title === undefined || j.title === null || j.title === '') {
    errors.push({
      code: 'MISSING_REQUIRED_FIELD',
      message: 'Journey title is required',
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'non-empty string (max 100 chars)',
    });
  } else if (stringValidator100) {
    try {
      stringValidator100.validate()(j.title);
    } catch (error) {
      errors.push(convertErrorToValidationError(error, appendPath(basePath, 'title'), j.title));
    }
  } else if (typeof j.title !== 'string') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'Journey title must be a string',
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'string',
      actual: typeof j.title,
    });
  } else if (j.title.length > 100) {
    errors.push({
      code: 'STRING_TOO_LONG',
      message: `Journey title exceeds maximum length of 100 characters (got ${j.title.length})`,
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'string with max 100 characters',
      actual: safeStringify(j.title),
      suggestion: {
        type: 'replace',
        targetPath: appendPath(basePath, 'title'),
        value: j.title.substring(0, 97) + '...',
        description: 'Truncate title to 100 characters',
        confidence: 'low',
      },
    });
  }

  // Validate description (optional, max 1000 chars)
  if (j.description !== undefined && j.description !== null && j.description !== '') {
    if (stringValidator1000) {
      try {
        stringValidator1000.validate()(j.description);
      } catch (error) {
        errors.push(convertErrorToValidationError(error, appendPath(basePath, 'description'), j.description));
      }
    } else if (typeof j.description !== 'string') {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'Journey description must be a string',
        path: appendPath(basePath, 'description'),
        severity: 'error',
        expected: 'string',
        actual: typeof j.description,
      });
    } else if (j.description.length > 1000) {
      errors.push({
        code: 'STRING_TOO_LONG',
        message: `Journey description exceeds maximum length of 1000 characters (got ${j.description.length})`,
        path: appendPath(basePath, 'description'),
        severity: 'error',
        expected: 'string with max 1000 characters',
        actual: safeStringify(j.description),
      });
    }
  }

  // Validate tags (optional, array of strings)
  if (j.tags !== undefined && j.tags !== null) {
    if (listOfStringsValidatorOptionalOrEmptyOk) {
      try {
        listOfStringsValidatorOptionalOrEmptyOk.validate()(j.tags);
      } catch (error) {
        errors.push(convertErrorToValidationError(error, appendPath(basePath, 'tags'), j.tags));
      }
    } else if (!Array.isArray(j.tags)) {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'Journey tags must be an array of strings',
        path: appendPath(basePath, 'tags'),
        severity: 'error',
        expected: 'array of strings',
        actual: typeof j.tags,
      });
    } else {
      j.tags.forEach((tag, tagIndex) => {
        if (typeof tag !== 'string') {
          errors.push({
            code: 'INVALID_TYPE',
            message: `Journey tag at index ${tagIndex} must be a string`,
            path: appendPath(basePath, 'tags', tagIndex),
            severity: 'error',
            expected: 'string',
            actual: typeof tag,
          });
        }
      });
    }
  }

  // Validate steps
  errors.push(...validateJourneySteps(j, basePath));

  return errors;
}

/**
 * Validate all journeys in an export
 */
export function validateJourneys(journeys: unknown[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(journeys)) {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'data.journeys must be an array',
      path: 'data.journeys',
      severity: 'error',
      expected: 'array',
      actual: typeof journeys,
    });
    return errors;
  }

  journeys.forEach((journey, index) => {
    errors.push(...validateJourney(journey, index));
  });

  return errors;
}
