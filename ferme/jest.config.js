// Les tests d'intégration utilisent un vrai moteur SQLite (node:sqlite, Node ≥ 22.5) et un faux
// Firebase en mémoire (src/__tests__/helpers) : aucune dépendance réseau, aucun mock fragile.
const H = '<rootDir>/src/__tests__/helpers/';
module.exports = {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/__tests__/**/*.test.js'],
  moduleNameMapper: {
    '^expo-sqlite$': `${H}sqlite.js`,
    '^firebase/app$': `${H}firebase-app.js`,
    '^firebase/auth$': `${H}firebase-auth.js`,
    '^firebase/firestore$': `${H}firebase-firestore.js`,
    '^firebase/storage$': `${H}firebase-storage.js`,
    '^expo-network$': `${H}expo-network.js`,
    '^@react-native-async-storage/async-storage$': `${H}async-storage.js`,
    '^expo-print$': `${H}expo-print.js`,
    '^expo-sharing$': `${H}expo-sharing.js`,
    '^expo-secure-store$': `${H}expo-secure-store.js`,
  },
  collectCoverageFrom: ['src/engine/**/*.js', 'src/store/**/*.js', 'src/sync/**/*.js', 'src/firebase/**/*.js', 'src/db/**/*.js', 'src/utils/**/*.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
  ],
};
