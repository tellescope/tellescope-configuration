import { ValidationError } from './errors/types';
import { appendPath, safeStringify } from './utils/path-builder';

interface IdRegistry {
  journeys: Map<string, { title: string }>;
  forms: Map<string, { title: string }>;
  templates: Map<string, { title: string }>;
  calendarEventTemplates: Map<string, { title: string }>;
  automationTriggers: Map<string, { title: string }>;
  formFields: Map<string, { formId: string; title: string }>;
}

interface DataLike {
  journeys?: Array<{ id?: string; title?: string; steps?: unknown[] }>;
  automation_triggers?: Array<{ id?: string; title?: string; action?: { info?: { templateId?: string; formId?: string; journeyId?: string } } }>;
  forms?: Array<{ id?: string; title?: string; fields?: Array<{ id?: string; title?: string }> }>;
  templates?: Array<{ id?: string; title?: string }>;
  calendar_event_templates?: Array<{ id?: string; title?: string; reminders?: Array<{ type?: string; info?: { templateId?: string; journeyId?: string; formId?: string } }> }>;
}

/**
 * Build a registry of all IDs in the export
 */
function buildIdRegistry(data: DataLike): IdRegistry {
  const registry: IdRegistry = {
    journeys: new Map(),
    forms: new Map(),
    templates: new Map(),
    calendarEventTemplates: new Map(),
    automationTriggers: new Map(),
    formFields: new Map(),
  };

  // Register journeys
  data.journeys?.forEach(journey => {
    if (journey.id) {
      registry.journeys.set(journey.id, { title: journey.title || 'Untitled' });
    }
  });

  // Register forms and form fields
  data.forms?.forEach(form => {
    if (form.id) {
      registry.forms.set(form.id, { title: form.title || 'Untitled' });
    }
    form.fields?.forEach(field => {
      if (field.id && form.id) {
        registry.formFields.set(field.id, { formId: form.id, title: field.title || 'Untitled' });
      }
    });
  });

  // Register templates
  data.templates?.forEach(template => {
    if (template.id) {
      registry.templates.set(template.id, { title: template.title || 'Untitled' });
    }
  });

  // Register calendar event templates
  data.calendar_event_templates?.forEach(template => {
    if (template.id) {
      registry.calendarEventTemplates.set(template.id, { title: template.title || 'Untitled' });
    }
  });

  // Register automation triggers
  data.automation_triggers?.forEach(trigger => {
    if (trigger.id) {
      registry.automationTriggers.set(trigger.id, { title: trigger.title || 'Untitled' });
    }
  });

  return registry;
}

/**
 * Generate a suggestion for a reference error
 */
function generateReferenceSuggestion(
  availableIds: Map<string, { title: string }>,
  modelType: string
): ValidationError['suggestion'] | undefined {
  if (availableIds.size === 0) {
    return undefined;
  }

  const entries = Array.from(availableIds.entries());
  const firstEntry = entries[0];

  return {
    type: 'replace',
    targetPath: '', // Will be set by caller
    value: firstEntry[0],
    description: `Replace with existing ${modelType}: "${firstEntry[1].title}" (${firstEntry[0]})`,
    confidence: availableIds.size === 1 ? 'medium' : 'low',
  };
}

/**
 * Validate that all ID references point to existing models
 */
export function validateCrossReferences(data: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!data || typeof data !== 'object') {
    return errors;
  }

  const d = data as DataLike;
  const registry = buildIdRegistry(d);

  // Validate automation trigger references
  d.automation_triggers?.forEach((trigger, index) => {
    const basePath = `data.automation_triggers[${index}]`;

    // Check action references
    if (trigger.action?.info) {
      const info = trigger.action.info;

      // Check templateId
      if (info.templateId && !registry.templates.has(info.templateId)) {
        const suggestion = generateReferenceSuggestion(registry.templates, 'template');
        if (suggestion) {
          suggestion.targetPath = appendPath(basePath, 'action', 'info', 'templateId');
        }
        errors.push({
          code: 'REFERENCE_NOT_FOUND',
          message: `Template ID '${info.templateId}' referenced in automation trigger action does not exist in export`,
          path: appendPath(basePath, 'action', 'info', 'templateId'),
          severity: 'error',
          expected: 'Valid template ID from data.templates',
          actual: info.templateId,
          suggestion,
          context: {
            availableTemplates: Array.from(registry.templates.entries()).map(([id, t]) => ({ id, title: t.title })),
          },
        });
      }

      // Check formId
      if (info.formId && !registry.forms.has(info.formId)) {
        const suggestion = generateReferenceSuggestion(registry.forms, 'form');
        if (suggestion) {
          suggestion.targetPath = appendPath(basePath, 'action', 'info', 'formId');
        }
        errors.push({
          code: 'REFERENCE_NOT_FOUND',
          message: `Form ID '${info.formId}' referenced in automation trigger action does not exist in export`,
          path: appendPath(basePath, 'action', 'info', 'formId'),
          severity: 'error',
          expected: 'Valid form ID from data.forms',
          actual: info.formId,
          suggestion,
          context: {
            availableForms: Array.from(registry.forms.entries()).map(([id, f]) => ({ id, title: f.title })),
          },
        });
      }

      // Check journeyId
      if (info.journeyId && !registry.journeys.has(info.journeyId)) {
        const suggestion = generateReferenceSuggestion(registry.journeys, 'journey');
        if (suggestion) {
          suggestion.targetPath = appendPath(basePath, 'action', 'info', 'journeyId');
        }
        errors.push({
          code: 'REFERENCE_NOT_FOUND',
          message: `Journey ID '${info.journeyId}' referenced in automation trigger action does not exist in export`,
          path: appendPath(basePath, 'action', 'info', 'journeyId'),
          severity: 'error',
          expected: 'Valid journey ID from data.journeys',
          actual: info.journeyId,
          suggestion,
          context: {
            availableJourneys: Array.from(registry.journeys.entries()).map(([id, j]) => ({ id, title: j.title })),
          },
        });
      }
    }
  });

  // Validate calendar event template reminder references
  d.calendar_event_templates?.forEach((template, index) => {
    const basePath = `data.calendar_event_templates[${index}]`;

    template.reminders?.forEach((reminder, reminderIndex) => {
      const reminderPath = appendPath(basePath, 'reminders', reminderIndex);

      if (reminder.info) {
        const info = reminder.info as { templateId?: string; journeyId?: string; formId?: string };

        // Check templateId in reminders
        if (info.templateId && !registry.templates.has(info.templateId)) {
          errors.push({
            code: 'REFERENCE_NOT_FOUND',
            message: `Template ID '${info.templateId}' referenced in calendar event reminder does not exist in export`,
            path: appendPath(reminderPath, 'info', 'templateId'),
            severity: 'error',
            expected: 'Valid template ID from data.templates',
            actual: info.templateId,
            context: {
              availableTemplates: Array.from(registry.templates.entries()).map(([id, t]) => ({ id, title: t.title })),
            },
          });
        }

        // Check journeyId in reminders
        if (info.journeyId && !registry.journeys.has(info.journeyId)) {
          errors.push({
            code: 'REFERENCE_NOT_FOUND',
            message: `Journey ID '${info.journeyId}' referenced in calendar event reminder does not exist in export`,
            path: appendPath(reminderPath, 'info', 'journeyId'),
            severity: 'error',
            expected: 'Valid journey ID from data.journeys',
            actual: info.journeyId,
            context: {
              availableJourneys: Array.from(registry.journeys.entries()).map(([id, j]) => ({ id, title: j.title })),
            },
          });
        }

        // Check formId in reminders
        if (info.formId && !registry.forms.has(info.formId)) {
          errors.push({
            code: 'REFERENCE_NOT_FOUND',
            message: `Form ID '${info.formId}' referenced in calendar event reminder does not exist in export`,
            path: appendPath(reminderPath, 'info', 'formId'),
            severity: 'error',
            expected: 'Valid form ID from data.forms',
            actual: info.formId,
            context: {
              availableForms: Array.from(registry.forms.entries()).map(([id, f]) => ({ id, title: f.title })),
            },
          });
        }
      }
    });
  });

  // Validate journey step references (if steps contain action references)
  d.journeys?.forEach((journey, journeyIndex) => {
    const journeyPath = `data.journeys[${journeyIndex}]`;

    if (Array.isArray(journey.steps)) {
      journey.steps.forEach((step: unknown, stepIndex: number) => {
        const stepPath = appendPath(journeyPath, 'steps', stepIndex);

        if (step && typeof step === 'object') {
          const s = step as { action?: { type?: string; info?: { templateId?: string; formId?: string; journeyId?: string } } };

          if (s.action?.info) {
            const info = s.action.info;

            // Check templateId in step action
            if (info.templateId && !registry.templates.has(info.templateId)) {
              errors.push({
                code: 'REFERENCE_NOT_FOUND',
                message: `Template ID '${info.templateId}' referenced in journey step action does not exist in export`,
                path: appendPath(stepPath, 'action', 'info', 'templateId'),
                severity: 'error',
                expected: 'Valid template ID from data.templates',
                actual: info.templateId,
                context: {
                  availableTemplates: Array.from(registry.templates.entries()).map(([id, t]) => ({ id, title: t.title })),
                },
              });
            }

            // Check formId in step action
            if (info.formId && !registry.forms.has(info.formId)) {
              errors.push({
                code: 'REFERENCE_NOT_FOUND',
                message: `Form ID '${info.formId}' referenced in journey step action does not exist in export`,
                path: appendPath(stepPath, 'action', 'info', 'formId'),
                severity: 'error',
                expected: 'Valid form ID from data.forms',
                actual: info.formId,
                context: {
                  availableForms: Array.from(registry.forms.entries()).map(([id, f]) => ({ id, title: f.title })),
                },
              });
            }

            // Check journeyId in step action (for addToJourney actions)
            if (info.journeyId && !registry.journeys.has(info.journeyId)) {
              errors.push({
                code: 'REFERENCE_NOT_FOUND',
                message: `Journey ID '${info.journeyId}' referenced in journey step action does not exist in export`,
                path: appendPath(stepPath, 'action', 'info', 'journeyId'),
                severity: 'error',
                expected: 'Valid journey ID from data.journeys',
                actual: info.journeyId,
                context: {
                  availableJourneys: Array.from(registry.journeys.entries()).map(([id, j]) => ({ id, title: j.title })),
                },
              });
            }
          }
        }
      });
    }
  });

  return errors;
}
