# Multi-Tenant RBAC Fastify API Starter

A Fastify & Drizzle ORM starter for building multi-tenant RBAC APIs with TypeScript.

## Features

- **Multi-Tenant Architecture**: Built-in support for multiple `applications` (tenants) with isolated data and permissions
- **RBAC(Role-Based Access Control) System**: Flexible permission system with roles and scopes
- **Modern Tech Stack**:
  - Fastify v5
  - Drizzle ORM
  - PostgreSQL
  - TypeScript
  - Vitest
- **Production-Ready Features**:
  - Basic JWT-based authentication (no refresh token)
  - CORS configuration
  - Environment-based configuration
  - Database migrations (using Drizzle)
  - Graceful shutdown
  - Comprehensive logging (using pino)
  - Input validation with Zod
  - Configured an integration test environment with local PGLite database to simulate the real database.

## Prerequisites

- Node.js (v18 or higher)
- pnpm (v10.10.0)
- PostgreSQL database (or Neon serverless database)

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/Arshiash80/fastify-drizzle-multitenant-rbac-starter.git
   ```

2. **Install dependencies**

   ```bash
   # Navigate to the project directory
   cd fastify-drizzle-multitenant-rbac-starter

   # Install dependencies
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:

   ```env
   # Database
   DATABASE_CONNECTION_URL=postgresql://user:password@localhost:5432/dbname

   # JWT
   JWT_SECRET=your-secure-jwt-secret  # TIP: Generate using: openssl rand -hex 32

   # Server
   PORT=3000
   HOST=localhost
   NODE_ENV=development
   ```

   4. **Run database migrations**

   ```bash
   pnpm db:generate  # Generate migrations
   pnpm db:migrate   # Apply migrations.

   # --- OR ---

   # Just run `pnpm db:generate` and `pnpm dev`
   # This migrate the migrations automatically when the server starts.
   # Because of the following code in "./src/main.ts":

   if (env.NODE_ENV !== 'test') {
    app.log.info('Migrating database...')
    await migrate(db, { migrationsFolder: './migrations' });
    app.log.info('Database migrated.')
   }
   ```

4. **Start the development server**
   ```bash
   pnpm dev
   ```

## 🧪 Testing

The project includes both unit and integration tests:

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests only
pnpm test:integration

# Run tests with coverage
pnpm test:coverage

# Run tests with UI
pnpm test:ui
```

### Naming convention for tests:

```json
"test:unit": "vitest --project unit",
"test:integration": "vitest --project integration",
"test:coverage": "vitest run --coverage",
```

- **Unit tests**:
  - files with `*.unit.test.ts` suffix will be using the `./test/vitest.unit.test.setup.ts` setup file.
- **Integration tests**:
  - files with `*.integration.test.ts` suffix will be using the `./test/vitest.integration.test.setup.ts` setup file.

## Project Structure

```bash
.
├── migrations/                          # Database migrations
├── test/                               # Test setup and utilities
│   ├── unit-test-utils.ts              # Unit test utilities
│   ├── vitest.integration.test.setup.ts # Integration test setup
│   └── vitest.unit.test.setup.ts        # Unit test setup
├── src/
│   ├── main.ts                         # Application entry point
│   ├── config/                         # App-wide configurations
│   │   ├── env.ts                      # Environment variables. Use this to access the environment variables.
│   │   ├── permissions.ts              # RBAC permissions configuration.
│   │   └── server.ts                   # Server configuration (CORS, etc)
│   ├── utils/                          # Utility functions and server builder
│   │   ├── logger.ts                   # Fastify environment-based dynamic logger configuration
│   │   ├── server.integration.test.ts
│   │   └── server.ts                   # Server builder with configurations
│   ├── db/                             # Database setup and schema
│   │   ├── index.ts                    # Database connection
│   │   ├── schema.ts                   # Database schema (Drizzle)
│   │   └── __mock__/
│   │       └── index.ts                # PGLite database mock for integration tests
│   └── modules/                        # API modules
│       ├── applications/
│       │   ├── application.routes.ts                       # Application routes
│       │   ├── application.routes.integration.test.ts
│       │   ├── application.schemas.ts                      # Application zod schemas for input validation
│       │   ├── application.services.ts                     # Application services (database operations)
│       │   ├── application.services.integration.test.ts
│       │   ├── applications.controllers.ts                 # Application controllers (business logic)
│       │   └── applications.controllers.unit.test.ts
│       ├── roles/
│       │   ├── role.routes.ts                              # Role routes
│       │   ├── role.routes.integration.test.ts
│       │   ├── role.schemas.ts                             # Role zod schemas for input validation
│       │   ├── role.services.ts                            # Role services (database operations)
│       │   ├── roles.services.integration.test.ts
│       │   └── role.controllers.ts                         # Role controllers (business logic)
│       └── users/
│           ├── user.routes.ts                              # User routes
│           ├── user.routes.integration.test.ts             # User routes integration test
│           ├── user.schemas.ts                             # User zod schemas for input validation
│           ├── users.services.ts                           # Users services (database operations)
│           ├── user.services.integration.test.ts
│           ├── user.controllers.ts                         # User controllers (business logic)
│           └── user.controllers.unit.test.ts
├── vitest.config.ts                    # Main Vitest configuration
├── drizzle.config.ts                   # Drizzle ORM configuration
├── tsconfig.json                       # TypeScript configuration
└── package.json                        # Project dependencies and scripts
```

### Security Note

- **CORS Configuration**: Update the production origin in `src/utils/server.ts`:
  ```typescript
  app.register(cors, {
  	origin:
  		process.env.NODE_ENV === "production"
  			? ALLOWED_ORIGINS // <- Update this
  			: "*",
  	allowedHeaders: ["Content-Type", "Authorization"],
  });
  ```

## API Endpoints

### Applications (Tenants)

- `POST /api/applications` - Create a new application
- `GET /api/applications/:id` - Get application details

### Users

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - User login
- `GET /api/users/:id` - Get user details

### Roles

- `POST /api/roles` - Create a new role
- `GET /api/roles` - List roles
- `POST /api/roles/:id/assign` - Assign role to user

If you are using [REST Client](https://marketplace.cursorapi.com/items?itemName=humao.rest-client) extension in VSCode, you can copy the following and put it in a `test.http` file to test the API endpoints.

```http
### -------------------------------------
### 🌐 ENVIRONMENT VARIABLES
### -------------------------------------

@jwtToken = jwtt-token-that-you-get-from-the-login-response
@applicationId = application-id
@userId = user-id
@userEmail = contact@arshiash80.com
@userPassword = SuperStrongPasswrod123


### -------------------------------------
### 🏢 APPLICATIONS
### -------------------------------------

### ➕ Create Application
POST http://localhost:3000/api/applications
Content-Type: application/json

{
  "name": "Hello World App"
}

### 📄 Get All Applications
GET http://localhost:3000/api/applications


### -------------------------------------
### 👤 USERS
### -------------------------------------

### 👤 Create Initial User (First user in app)
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "applicationId": "{{applicationId}}",
  "name": "Arshia",
  "email": "{{userEmail}}",
  "password": "{{userPassword}}",
  "initialUser": true
}

### ➕ Create Additional User
POST http://localhost:3000/api/users
Content-Type: application/json

{
  "applicationId": "{{applicationId}}",
  "name": "Test User",
  "email": "test@test.com",
  "password": "123456"
}

### 🔑 Login User
POST http://localhost:3000/api/users/login
Content-Type: application/json

{
  "applicationId": "{{applicationId}}",
  "email": "{{userEmail}}",
  "password": "{{userPassword}}"
}


### -------------------------------------
### 🔐 ROLES
### -------------------------------------

### ➕ Create Role
POST http://localhost:3000/api/roles
Content-Type: application/json
Authorization: Bearer {{jwtToken}}

{
  "name": "Post Moderator",
  "permissions": [
    "posts:delete",
    "posts:edit-own"
  ]
}

### 👥 Assign Role to User
POST http://localhost:3000/api/users/roles
Content-Type: application/json
Authorization: Bearer {{jwtToken}}

{
  "roleId": "ecb62d3f-4c69-40b7-811f-35943104ccf5",
  "userId": "{{userId}}"
}
```

### Database Migrations

Migrations are managed using Drizzle Kit:

```bash
# Generate migrations
# You will only need this command to generate migrations.
# The rest of the commands are for development and testing.
pnpm db:generate

# Apply migrations
pnpm db:migrate

# Push schema changes (development only)
pnpm db:push
```

## Deployment

1. Set up your production environment variables
2. Run database migrations
3. Build and start the application:
   ```bash
   pnpm build
   pnpm start
   ```

## 📚 Learning Resources

- [Build a Multi-Tenanted, Role-Based Access Control System - TomDoesTech](https://youtu.be/b6VhN_HHDiQ?si=THDnRvT_ARlaQ-D9)
- [Fastify Documentation](https://www.fastify.io/docs/latest/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)

## What i learned ?

- How to create a multi tenant application
- How to create a role based access control system
- Some basic relational database concepts
- Finally a nice and neat file structure for backend services that i actually like
- Fastify v5 (Loved it)
- RESTful API design
- How to use Drizzle ORM
- Writing unit and integration tests for the first time.
