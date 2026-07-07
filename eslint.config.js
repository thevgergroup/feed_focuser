import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['extension/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script', // extension files are not ES modules
      globals: {
        ...globals.browser,
        chrome: 'readonly',
        globalThis: 'readonly',
      },
    },
    rules: {
      // Errors
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-duplicate-case': 'error',

      // Code quality
      'eqeqeq': ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-implicit-globals': 'off', // content scripts run in an isolated world

      // Dead code
      'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],

      // Style (auto-fixable)
      'semi': ['error', 'always'],
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
];
