import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-*/**',
      '**/node_modules/**',
      '**/public/mockServiceWorker.js',
      '**/.bundle-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // The charter bans `any`. Use `unknown` + narrowing instead.
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // `verbatimModuleSyntax` in tsconfig requires type-only imports be explicit.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
    },
  },
  {
    // Node-side tooling (vite configs, build scripts) sees node globals, not browser.
    files: ['**/vite.config.ts', 'scripts/**/*.{js,mjs,ts}', 'eslint.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
);
