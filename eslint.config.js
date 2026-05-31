const tseslint = require('typescript-eslint');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  ...tseslint.configs.strict,
  eslintPluginPrettierRecommended,
  {
    ignores: ['dist/*'],
  },
  {
    rules: {
      'no-console': 'error', // Enforce use of gameLogger instead of console
      'prettier/prettier': 'error', // Enforce strict formatting
      '@typescript-eslint/no-explicit-any': 'error', // Enforce type safety
      '@typescript-eslint/no-unused-vars': 'error', // Enforce no unused variables
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['src/utils/gameLogger.ts', 'src/locales/index.ts'],
    rules: {
      'no-console': 'off', // Allow console in gameLogger infrastructure and locales
    },
  }
]);
