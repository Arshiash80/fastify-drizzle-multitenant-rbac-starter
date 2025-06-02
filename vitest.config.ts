import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    workspace: [
      // Unit Test Project
      {
        test: {
          name: 'unit',
          globals: true,
          environment: 'node',
          setupFiles: ['./test/vitest.unit.test.setup.ts'],
          include: ['src/**/*.unit.{test,spec}.ts'], // Matches files like user.unit.test.ts
          testTimeout: 10000,
          env: {
            NODE_ENV: 'test',
          },

        },
      },
      // Integration Test Project
      {
        test: {
          name: 'integration',
          globals: true,
          environment: 'node',
          setupFiles: ['./test/vitest.integration.test.setup.ts'],
          include: ['src/**/*.integration.{test,spec}.ts'], // Matches files like user.integration.test.ts
          testTimeout: 10000,
          env: {
            NODE_ENV: 'test',
          },

        },
      },
    ],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'], // lcov is good for services like Coveralls/Codecov
      reportsDirectory: './coverage', // Single directory for the merged report
      include: ['./src/**/*.ts'],
      exclude: [
        './test/**/*',
        './src/main.ts',
        './src/db/**/*',
        './src/utils/logger.ts',
        './src/**/*.test.ts', // Exclude all test files themselves from coverage stats
        './src/**/*.unit.{test,spec}.ts',
        './src/**/*.integration.{test,spec}.ts',
      ],
    },

  }
});