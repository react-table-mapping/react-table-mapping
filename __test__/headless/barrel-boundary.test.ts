import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The styled layer must reach `/headless` through its published barrel, and a lint rule says so.
 *
 * A rule that is configured but never fires is worth nothing, and there is no way to tell the
 * two apart by reading the config — so this writes a file that breaks it and checks that ESLint
 * complains. Without this, deleting the rule leaves every test green.
 *
 * The other direction is covered by the suite as a whole: the styled layer is built on the
 * published hook, so the unit and e2e suites passing is the evidence that the barrel is
 * enough to build a real board with.
 */

const OFFENDING_IMPORT = `import { useConnectorRegistry } from '@/headless/internal/useConnectorRegistry';

export const probe = useConnectorRegistry;
`;

/** Runs ESLint on one file and returns what it said. */
const lint = (relativePath: string) => {
  try {
    execFileSync('npx', ['eslint', '--format', 'json', relativePath], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
    });

    return '';
  } catch (error) {
    // ESLint exits non-zero when it finds something, and its report is on stdout either way.
    return String((error as { stdout?: string }).stdout ?? '');
  }
};

describe('the barrel boundary is enforced, not just declared', () => {
  it('rejects a styled-layer file that reaches past the barrel', () => {
    // Written into src/components so the rule's `files` pattern applies. A temp directory
    // would be outside it and the rule would correctly ignore the file.
    const probePath = join('src', 'components', '__barrel-boundary-probe.ts');

    writeFileSync(probePath, OFFENDING_IMPORT);

    try {
      const report = lint(probePath);

      expect(report).toContain('no-restricted-imports');
      expect(report).toContain('Import from `@/headless` instead');
    } finally {
      rmSync(probePath, { force: true });
    }
  });

  it('allows the same import from inside the headless layer', () => {
    // The pieces have to compose somewhere, and that somewhere is exempt on purpose.
    const probePath = join('src', 'headless', '__barrel-boundary-probe.ts');

    writeFileSync(probePath, OFFENDING_IMPORT);

    try {
      expect(lint(probePath)).not.toContain('no-restricted-imports');
    } finally {
      rmSync(probePath, { force: true });
    }
  });
});
