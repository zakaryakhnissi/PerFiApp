/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testRegex: '.e2e-spec.ts$',
  moduleNameMapper: {
    '^@perfiapp/kb-schema$': '<rootDir>/../../packages/kb-schema/src',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { emitDecoratorMetadata: true, experimentalDecorators: true, esModuleInterop: true, strict: true } }],
  },
};
