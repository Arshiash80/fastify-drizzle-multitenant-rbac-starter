// test/vitest.integration.test.setup.ts
import { beforeAll, afterAll, beforeEach, vi, afterEach } from "vitest";
import { sql } from "drizzle-orm";
import { applications, roles, users, usersToRoles } from "../src/db/schema"; // Schema for TRUNCATE
import { buildServer } from "../src/utils/server";
// PGLite specific imports
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'; // PGLite specific migrator
import { db, client } from "../src/db/__mock__";

// ---- Mocking src/db ----
vi.mock(import("../src/db"), async (importOriginal) => {
  const originalModule = await importOriginal();
  const { db } = await import("../src/db/__mock__");
  return {
    db: db as unknown as typeof originalModule.db,
  }
});
// ---- End Mocking src/db ----


let testApp: Awaited<ReturnType<typeof buildServer>>

// This runs before all tests
beforeAll(async () => {
  // PGLite itself initializes synchronously with `new PGlite()`.
  // Migrations are run using the PGLite-specific migrator and db instance.
  await migratePglite(db, { migrationsFolder: './migrations' });

  testApp = await buildServer() // buildServer will now internally use the mocked 'db'
  await testApp.listen({ port: 0 }) // Using port 0 lets the OS assign a random available port
})

beforeEach(async () => {
  // Clear the database
  await db.execute(
    // TRUNCATE TABLE: This is a SQL command that removes all rows from one or more tables very quickly. It's generally much faster than DELETE for emptying an entire table.

    // RESTART IDENTITY: id columns that automatically generate numbers (e.g., 1, 2, 3...), RESTART IDENTITY resets this counter back to its starting value. 

    // CASCADE: This is very important when dealing with tables that have foreign key relationships.
    // - If `applications` is truncated, CASCADE will automatically remove referencing rows in `users`, `roles`, and `usersToRoles` that have foreign keys pointing to the truncated applications.
    // - Without CASCADE, TRUNCATE would fail if there were existing foreign key constraints pointing to the table being truncated (unless those related tables were also listed in the same TRUNCATE command or were already empty).

    sql`TRUNCATE TABLE ${usersToRoles}, ${users}, ${roles}, ${applications} RESTART IDENTITY CASCADE;`
  );
})



afterAll(async () => {
  await testApp.close();


  await db.execute(
    // TRUNCATE TABLE: This is a SQL command that removes all rows from one or more tables very quickly. It's generally much faster than DELETE for emptying an entire table.

    // RESTART IDENTITY: id columns that automatically generate numbers (e.g., 1, 2, 3...), RESTART IDENTITY resets this counter back to its starting value. 

    // CASCADE: This is very important when dealing with tables that have foreign key relationships.
    // - If `applications` is truncated, CASCADE will automatically remove referencing rows in `users`, `roles`, and `usersToRoles` that have foreign keys pointing to the truncated applications.
    // - Without CASCADE, TRUNCATE would fail if there were existing foreign key constraints pointing to the table being truncated (unless those related tables were also listed in the same TRUNCATE command or were already empty).

    sql`TRUNCATE TABLE ${usersToRoles}, ${users}, ${roles}, ${applications} RESTART IDENTITY CASCADE;`
  );

  // Close the PGLite database connection.
  if (client && typeof client.close === 'function') {
    await client.close()
  }
  vi.restoreAllMocks(); // Restore original module behavior after all tests in this suite are done
});


export { testApp } // If your individual test files need access to the Fastify app instance