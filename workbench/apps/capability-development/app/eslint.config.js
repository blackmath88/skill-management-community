import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Browser storage must be read in an effect, never during render or module evaluation.
      'react-hooks/set-state-in-effect': 'off',
      // `ignoreRestSiblings` is for the omit-by-rest pattern used in the deletion cascades:
      // `const { campaignId: _dropped, ...rest } = activity` is how a field is removed under
      // exactOptionalPropertyTypes, and the discarded binding is the point of it.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  {
    files: ['tests/**/*.mjs'],
    languageOptions: { globals: { ...globals.node } },
  },
)
