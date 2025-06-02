import { afterAll, beforeAll, beforeEach, vi } from "vitest";



beforeEach(() => {
  // Clear all mocks before each test
  vi.clearAllMocks()
})


afterAll(async () => {
  vi.restoreAllMocks(); // Restore original module behavior after all tests in this suite are done
})


// No database operations, no server building (testApp) in unit test setup.
// vi.clearAllMocks() or vi.resetAllMocks() can be called in beforeEach/afterEach
// hooks within individual test files (like your user.controllers.test.ts already does).