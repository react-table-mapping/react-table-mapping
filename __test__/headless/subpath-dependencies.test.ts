import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * What `/core` and `/headless` are allowed to drag in with them.
 *
 * The promise those two subpaths make is that they cost a consumer nothing beyond React: no
 * stylesheet, no icon set, no select widget. That promise is easy to break by accident — one
 * import of a styled component from a hook and the whole styled bundle follows, and every test
 * still passes because the code is still correct, only heavier.
 *
 * Walks the source rather than `dist/`, so it needs no build and fails on the commit that
 * introduced the import rather than at publish time.
 */

/** Bare specifiers the framework-agnostic subpaths may reach for. */
const ALLOWED_PACKAGES = new Set(['react', 'react-dom', 'react/jsx-runtime']);

const SOURCE_ROOT = resolve(__dirname, '..', '..', 'src');

/** Every `from '…'` in a module, ignoring the ones inside block comments. */
const importsIn = (code: string): string[] => {
  const withoutComments = code.replace(/\/\*[\s\S]*?\*\//g, '');

  return [...withoutComments.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map((match) => match[1]);
};

/** Resolves a relative or `@/`-aliased specifier to a file on disk. */
const resolveModule = (specifier: string, importer: string): string | null => {
  const base = specifier.startsWith('@/')
    ? join(SOURCE_ROOT, specifier.slice(2))
    : resolve(dirname(importer), specifier);

  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts')]) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // Not this one; try the next shape.
    }
  }

  return null;
};

/** Every bare package specifier reachable from an entry, following local imports. */
const walkFrom = (entry: string): { packages: string[]; seen: Set<string> } => {
  const seen = new Set<string>();
  const packages = new Set<string>();
  const queue = [resolve(SOURCE_ROOT, '..', entry)];

  while (queue.length) {
    const file = queue.pop()!;

    if (seen.has(file)) continue;

    seen.add(file);

    for (const specifier of importsIn(readFileSync(file, 'utf8'))) {
      const isLocal = specifier.startsWith('.') || specifier.startsWith('@/');

      if (!isLocal) {
        packages.add(specifier);
        continue;
      }

      const resolved = resolveModule(specifier, file);

      // A local import that resolves to nothing is a typo or a missing file; either way it
      // would fail the build, and letting it pass silently here would hide it.
      expect(resolved, `${specifier} from ${file}`).not.toBeNull();
      queue.push(resolved!);
    }
  }

  return { packages: [...packages].sort(), seen };
};

const packagesReachableFrom = (entry: string): string[] => walkFrom(entry).packages;

describe('what the framework-agnostic subpaths cost a consumer', () => {
  it('/core reaches no package at all', () => {
    // Not even React: /core is plain logic, usable from any framework or none.
    expect(packagesReachableFrom('src/core.ts')).toEqual([]);
  });

  it('/headless reaches React and nothing else', () => {
    const unexpected = packagesReachableFrom('src/headless.ts').filter((specifier) => !ALLOWED_PACKAGES.has(specifier));

    // A stylesheet, `lucide-react` or a Radix package here means a hook reached into the
    // styled layer — the bundle a consumer of /headless never asked for.
    expect(unexpected).toEqual([]);
  });

  it('finds the styled layer reaching for more, so the walk is known to see imports at all', () => {
    // The control. If this came back empty the two assertions above would pass on a broken
    // walk that simply finds nothing anywhere.
    expect(packagesReachableFrom('src/index.ts').length).toBeGreaterThan(ALLOWED_PACKAGES.size);
  });

  it('visits every file under src/headless, so nothing is missed by an unfollowed import', () => {
    const walk = (directory: string): string[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const path = join(directory, entry.name);

        return entry.isDirectory() ? walk(path) : /\.tsx?$/.test(entry.name) ? [path] : [];
      });

    const onDiskFiles = walk(join(SOURCE_ROOT, 'headless'));
    const { seen } = walkFrom('src/headless.ts');

    // Every module under src/headless is reachable from the barrel; one that is not is either
    // dead or, worse, reachable only through a path this test does not follow.
    expect(onDiskFiles.length).toBeGreaterThan(0);
    expect(onDiskFiles.filter((f) => !seen.has(f))).toEqual([]);
  });
});
