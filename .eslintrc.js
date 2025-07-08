module.exports = {
  extends: ['next/core-web-vitals'],
  ignorePatterns: ['**/src/generated/**', '**/generated/**', '**/dist/**', '**/node_modules/**'],
  rules: {
    // Disable specific rules for development convenience
    '@typescript-eslint/no-unused-vars': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-empty-object-type': 'warn'
  }
};
