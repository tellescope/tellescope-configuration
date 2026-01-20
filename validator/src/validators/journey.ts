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

interface JourneyLike {
  id?: string;
  title?: string;
  description?: string;
  tags?: string[];
  [key: string]: unknown;
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
