import { EvalDefinition } from '../eval-types';

export const basicTemplateEval: EvalDefinition = {
  id: 'basic-template',
  name: 'Generate a basic SMS template',
  prompt: `Generate a Tellescope configuration export with an SMS message template called "Appointment Reminder" that:
1. Has a friendly reminder message about an upcoming appointment
2. Uses the {{enduser.fname}} variable for personalization in the message
3. Type should be "enduser" (for patient-facing messages)
4. Include a subject line (can be a short identifier for SMS)

Reference the schemas/template-schema.md file for the exact template structure.
Look at examples/models/templates/sms-template.json for a reference of a valid SMS template.

Important requirements:
- The id must be a valid 24-character hex MongoDB ObjectId (e.g., "507f1f77bcf86cd799439011")
- Include exportedAt timestamp, organizationId, and version in the root object
- The data object should have a templates array containing the template
- The message field must include {{enduser.fname}} somewhere in the text`,
  expectations: {
    valid: true,
    errors: 0,
    warnings: 0,
    models: {
      templates: [
        {
          title: /appointment.*reminder/i,
          messageContains: '{{enduser.fname}}',
        },
      ],
    },
  },
};
