import { EvalDefinition } from '../eval-types';

export const simpleJourneyEval: EvalDefinition = {
  id: 'simple-journey',
  name: 'Generate a simple single-step journey',
  prompt: `Generate a Tellescope configuration export with a journey called "Welcome Journey" that:
1. Has a single step triggered on journey start (onJourneyStart event)
2. The step action should set the enduser status to "Enrolled" (setEnduserStatus action)
3. Include proper defaultState and states array with at least one state

Reference the schemas/automation-schema.md file for the exact journey and step structure.
Look at examples/models/automations/journey_one_step.json for a reference of a valid single-step journey.

Important requirements:
- All IDs must be valid 24-character hex MongoDB ObjectIds (e.g., "507f1f77bcf86cd799439011")
- The step's journeyId must match the parent journey's id
- Include exportedAt timestamp, organizationId, and version in the root object
- The data object should have a journeys array containing the journey`,
  expectations: {
    valid: true,
    errors: 0,
    warnings: 0,
    models: {
      journeys: [
        {
          title: /welcome/i,
          hasSteps: true,
          minStepCount: 1,
          actionTypesInclude: ['setEnduserStatus'],
          eventTypesInclude: ['onJourneyStart'],
        },
      ],
    },
  },
};
