import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import skipFormatting from 'eslint-config-prettier'

export default [
  {
    ignores: ['dist/**', 'coverage/**', '.vercel/**', 'node_modules/**'],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['api/**/*.js', 'server/**/*.js', '*.config.js', 'scripts/**/*.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['tests/**/*.js', 'src/**/*.test.js'],
    languageOptions: { globals: { ...globals.node } },
  },
  skipFormatting,
]
