import { ValidationResult } from '../src/errors/types';

/**
 * Definition for a single eval test
 */
export interface EvalDefinition {
  /** Unique identifier for this eval */
  id: string;
  /** Human-readable name */
  name: string;
  /** Prompt to send to Claude Code */
  prompt: string;
  /** Expected results */
  expectations: EvalExpectations;
}

/**
 * Expected results from running an eval
 */
export interface EvalExpectations {
  /** Must pass validation */
  valid: true;
  /** Expected error count */
  errors: 0;
  /** Expected warning count */
  warnings: 0;
  /** Expected models in the output */
  models: {
    journeys?: ModelExpectation[];
    forms?: ModelExpectation[];
    templates?: ModelExpectation[];
    automation_triggers?: ModelExpectation[];
    calendar_event_templates?: ModelExpectation[];
  };
}

/**
 * Expectation for a single model in the output
 */
export interface ModelExpectation {
  /** Title matching (exact string or regex) */
  title?: string | RegExp;

  // Structural requirements (journeys)
  /** Journey must have steps array with at least one step */
  hasSteps?: boolean;
  /** Minimum number of steps required */
  minStepCount?: number;

  // Structural requirements (forms)
  /** Form must have fields array with at least one field */
  hasFields?: boolean;
  /** Minimum number of fields required */
  minFieldCount?: number;

  // Content checking (templates)
  /** Template message must contain this string */
  messageContains?: string;
  /** Template subject must contain this string */
  subjectContains?: string;

  // Array content matching
  /** Fields that must be present (for forms) */
  fieldsInclude?: FieldMatcher[];
  /** States that must be present (for journeys) */
  statesInclude?: string[];
  /** Tags that must be present */
  tagsInclude?: string[];

  // Action/event type checking (journeys)
  /** Action types that must be used in steps */
  actionTypesInclude?: string[];
  /** Event types that must be used in steps */
  eventTypesInclude?: string[];
}

/**
 * Matcher for form fields
 */
export interface FieldMatcher {
  /** Field title (exact or regex) */
  title?: string | RegExp;
  /** Field type */
  type?: string;
  /** Whether field is required */
  isRequired?: boolean;
}

/**
 * Result from running an eval
 */
export interface EvalResult {
  /** Eval ID */
  evalId: string;
  /** Whether the eval passed */
  passed: boolean;
  /** Error message if extraction failed */
  error?: string;
  /** Raw output from Claude Code if extraction failed */
  rawOutput?: string;
  /** Validation result from the validator */
  validation?: ValidationResult;
  /** Expectation checking results */
  expectations?: ExpectationResults;
  /** Parsed configuration (for debugging) */
  config?: unknown;
}

/**
 * Results from checking expectations
 */
export interface ExpectationResults {
  /** Whether all expectations passed */
  allPassed: boolean;
  /** Details for each expectation */
  details: ExpectationDetail[];
}

/**
 * Detail for a single expectation check
 */
export interface ExpectationDetail {
  /** Description of what was checked */
  description: string;
  /** Whether it passed */
  passed: boolean;
  /** Reason for failure (if failed) */
  reason?: string;
}
