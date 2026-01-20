import { ValidationError } from '../errors/types';
import { appendPath, safeStringify } from '../utils/path-builder';
import { convertErrorToValidationError } from '../validate';

// Import validators from Tellescope
let stringValidator100: any;
let stringValidator250: any;
let stringValidator100000: any;
let mongoIdStringValidator: any;

try {
  const validation = require('@tellescope/validation');
  stringValidator100 = validation.stringValidator100;
  stringValidator250 = validation.stringValidator250;
  stringValidator100000 = validation.stringValidator100000EmptyOkay;
  mongoIdStringValidator = validation.mongoIdStringValidator;
} catch {
  // Package not installed - will use fallback validation
}

interface MessageTemplateLike {
  id?: string;
  title?: string;
  subject?: string;
  message?: string;
  html?: string;
  type?: string;
  mode?: string;
  forChannels?: string[];
  isMarketing?: boolean;
  tags?: string[];
  [key: string]: unknown;
}

const VALID_TEMPLATE_TYPES = ['enduser', 'Reply', 'team'];
const VALID_TEMPLATE_MODES = ['html', 'richtext'];
const VALID_CHANNELS = ['Email', 'SMS', 'Chat'];

/**
 * Validate template variable syntax
 */
function validateTemplateVariables(content: string, path: string): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!content || typeof content !== 'string') {
    return errors;
  }

  // Find unclosed variable brackets
  const unclosedPattern = /\{\{([^}]*?)(?=\{\{|$)/g;
  let match;

  while ((match = unclosedPattern.exec(content)) !== null) {
    if (!match[0].includes('}}')) {
      errors.push({
        code: 'UNCLOSED_VARIABLE',
        message: `Unclosed variable bracket starting with '{{${match[1].substring(0, 20)}...'`,
        path,
        severity: 'error',
        expected: 'Properly closed {{variable}} syntax',
        actual: match[0].substring(0, 50),
        suggestion: {
          type: 'replace',
          targetPath: path,
          description: 'Close the variable bracket with }}',
          confidence: 'high',
        },
      });
    }
  }

  // Check for malformed variable syntax (single braces that look like template variables)
  // Pattern matches {content} but not {{content}} - excludes CSS by checking content
  const malformedPattern = /\{([^{}]*?)\}(?!\})/g;
  while ((match = malformedPattern.exec(content)) !== null) {
    // Skip if it's inside a proper {{...}} (check character before)
    const before = content.substring(Math.max(0, match.index - 1), match.index);
    if (before === '{') {
      continue;
    }

    // Extract the inner content
    const inner = match[1].trim();

    // Skip if it looks like CSS (contains : or ; which are CSS syntax)
    if (inner.includes(':') || inner.includes(';')) {
      continue;
    }

    // Only flag if it looks like a template variable name (letters, dots, underscores, brackets)
    // Valid variable patterns: enduser.fname, sender, forms.123.link:text, etc.
    if (/^[a-zA-Z_][a-zA-Z0-9_.\[\]:]*$/.test(inner)) {
      errors.push({
        code: 'INVALID_VARIABLE_SYNTAX',
        message: `Possible malformed variable syntax: ${match[0]} (should use double braces {{...}})`,
        path,
        severity: 'warning',
        expected: 'Double brace syntax: {{variable}}',
        actual: match[0],
      });
    }
  }

  return errors;
}

/**
 * Validate a single message template
 */
function validateTemplate(template: unknown, index: number): ValidationError[] {
  const errors: ValidationError[] = [];
  const basePath = `data.templates[${index}]`;

  if (!template || typeof template !== 'object') {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'MessageTemplate must be an object',
      path: basePath,
      severity: 'error',
      expected: 'object',
      actual: safeStringify(template),
    });
    return errors;
  }

  const t = template as MessageTemplateLike;

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
        message: 'MessageTemplate id must be a valid 24-character hex ObjectId',
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
      message: 'MessageTemplate title is required',
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
      message: 'MessageTemplate title must be a string',
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'string',
      actual: typeof t.title,
    });
  } else if (t.title.length > 100) {
    errors.push({
      code: 'STRING_TOO_LONG',
      message: `MessageTemplate title exceeds maximum length of 100 characters (got ${t.title.length})`,
      path: appendPath(basePath, 'title'),
      severity: 'error',
      expected: 'string with max 100 characters',
      actual: safeStringify(t.title),
    });
  }

  // Validate subject (if present)
  if (t.subject !== undefined && t.subject !== null && t.subject !== '') {
    if (stringValidator250) {
      try {
        stringValidator250.validate()(t.subject);
      } catch (error) {
        errors.push(convertErrorToValidationError(error, appendPath(basePath, 'subject'), t.subject));
      }
    } else if (typeof t.subject !== 'string') {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'MessageTemplate subject must be a string',
        path: appendPath(basePath, 'subject'),
        severity: 'error',
        expected: 'string',
        actual: typeof t.subject,
      });
    } else if (t.subject.length > 250) {
      errors.push({
        code: 'STRING_TOO_LONG',
        message: `MessageTemplate subject exceeds maximum length of 250 characters (got ${t.subject.length})`,
        path: appendPath(basePath, 'subject'),
        severity: 'error',
        expected: 'string with max 250 characters',
        actual: safeStringify(t.subject),
      });
    }

    // Validate template variables in subject
    errors.push(...validateTemplateVariables(t.subject, appendPath(basePath, 'subject')));
  }

  // Validate message (if present)
  if (t.message !== undefined && t.message !== null && t.message !== '') {
    if (stringValidator100000) {
      try {
        stringValidator100000.validate()(t.message);
      } catch (error) {
        errors.push(convertErrorToValidationError(error, appendPath(basePath, 'message'), t.message));
      }
    } else if (typeof t.message !== 'string') {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'MessageTemplate message must be a string',
        path: appendPath(basePath, 'message'),
        severity: 'error',
        expected: 'string',
        actual: typeof t.message,
      });
    } else if (t.message.length > 100000) {
      errors.push({
        code: 'STRING_TOO_LONG',
        message: `MessageTemplate message exceeds maximum length of 100000 characters (got ${t.message.length})`,
        path: appendPath(basePath, 'message'),
        severity: 'error',
        expected: 'string with max 100000 characters',
        actual: `[${t.message.length} characters]`,
      });
    }

    // Validate template variables in message
    errors.push(...validateTemplateVariables(t.message, appendPath(basePath, 'message')));
  }

  // Validate html (if present)
  if (t.html !== undefined && t.html !== null && t.html !== '') {
    if (stringValidator100000) {
      try {
        stringValidator100000.validate()(t.html);
      } catch (error) {
        errors.push(convertErrorToValidationError(error, appendPath(basePath, 'html'), t.html));
      }
    } else if (typeof t.html !== 'string') {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'MessageTemplate html must be a string',
        path: appendPath(basePath, 'html'),
        severity: 'error',
        expected: 'string',
        actual: typeof t.html,
      });
    }

    // Validate template variables in html
    errors.push(...validateTemplateVariables(t.html, appendPath(basePath, 'html')));
  }

  // Validate type (if present)
  if (t.type !== undefined && t.type !== null) {
    if (!VALID_TEMPLATE_TYPES.includes(t.type)) {
      errors.push({
        code: 'INVALID_ENUM_VALUE',
        message: `MessageTemplate type must be one of: ${VALID_TEMPLATE_TYPES.join(', ')}`,
        path: appendPath(basePath, 'type'),
        severity: 'error',
        expected: VALID_TEMPLATE_TYPES.join(' | '),
        actual: safeStringify(t.type),
      });
    }
  }

  // Validate mode (if present)
  if (t.mode !== undefined && t.mode !== null) {
    if (!VALID_TEMPLATE_MODES.includes(t.mode)) {
      errors.push({
        code: 'INVALID_ENUM_VALUE',
        message: `MessageTemplate mode must be one of: ${VALID_TEMPLATE_MODES.join(', ')}`,
        path: appendPath(basePath, 'mode'),
        severity: 'error',
        expected: VALID_TEMPLATE_MODES.join(' | '),
        actual: safeStringify(t.mode),
      });
    }
  }

  // Validate forChannels (if present)
  if (t.forChannels !== undefined && t.forChannels !== null) {
    if (!Array.isArray(t.forChannels)) {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'MessageTemplate forChannels must be an array',
        path: appendPath(basePath, 'forChannels'),
        severity: 'error',
        expected: 'array',
        actual: typeof t.forChannels,
      });
    } else {
      t.forChannels.forEach((channel, i) => {
        if (!VALID_CHANNELS.includes(channel)) {
          errors.push({
            code: 'INVALID_ENUM_VALUE',
            message: `MessageTemplate forChannels[${i}] must be one of: ${VALID_CHANNELS.join(', ')}`,
            path: appendPath(basePath, 'forChannels', i),
            severity: 'error',
            expected: VALID_CHANNELS.join(' | '),
            actual: safeStringify(channel),
          });
        }
      });
    }
  }

  // Validate isMarketing (if present)
  if (t.isMarketing !== undefined && t.isMarketing !== null) {
    if (typeof t.isMarketing !== 'boolean') {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'MessageTemplate isMarketing must be a boolean',
        path: appendPath(basePath, 'isMarketing'),
        severity: 'error',
        expected: 'boolean',
        actual: typeof t.isMarketing,
      });
    }
  }

  // Validate tags (if present)
  if (t.tags !== undefined && t.tags !== null) {
    if (!Array.isArray(t.tags)) {
      errors.push({
        code: 'INVALID_TYPE',
        message: 'MessageTemplate tags must be an array',
        path: appendPath(basePath, 'tags'),
        severity: 'error',
        expected: 'array',
        actual: typeof t.tags,
      });
    } else {
      t.tags.forEach((tag, i) => {
        if (typeof tag !== 'string') {
          errors.push({
            code: 'INVALID_TYPE',
            message: `MessageTemplate tags[${i}] must be a string`,
            path: appendPath(basePath, 'tags', i),
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
 * Validate all message templates in an export
 */
export function validateTemplates(templates: unknown[]): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!Array.isArray(templates)) {
    errors.push({
      code: 'INVALID_TYPE',
      message: 'data.templates must be an array',
      path: 'data.templates',
      severity: 'error',
      expected: 'array',
      actual: typeof templates,
    });
    return errors;
  }

  templates.forEach((template, index) => {
    errors.push(...validateTemplate(template, index));
  });

  return errors;
}
