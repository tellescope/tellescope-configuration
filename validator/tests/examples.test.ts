import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { validate } from '../src';

const EXAMPLES_DIR = path.resolve(__dirname, '../../examples/models');

/**
 * Dynamically discover all example JSON files
 */
function findExampleFiles(dir: string): string[] {
  const files: string[] = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findExampleFiles(fullPath));
    } else if (entry.name.endsWith('.json')) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('Example Files Validation', () => {
  const exampleFiles = findExampleFiles(EXAMPLES_DIR);

  it('should find example files', () => {
    expect(exampleFiles.length).toBeGreaterThan(0);
    console.log(`Found ${exampleFiles.length} example files to validate`);
  });

  describe.each(exampleFiles)('%s', (filePath) => {
    const relativePath = path.relative(EXAMPLES_DIR, filePath);

    it(`should pass validation with 0 errors (${relativePath})`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content);
      const result = validate(config);

      if (!result.valid || result.summary.errors > 0) {
        console.error('Validation errors:', JSON.stringify(result.errors, null, 2));
      }

      expect(result.valid).toBe(true);
      expect(result.summary.errors).toBe(0);
    });

    it(`should have 0 warnings (${relativePath})`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const config = JSON.parse(content);
      const result = validate(config);

      if (result.summary.warnings > 0) {
        console.warn('Validation warnings:', JSON.stringify(
          result.errors.filter(e => e.severity === 'warning'),
          null,
          2
        ));
      }

      expect(result.summary.warnings).toBe(0);
    });
  });
});
