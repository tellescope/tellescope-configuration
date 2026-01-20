import {
  EvalExpectations,
  ModelExpectation,
  FieldMatcher,
  ExpectationResults,
  ExpectationDetail,
} from './eval-types';

/**
 * Check if a value is a valid MongoDB ObjectId
 */
export function isValidId(value: unknown): boolean {
  return typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value);
}

/**
 * Match a title against expected value (string or regex)
 */
export function matchesTitle(actual: string | undefined, expected: string | RegExp): boolean {
  if (!actual) return false;

  if (expected instanceof RegExp) {
    return expected.test(actual);
  }
  // Case-insensitive substring match for strings
  return actual.toLowerCase().includes(expected.toLowerCase());
}

/**
 * Extract all action types from a journey's steps
 */
export function extractActionTypes(model: Record<string, unknown>): string[] {
  const steps = model.steps as Array<{ action?: { type?: string } }> | undefined;
  if (!Array.isArray(steps)) return [];

  return steps
    .map((step) => step.action?.type)
    .filter((type): type is string => typeof type === 'string');
}

/**
 * Extract all event types from a journey's steps
 */
export function extractEventTypes(model: Record<string, unknown>): string[] {
  const steps = model.steps as Array<{ events?: Array<{ type?: string }> }> | undefined;
  if (!Array.isArray(steps)) return [];

  const eventTypes: string[] = [];
  for (const step of steps) {
    if (Array.isArray(step.events)) {
      for (const event of step.events) {
        if (typeof event.type === 'string') {
          eventTypes.push(event.type);
        }
      }
    }
  }
  return eventTypes;
}

/**
 * Check if a model matches an expectation
 */
export function matchesModelExpectation(
  model: unknown,
  expectation: ModelExpectation
): { matches: boolean; reason?: string } {
  const m = model as Record<string, unknown>;

  // Check title
  if (expectation.title) {
    if (!matchesTitle(m.title as string, expectation.title)) {
      return {
        matches: false,
        reason: `Title "${m.title}" does not match expected "${expectation.title}"`,
      };
    }
  }

  // Check hasSteps
  if (expectation.hasSteps) {
    if (!Array.isArray(m.steps) || m.steps.length === 0) {
      return { matches: false, reason: 'Expected steps array but none found or empty' };
    }
  }

  // Check minStepCount
  if (expectation.minStepCount !== undefined) {
    const stepCount = Array.isArray(m.steps) ? m.steps.length : 0;
    if (stepCount < expectation.minStepCount) {
      return {
        matches: false,
        reason: `Expected at least ${expectation.minStepCount} steps, got ${stepCount}`,
      };
    }
  }

  // Check hasFields
  if (expectation.hasFields) {
    if (!Array.isArray(m.fields) || m.fields.length === 0) {
      return { matches: false, reason: 'Expected fields array but none found or empty' };
    }
  }

  // Check minFieldCount
  if (expectation.minFieldCount !== undefined) {
    const fieldCount = Array.isArray(m.fields) ? m.fields.length : 0;
    if (fieldCount < expectation.minFieldCount) {
      return {
        matches: false,
        reason: `Expected at least ${expectation.minFieldCount} fields, got ${fieldCount}`,
      };
    }
  }

  // Check messageContains
  if (expectation.messageContains) {
    const message = m.message as string | undefined;
    if (!message || !message.includes(expectation.messageContains)) {
      return {
        matches: false,
        reason: `Message does not contain "${expectation.messageContains}"`,
      };
    }
  }

  // Check subjectContains
  if (expectation.subjectContains) {
    const subject = m.subject as string | undefined;
    if (!subject || !subject.includes(expectation.subjectContains)) {
      return {
        matches: false,
        reason: `Subject does not contain "${expectation.subjectContains}"`,
      };
    }
  }

  // Check actionTypesInclude
  if (expectation.actionTypesInclude) {
    const actionTypes = extractActionTypes(m);
    for (const expected of expectation.actionTypesInclude) {
      if (!actionTypes.includes(expected)) {
        return {
          matches: false,
          reason: `Expected action type "${expected}" not found. Found: ${actionTypes.join(', ')}`,
        };
      }
    }
  }

  // Check eventTypesInclude
  if (expectation.eventTypesInclude) {
    const eventTypes = extractEventTypes(m);
    for (const expected of expectation.eventTypesInclude) {
      if (!eventTypes.includes(expected)) {
        return {
          matches: false,
          reason: `Expected event type "${expected}" not found. Found: ${eventTypes.join(', ')}`,
        };
      }
    }
  }

  // Check statesInclude
  if (expectation.statesInclude) {
    const states = m.states as Array<{ name?: string }> | undefined;
    const stateNames = Array.isArray(states)
      ? states.map((s) => s.name).filter(Boolean)
      : [];
    for (const expected of expectation.statesInclude) {
      if (!stateNames.includes(expected)) {
        return {
          matches: false,
          reason: `Expected state "${expected}" not found. Found: ${stateNames.join(', ')}`,
        };
      }
    }
  }

  // Check tagsInclude
  if (expectation.tagsInclude) {
    const tags = m.tags as string[] | undefined;
    if (!Array.isArray(tags)) {
      return { matches: false, reason: 'Expected tags array but none found' };
    }
    for (const expected of expectation.tagsInclude) {
      if (!tags.includes(expected)) {
        return {
          matches: false,
          reason: `Expected tag "${expected}" not found. Found: ${tags.join(', ')}`,
        };
      }
    }
  }

  // Check fieldsInclude
  if (expectation.fieldsInclude) {
    const fields = m.fields as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(fields)) {
      return { matches: false, reason: 'Expected fields array but none found' };
    }
    for (const fieldMatcher of expectation.fieldsInclude) {
      const found = fields.some((f) => matchesField(f, fieldMatcher));
      if (!found) {
        return {
          matches: false,
          reason: `Expected field matching ${JSON.stringify(fieldMatcher)} not found`,
        };
      }
    }
  }

  return { matches: true };
}

/**
 * Check if a field matches a field matcher
 */
function matchesField(field: Record<string, unknown>, matcher: FieldMatcher): boolean {
  if (matcher.title) {
    if (!matchesTitle(field.title as string, matcher.title)) {
      return false;
    }
  }

  if (matcher.type && field.type !== matcher.type) {
    return false;
  }

  if (matcher.isRequired !== undefined && field.isRequired !== matcher.isRequired) {
    return false;
  }

  return true;
}

/**
 * Check all expectations against a configuration
 */
export function checkExpectations(
  config: unknown,
  expectations: EvalExpectations
): ExpectationResults {
  const details: ExpectationDetail[] = [];
  const data = (config as { data?: Record<string, unknown[]> }).data;

  if (!data) {
    return {
      allPassed: false,
      details: [
        { description: 'Config has data field', passed: false, reason: 'No data field found' },
      ],
    };
  }

  // Check each model type
  for (const [modelType, modelExpectations] of Object.entries(expectations.models)) {
    if (!modelExpectations || modelExpectations.length === 0) continue;

    const models = data[modelType] || [];

    for (const expectation of modelExpectations) {
      const description = expectation.title
        ? `${modelType} with title matching "${expectation.title}"`
        : `${modelType} matching expectations`;

      // Find a model that matches
      let foundMatch = false;
      let lastReason = '';

      for (const model of models) {
        const result = matchesModelExpectation(model, expectation);
        if (result.matches) {
          foundMatch = true;
          break;
        }
        lastReason = result.reason || 'No match';
      }

      details.push({
        description,
        passed: foundMatch,
        reason: foundMatch ? undefined : lastReason || `No ${modelType} found matching expectations`,
      });
    }
  }

  return {
    allPassed: details.every((d) => d.passed),
    details,
  };
}
