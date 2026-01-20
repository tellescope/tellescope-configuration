import { describe, it, expect } from 'vitest';
import { runEval } from '../evals/run-eval';
import { simpleJourneyEval } from '../evals/definitions/simple-journey.eval';
import { basicTemplateEval } from '../evals/definitions/basic-template.eval';
import { EvalDefinition } from '../evals/eval-types';

const EVALS: EvalDefinition[] = [simpleJourneyEval, basicTemplateEval];

describe('Claude Code Evals', () => {
  // Evals run as part of main test suite
  for (const evalDef of EVALS) {
    it(`should pass: ${evalDef.name}`, { timeout: 120000 }, async () => {
      const result = await runEval(evalDef);

      // Log details for debugging
      if (!result.passed) {
        console.error(`\n=== Eval "${evalDef.name}" failed ===`);

        if (result.error) {
          console.error('Error:', result.error);
        }

        if (result.rawOutput) {
          console.error('Raw output (truncated):', result.rawOutput);
        }

        if (result.validation && !result.validation.valid) {
          console.error('Validation errors:', JSON.stringify(result.validation.errors, null, 2));
        }

        if (result.expectations && !result.expectations.allPassed) {
          console.error(
            'Failed expectations:',
            result.expectations.details.filter((d) => !d.passed)
          );
        }
      }

      // Check for extraction errors
      expect(result.error).toBeUndefined();

      // Validation must pass
      expect(result.validation?.valid).toBe(true);
      expect(result.validation?.summary.errors).toBe(0);
      expect(result.validation?.summary.warnings).toBe(0);

      // Expectations must be met
      expect(result.expectations?.allPassed).toBe(true);
    });
  }
});
