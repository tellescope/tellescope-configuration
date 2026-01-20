import { describe, it, expect } from 'vitest';
import { validateJourneys } from '../../src/validators/journey';

describe('Journey Validator', () => {
  describe('validateJourneys', () => {
    it('should require title', () => {
      const journeys = [{ id: '507f1f77bcf86cd799439011' }];
      const errors = validateJourneys(journeys);

      expect(errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD' && e.path.includes('title'))).toBe(
        true
      );
    });

    it('should validate ObjectId format', () => {
      const journeys = [{ id: 'invalid', title: 'Test' }];
      const errors = validateJourneys(journeys);

      expect(errors.some((e) => e.code === 'INVALID_OBJECT_ID')).toBe(true);
    });

    it('should accept valid 24-char hex ObjectId', () => {
      const journeys = [
        {
          id: '507f1f77bcf86cd799439011',
          title: 'Valid Journey',
          steps: [
            {
              id: '507f1f77bcf86cd799439012',
              journeyId: '507f1f77bcf86cd799439011',
              events: [{ type: 'onJourneyStart', info: {} }],
              action: { type: 'setEnduserStatus', info: {} },
            },
          ],
        },
      ];
      const errors = validateJourneys(journeys);

      expect(errors.filter((e) => e.code === 'INVALID_OBJECT_ID').length).toBe(0);
    });

    it('should validate step references exist', () => {
      const journeys = [
        {
          id: '507f1f77bcf86cd799439011',
          title: 'Test',
          steps: [
            {
              id: '507f1f77bcf86cd799439012',
              journeyId: '507f1f77bcf86cd799439011',
              events: [
                {
                  type: 'afterAction',
                  info: { automationStepId: 'nonexistent000000000000' },
                },
              ],
              action: { type: 'test' },
            },
          ],
        },
      ];
      const errors = validateJourneys(journeys);

      expect(errors.some((e) => e.code === 'INVALID_STEP_REFERENCE')).toBe(true);
    });

    it('should validate journeyId matches parent journey', () => {
      const journeys = [
        {
          id: '507f1f77bcf86cd799439011',
          title: 'Test',
          steps: [
            {
              id: '507f1f77bcf86cd799439012',
              journeyId: 'differentid0000000000000', // Different from parent
              events: [{ type: 'onJourneyStart', info: {} }],
              action: { type: 'test' },
            },
          ],
        },
      ];
      const errors = validateJourneys(journeys);

      expect(errors.some((e) => e.code === 'REFERENCE_NOT_FOUND' && e.path.includes('journeyId'))).toBe(
        true
      );
    });

    it('should require events array', () => {
      const journeys = [
        {
          id: '507f1f77bcf86cd799439011',
          title: 'Test',
          steps: [
            {
              id: '507f1f77bcf86cd799439012',
              journeyId: '507f1f77bcf86cd799439011',
              action: { type: 'test' },
              // Missing events
            },
          ],
        },
      ];
      const errors = validateJourneys(journeys);

      expect(errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD' && e.path.includes('events'))).toBe(
        true
      );
    });

    it('should require action object', () => {
      const journeys = [
        {
          id: '507f1f77bcf86cd799439011',
          title: 'Test',
          steps: [
            {
              id: '507f1f77bcf86cd799439012',
              journeyId: '507f1f77bcf86cd799439011',
              events: [{ type: 'onJourneyStart', info: {} }],
              // Missing action
            },
          ],
        },
      ];
      const errors = validateJourneys(journeys);

      expect(errors.some((e) => e.code === 'MISSING_REQUIRED_FIELD' && e.path.includes('action'))).toBe(
        true
      );
    });

    it('should pass for valid journey with steps', () => {
      const journeys = [
        {
          id: '507f1f77bcf86cd799439011',
          title: 'Valid Journey',
          steps: [
            {
              id: '507f1f77bcf86cd799439012',
              journeyId: '507f1f77bcf86cd799439011',
              events: [{ type: 'onJourneyStart', info: {} }],
              action: { type: 'setEnduserStatus', info: {} },
            },
          ],
        },
      ];
      const errors = validateJourneys(journeys);

      expect(errors.length).toBe(0);
    });

    it('should allow journey without steps', () => {
      const journeys = [
        {
          id: '507f1f77bcf86cd799439011',
          title: 'Journey Without Steps',
        },
      ];
      const errors = validateJourneys(journeys);

      expect(errors.length).toBe(0);
    });

    it('should validate continueOnError is boolean', () => {
      const journeys = [
        {
          id: '507f1f77bcf86cd799439011',
          title: 'Test',
          steps: [
            {
              id: '507f1f77bcf86cd799439012',
              journeyId: '507f1f77bcf86cd799439011',
              events: [{ type: 'onJourneyStart', info: {} }],
              action: { type: 'test', continueOnError: 'not-a-boolean' },
            },
          ],
        },
      ];
      const errors = validateJourneys(journeys);

      expect(
        errors.some((e) => e.code === 'INVALID_TYPE' && e.path.includes('continueOnError'))
      ).toBe(true);
    });
  });
});
