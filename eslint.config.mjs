import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs', 'build/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',

      'prettier/prettier': 'off',

      'no-tabs': 'off',
      'indent': 'off',
      'no-mixed-spaces-and-tabs': 'off',
      'no-trailing-spaces': 'off',
      'no-multiple-empty-lines': 'off',
      'eol-last': 'off',
      'space-before-blocks': 'off',
      'keyword-spacing': 'off',
      'space-infix-ops': 'off',
      'space-before-function-paren': 'off',
      'arrow-spacing': 'off',
      'block-spacing': 'off',
      'object-curly-spacing': 'off',
      'array-bracket-spacing': 'off',
      'computed-property-spacing': 'off',
      'template-curly-spacing': 'off',
      'spaced-comment': 'off',

      'brace-style': 'off',
      'comma-dangle': 'off',
      'comma-spacing': 'off',
      'func-call-spacing': 'off',
      'key-spacing': 'off',
      'semi': 'off',
      'semi-spacing': 'off',
      'quotes': 'off',
    },
  },
);