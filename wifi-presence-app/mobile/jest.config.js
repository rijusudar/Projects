/**
 * Tests the app's pure logic (notification rules, mock client, person tracking, offline
 * transitions) without React Native rendering, so they run fast and deterministically.
 * Component rendering is covered by typechecking + Expo tooling.
 */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@wifi-presence/shared$': '<rootDir>/../shared/src/index.ts',
  },
  testTimeout: 10000,
};
