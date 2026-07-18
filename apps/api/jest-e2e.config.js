/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testRegex: '.e2e-spec.ts$',
  moduleNameMapper: {
    '^@perfiapp/kb-schema$': '<rootDir>/../../packages/kb-schema/src',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
};
