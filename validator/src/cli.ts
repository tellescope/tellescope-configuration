import { Command } from 'commander';
import { readFileSync, writeFileSync } from 'fs';
import { validate, ValidateOptions } from './validate';
import { formatAsJson } from './errors/formatter';
import { applyAutoFixes } from './errors/suggestions';
import { FixConfidence } from './errors/types';

const program = new Command();

program
  .name('tellescope-validate')
  .description('Validate Tellescope configuration exports')
  .version('1.0.0');

program
  .argument('<file>', 'JSON configuration file to validate')
  .option('-o, --output <file>', 'Write JSON results to file instead of stdout')
  .option('--only <models>', 'Validate only specific models (comma-separated): journeys,automationTriggers,forms,templates,calendarEventTemplates')
  .option('--no-warnings', 'Only report errors, not warnings')
  .option('--fix-file <file>', 'Generate a fixed version of the configuration')
  .option('--fix-confidence <level>', 'Minimum confidence level for auto-fixes: high, medium, low', 'high')
  .option('--compact', 'Output compact JSON (no indentation)')
  .action(async (file: string, options: {
    output?: string;
    only?: string;
    warnings: boolean;
    fixFile?: string;
    fixConfidence: string;
    compact?: boolean;
  }) => {
    try {
      // Read input file
      const content = readFileSync(file, 'utf-8');
      let config: unknown;

      try {
        config = JSON.parse(content);
      } catch (parseError) {
        const errorResult = {
          valid: false,
          summary: {
            errors: 1,
            warnings: 0,
            modelsValidated: {
              journeys: 0,
              automationTriggers: 0,
              forms: 0,
              templates: 0,
              calendarEventTemplates: 0,
            },
          },
          errors: [{
            code: 'INVALID_EXPORT_STRUCTURE',
            message: `Failed to parse JSON: ${(parseError as Error).message}`,
            path: '',
            severity: 'error' as const,
          }],
          validatedAt: new Date().toISOString(),
          inputPath: file,
        };
        outputResult(errorResult, options);
        process.exit(1);
      }

      // Parse --only option
      const validateOptions: ValidateOptions = {
        includeWarnings: options.warnings,
      };

      if (options.only) {
        const modelTypes = options.only.split(',').map(s => s.trim()) as ValidateOptions['only'];
        validateOptions.only = modelTypes;
      }

      // Run validation
      const result = validate(config, validateOptions, file);

      // Generate fixed file if requested
      if (options.fixFile && result.errors.length > 0) {
        const confidence = options.fixConfidence as FixConfidence;
        const { config: fixedConfig, appliedFixes, skippedFixes } = applyAutoFixes(
          config as object,
          result.errors,
          confidence
        );

        writeFileSync(options.fixFile, JSON.stringify(fixedConfig, null, 2));

        // Add fix summary to result
        (result as any).fixSummary = {
          outputFile: options.fixFile,
          appliedFixes,
          skippedFixes,
          minConfidence: confidence,
        };
      }

      // Output result
      outputResult(result, options);

      // Exit with appropriate code
      process.exit(result.valid ? 0 : 1);

    } catch (error) {
      const errorResult = {
        valid: false,
        summary: {
          errors: 1,
          warnings: 0,
          modelsValidated: {
            journeys: 0,
            automationTriggers: 0,
            forms: 0,
            templates: 0,
            calendarEventTemplates: 0,
          },
        },
        errors: [{
          code: 'INVALID_EXPORT_STRUCTURE',
          message: `Error: ${(error as Error).message}`,
          path: '',
          severity: 'error' as const,
        }],
        validatedAt: new Date().toISOString(),
        inputPath: file,
      };
      outputResult(errorResult, { ...options, warnings: true });
      process.exit(2);
    }
  });

function outputResult(result: unknown, options: { output?: string; compact?: boolean; warnings?: boolean }) {
  const json = formatAsJson(result as any, !options.compact);

  if (options.output) {
    writeFileSync(options.output, json);
  } else {
    console.log(json);
  }
}

program.parse();
