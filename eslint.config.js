const prettierConfig = require('eslint-config-prettier')
const prettierPlugin = require('eslint-plugin-prettier')
const {node} = require('globals')

module.exports = [
  {
    ignores: ['node_modules'],
  },
  {
    files: ['**/*.js'],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'warn',
    },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...node,
      },
    },
  },
  {
    files: ['**/*.js'],
    ...prettierConfig,
  },
]
