/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  globals: { 'ts-jest': { isolatedModules: true } },
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@rental-trust/types$': '<rootDir>/../../packages/types/src/index.ts',
    '^@rental-trust/database$': '<rootDir>/../../packages/database/src/index.ts',
  },
};
