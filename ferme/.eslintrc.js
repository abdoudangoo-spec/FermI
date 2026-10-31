module.exports = {
  root: true,
  extends: ['expo'],
  plugins: ['import', 'react-hooks'],
  env: {
    node: true,
    es2021: true,
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    'no-undef': 'error',
    'import/named': 'error',
    'import/no-unresolved': ['error', { ignore: ['^expo-', '^@expo', '^react-native', 'firebase'] }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
    // Règle plus récente du plugin react-hooks (via eslint-config-expo) :
    // on la garde en avertissement pour l'instant, au même titre que
    // exhaustive-deps, pour ne pas bloquer la CI sur du refactor de hooks
    // qui sort du périmètre de cet audit.
    'react-hooks/set-state-in-effect': 'warn',
    'react-hooks/refs': 'warn',
  },
  overrides: [
    {
      files: ['src/__tests__/**/*.js', '**/*.test.js'],
      env: { jest: true },
    },
  ],
  ignorePatterns: ['node_modules/', 'dist/', '.expo/', 'scripts/', 'plugins/'],
};
