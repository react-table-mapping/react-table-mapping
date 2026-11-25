// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import storybook from 'eslint-plugin-storybook';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // website/ is the Docusaurus docs site: its own project, with its own lint and format.
  { ignores: ['dist', 'storybook-static', 'website'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    /**
     * The styled layer is a consumer of `/headless`, and has to stay one.
     *
     * It is the only proof that the published hook is enough to build a real board with — a gap
     * in it would have to be worked around here, in a file anyone can read. Let one component
     * reach past the barrel and that proof is gone, quietly: everything still passes, and the
     * hook nobody can reach is missing something nobody notices.
     *
     * `src/headless/**` is exempt because that is where the pieces live and compose.
     */
    files: ['src/components/**/*.{ts,tsx}', 'src/hooks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/headless/internal/*', '**/headless/internal/*'],
              message:
                'Import from `@/headless` instead. The styled layer is built on the published API so that a gap in it is impossible to miss.',
            },
          ],
        },
      ],
    },
  },
  storybook.configs['flat/recommended'],
);
