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
  }
]);
