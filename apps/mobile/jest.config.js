/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  roots: ['<rootDir>/src'],
  moduleNameMapper: {
    '^@perfiapp/money$': '<rootDir>/../../packages/money/src',
    '^@perfiapp/kb-schema$': '<rootDir>/../../packages/kb-schema/src',
    '^@perfiapp/recommender$': '<rootDir>/../../packages/recommender/src',
    '^@perfiapp/i18n$': '<rootDir>/../../packages/i18n/src',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg|@react-native-async-storage/.*))',
  ],
};
