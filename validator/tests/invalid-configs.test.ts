import { describe, it, expect } from 'vitest';
import { validateFixture, expectError } from './helpers/test-utils';

describe('Invalid Configuration Detection', () => {
  describe('missing-title.json', () => {
    it('should detect missing title', () => {
      const result = validateFixture('invalid/missing-title.json');

      expect(result.valid).toBe(false);
      expectError(result, 'MISSING_REQUIRED_FIELD', 'title');
    });
  });

  describe('invalid-object-id.json', () => {
    it('should detect invalid ObjectId format', () => {
      const result = validateFixture('invalid/invalid-object-id.json');

      expect(result.valid).toBe(false);
      expectError(result, 'INVALID_OBJECT_ID');
    });
  });

  describe('broken-step-reference.json', () => {
    it('should detect invalid step reference', () => {
      const result = validateFixture('invalid/broken-step-reference.json');

      expect(result.valid).toBe(false);
      expectError(result, 'INVALID_STEP_REFERENCE', 'automationStepId');
    });
  });
});
