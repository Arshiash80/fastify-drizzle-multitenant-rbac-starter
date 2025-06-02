
import { uuid, pgTable, varchar, timestamp, primaryKey, unique, text, foreignKey, pgEnum } from "drizzle-orm/pg-core";

// Applications Table
export const applications = pgTable("applications", {
  // Applications table columns (fields)
  id:
    uuid('id') // <- Data type of this column is uuid (universal unique identifier)
      .primaryKey() // <- pk is uniquely identifies each row in the table
      // DB automatically creates an index on primary keys. 
      // Making lookups by `id` faster.
      .defaultRandom(),
  name:
    varchar('name', { length: 255 })
      .notNull(), // <- Column cant left empty
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const users = pgTable("users", {
  id: uuid('id').defaultRandom().notNull(), // <- id is not going to be used as an primary key.
  email: varchar('email', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  applicationId: uuid('application_id').references(() => applications.id).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  primaryKey({ // <- Defines a Composite Primary Key (multiple columns).
    // Instead of a single column, 
    // the combination of `email` AND `applicationId` must be unique for each row.
    columns: [
      table.email, // <- User email must be unique in a specific application.
      // The same email can be used in different applications.
      table.applicationId
    ],
    name: 'users_pk' // <- custom name to the primary key constraint in the db
  }),
  unique("users_id_application_id_unique_idx").on(table.id, table.applicationId),
  unique('users_id_index') // <- Defines a Unique Constraint on the `id` column.
    // Ensures that all the values in the specified column (or set of columns) are unique across the table.
    .on(table.id)
  // unique vs primary key;
  // - A table can have only one primary key.
  // - A table can have multiple Unique Constraints.
  // - Primary key columns inheritly cannout be null.
  // - Unique constraint columns can allow NULL values (though in PostgreSQL, a NULL is not considered equal to another NULL, so you can have multiple NULLs in a unique column unless a NOT NULL constraint is also applied).
  // `users.id` also has .notNull(), so it behaves very much like an alternative key.
])


export const roleCreatorTypeEnum = pgEnum('creator_type_enum', ['SYSTEM', 'USER']);

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  applicationId: uuid('application_id').references(() => applications.id),
  permissions:
    text("permissions")
      .array()
      .$type<string[]>() // <- Drizzle-specific way to tell TypeScript that this column will be an array of strings in your application code (e.g., ["create_user", "delete_post", "view_analytics"]).
      .notNull(),

  creatorType: roleCreatorTypeEnum('creator_type').default('SYSTEM').notNull(),
  creatorUserId: uuid('creator_user_id'), // Nullable, will hold user's UUID

  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
  primaryKey({ // <- Composite Primary Key (multiple columns).
    columns: [
      table.name,  // <- Role name must be unique in a specific application.
      table.applicationId
    ],
    name: 'roles_pk'
  }),

  unique('roles_id_index') // <- // Unique Constraint
    .on(table.id), // <- `roles.id` is guaranteed to be globally unique.

  foreignKey({
    columns: [table.creatorUserId, table.applicationId],
    foreignColumns: [users.id, users.applicationId],  // References the new unique constraint in users
    name: 'roles_creator_user_fk'
  })
    .onDelete('no action') // If the creating user is deleted, set createdBy to NULL (role becomes system role)
    .onUpdate('no action'), // Or 'restrict'. Avoid 'cascade' for users.applicationId changes.
])


export const usersToRoles = pgTable('users_to_roles', { // <- This is a join table (A.K.A junction table) for the many to many relationship between users and roles. 
  applicationId: uuid('application_id').references(() => applications.id).notNull(),
  roleId: uuid('role_id').references(() => roles.id).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
}, (table) => [
  // Composite Primary Key (multiple columns).
  primaryKey({
    // The combination of `applicationId`, `roleId`, and `userId` must be unique for each row.
    columns: [table.applicationId, table.roleId, table.userId],
    name: 'user_roles_pk' // <- composite primary key for the users_to_roles table (applicationId, rolesId, userId)
  })
])

