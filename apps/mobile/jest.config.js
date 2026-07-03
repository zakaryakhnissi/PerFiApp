/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  setupFilesAfterEnv: ['@testing-library/react-native/extend-expect'],
  testPathIgnorePatterns: ['/node_modules/', 'fixtures'],
  moduleNameMapper: {
    '^@perfiapp/money$': '<rootDir>/../../packages/money/src',
    '^@perfiapp/kb-schema$': '<rootDir>/../../packages/kb-schema/src',
    '^@perfiapp/recommender$': '<rootDir>/../../packages/recommender/src',
    '^@perfiapp/i18n$': '<rootDir>/../../packages/i18n/src',
  },
  // pnpm layout: paths look like node_modules/.pnpm/<pkg>@<ver>/node_modules/<pkg>/…
  // and scoped names use "+" inside .pnpm. Allow RN/Expo packages through the
  // transform at both levels.
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/)?((jest-)?react-native|@react-native(-community)?[/+]|expo(nent)?|@expo(nent)?[/+]|@expo-google-fonts[/+]|react-navigation|@react-navigation[/+]|@sentry[/+]react-native|native-base|react-native-svg|@react-native-async-storage[/+]))',
  ],
};
