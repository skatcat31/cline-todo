// ESLint flat config (ESLint v9).
// Covers the app source, tests and build tooling with the recommended
// core rules plus React and React-hooks rules.
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  // Generated / vendored output – never lint these.
  { ignores: ['dist/', 'coverage/', 'node_modules/'] },

  // Recommended core rules (no-unused-vars, no-undef, ...).
  js.configs.recommended,

  {
    files: ['**/*.{js,mjs,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: { ...globals.browser },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // The automatic JSX runtime (React 19) does not require `React` in
      // scope, so the classic rule is disabled; genuinely unused React
      // imports are caught by no-unused-vars instead.
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // Mark variables referenced from JSX tags as used.
      'react/jsx-uses-vars': 'error',
      // The app is plain JavaScript, so prop types are documented with
      // JSDoc-style comments instead of being enforced by the linter.
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Vite Fast Refresh: warn when a module mixes component and
      // non‑component exports (allow the default export pattern).
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
    },
  },

  // Build/tooling config runs in Node, not in the browser.
  {
    files: [
      'vite.config.js',
      'vite.config.test.js',
      'eslint.config.mjs',
      'scripts/**',
    ],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
];
