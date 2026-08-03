/** @type {import('jest').Config} */
module.exports = {
  projects: ['<rootDir>/apps/api/jest.config.js'],
  collectCoverageFrom: [
    'apps/api/src/**/*.ts',
    '!apps/api/src/**/*.d.ts',
    '!apps/api/src/db/migrations/**',
    '!apps/api/src/server.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
