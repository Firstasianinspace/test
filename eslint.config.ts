import js from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist',
      'scripts',
      'node_modules',
      '.agents',
      '.claude',
      'coverage',
      'playwright-report',
      'test-results',
      'src/infrastructure/supabase/database.types.ts',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  { files: ['src/**/*.{ts,tsx}'], ...reactHooks.configs.flat.recommended },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'react-refresh': reactRefresh, boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/domain/**' },
        { type: 'application', pattern: 'src/application/**' },
        { type: 'composition', pattern: 'src/presentation/app/**' },
        { type: 'presentation', pattern: 'src/presentation/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
      ],
    },
    rules: {
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'domain' } },
              allow: { to: { element: { type: 'domain' } } },
            },
            {
              from: { element: { type: 'application' } },
              allow: { to: { element: { type: ['application', 'domain'] } } },
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: { to: { element: { type: ['infrastructure', 'application', 'domain'] } } },
            },
            {
              from: { element: { type: 'composition' } },
              allow: {
                to: {
                  element: {
                    type: [
                      'composition',
                      'presentation',
                      'infrastructure',
                      'application',
                      'domain',
                    ],
                  },
                },
              },
            },
            {
              from: { element: { type: 'presentation' } },
              allow: { to: { element: { type: ['presentation', 'application', 'domain'] } } },
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/infrastructure/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@supabase/*'],
              message: '@supabase/* is allowed only in src/infrastructure.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/presentation/components/ui/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
  {
    files: ['**/*.config.ts', '**/*.test.{ts,tsx}', 'e2e/**', 'supabase/tests/**'],
    rules: { 'boundaries/dependencies': 'off' },
  },
  prettier,
);
