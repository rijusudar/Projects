/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@wifi-presence/shared$': '<rootDir>/../shared/src/index.ts',
  },
  testTimeout: 15000,
};
