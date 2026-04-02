/** @type {import('ts-jest').JestConfigWithTsJest} */

export const preset = 'ts-jest';
export const testEnvironment = 'node';
export const testMatch = ['**/tests/**/*.spec.ts', '**/tests/**/*.test.ts'];
export const collectCoverage = true;
export const coverageDirectory = 'coverage';
export const clearMocks = true;
