import path from 'path';
import { defineWorkspace } from 'vitest/config';

/**
 * Two projects, because `/core` has to prove it needs no DOM.
 *
 * `__test__/setup.ts` installs browser shims (matchMedia, ResizeObserver, the PointerEvent
 * polyfill) at module scope — `helpers/pointer-events.ts` declares a class extending
 * `MouseEvent`, which throws the moment it is imported outside a DOM. So the core project
 * must not load it at all, and that is the point rather than an inconvenience: anything
 * under `src/core/` that reaches for `window`, `document` or React fails here instead of at
 * a consumer's build (spec section 4).
 *
 * The core project deliberately does NOT `extend` vite.config.ts. Extending merges the root
 * `test` block, and `setupFiles` survives that merge even when the project sets it to `[]`,
 * which puts the DOM shims straight back. Declaring the alias directly is the only way to
 * get a genuinely bare node project.
 */
export default defineWorkspace([
  {
    extends: './vite.config.ts',
    test: {
      name: 'dom',
      environment: 'jsdom',
      setupFiles: ['./__test__/setup.ts'],
      include: ['__test__/**/*.test.{ts,tsx}'],
      exclude: ['__test__/core/**'],
    },
  },
  {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      name: 'core',
      environment: 'node',
      globals: true,
      include: ['__test__/core/**/*.test.ts'],
    },
  },
]);
