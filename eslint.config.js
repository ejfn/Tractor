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
    },
  },
  {
    files: ['src/utils/gameLogger.ts', 'src/locales/index.ts'],
    rules: {
      'no-console': 'off', // Allow console in gameLogger infrastructure and locales
    },
  }
]);
