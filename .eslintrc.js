module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
  },
  rules: {
    'consistent-return': 'warn',
    'import/no-cycle': 'warn',
    'no-bitwise': 'warn',
    'no-empty': 'warn',
    'no-eval': 'warn',
    'no-mixed-operators': 'warn',
    'no-nested-ternary': 'warn',
    'no-plusplus': 'off',
    'no-shadow': 'warn',
    'no-underscore-dangle': 'off',
    'no-unused-vars': 'warn',
    'prefer-destructuring': 'warn',
    'prefer-rest-params': 'warn',
  },
};
