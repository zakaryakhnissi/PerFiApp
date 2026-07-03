/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  moduleNameMapper: {
    '^@perfiapp/money$': '<rootDir>/../money/src',
    '^@perfiapp/kb-schema$': '<rootDir>/../kb-schema/src',
  },
};
