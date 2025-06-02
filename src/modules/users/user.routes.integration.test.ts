import supertest from "supertest";
import { describe, it, expect, beforeEach, afterAll, beforeAll, vi } from "vitest";
import { testApp } from "../../../test/vitest.integration.test.setup";
import { db } from "../../db";
import { applications, roles, users, usersToRoles } from "../../db/schema";
import { ALL_PERMISSIONS, PERMISSIONS, SYSTEM_ROLES, USER_ROLE_PERMISSIONS } from "../../config/permissions"
import { CreateUserBody, LoginUserBody } from "./user.schemas";
import { verify } from "jsonwebtoken";
import { hash } from "argon2";
import { getUserByEmail } from "./users.services";

describe("User Routes", () => {

  let applicationId: string
  let superAdminRoleId: string
  let applicationUserRoleId: string



  beforeEach(async () => {
    const [application] = await db
      .insert(applications)
      .values({
        name: "Test Application",
      })
      .returning({ id: applications.id });

    expect(application.id).toBeDefined()

    // Create Super Admin Role
    const [superAdminRole] = await db
      .insert(roles)
      .values({
        name: SYSTEM_ROLES.SUPER_ADMIN,
        permissions: [...ALL_PERMISSIONS],
        applicationId: application.id,
      })
      .returning({ id: roles.id });

    expect(superAdminRole.id).toBeDefined()

    // Create Application User Role
    const [applicationUserRole] = await db
      .insert(roles)
      .values({
        name: SYSTEM_ROLES.APPLICATION_USER,
        permissions: [...USER_ROLE_PERMISSIONS],
        applicationId: application.id,
      })
      .returning({ id: roles.id });

    expect(applicationUserRole.id).toBeDefined()

    applicationId = application.id;
    superAdminRoleId = superAdminRole.id;
    applicationUserRoleId = applicationUserRole.id;
  })

  it("should create initial user ", async () => {
    // MARK: Arrange 
    const initialUserBody: CreateUserBody = {
      applicationId,
      email: "test@test.com",
      password: "password",
      name: "Test User",
      initialUser: true
    }

    // MARK: Act
    const response = await supertest(testApp.server)
      .post("/api/users")
      .send(initialUserBody)
      .expect(201)


    // MARK: Assert
    const user = response.body.data.user
    const role = response.body.data.role

    expect(user.id).toBeDefined()
    expect(user.email).toBe("test@test.com")
    expect(user.name).toBe("Test User")
    expect(user.applicationId).toBe(applicationId)

    expect(role.id).toBe(superAdminRoleId)
    expect(role.name).toBe(SYSTEM_ROLES.SUPER_ADMIN)
    expect(role.permissions).toEqual([...ALL_PERMISSIONS])
    expect(role.applicationId).toBe(applicationId)
  })

  it("should not be able to create another initial user", async () => {
    // MARK: Arrange 
    // Create an initial user for the application
    const [validInitialUser] = await db.insert(users).values({
      email: "test@test.com",
      name: "Test User",
      password: "password",
      applicationId,
    }).returning({ id: users.id })
    // Assign the super admin role to the initial user
    await db.insert(usersToRoles).values({
      userId: validInitialUser.id,
      roleId: superAdminRoleId,
      applicationId,
    })

    const invalidInitialUserBody: CreateUserBody = {
      applicationId,
      email: "test2@test.com",
      password: "password",
      name: "Test User 2",
      initialUser: true // <- This should cause the request to fail. 
    }

    // MARK: Act
    const response = await supertest(testApp.server)
      .post("/api/users")
      .send(invalidInitialUserBody)

    // MARK: Assert
    expect(response.status).toBe(400)
    expect(response.body.message).toBe("An initial super admin user already exists for this application.")
    expect(response.body.extensions.code).toBe("SUPER_ADMIN_ALREADY_EXISTS")
    expect(response.body.extensions.applicationId).toBe(applicationId)
  })


  it("should create a new application user", async () => {
    // MARK: Arrange 
    const appUserBody: CreateUserBody = {
      applicationId,
      email: "test@test.com",
      password: "password",
      name: "Test User",
    }

    // MARK: Act
    const response = await supertest(testApp.server)
      .post("/api/users")
      .send(appUserBody)

    // MARK: Assert
    const user = response.body.data.user
    const role = response.body.data.role

    expect(response.status).toBe(201)
    expect(user.id).toBeDefined()
    expect(user.email).toBe("test@test.com")
    expect(user.name).toBe("Test User")
    expect(user.applicationId).toBe(applicationId)

    expect(role.id).toBe(applicationUserRoleId)
    expect(role.name).toBe(SYSTEM_ROLES.APPLICATION_USER)
    expect(role.permissions).toEqual([...USER_ROLE_PERMISSIONS])
    expect(role.applicationId).toBe(applicationId)
  })


  it("should login with super admin user", async () => {
    // MARK: Arrange 
    // Create an initial user (super admin)
    const hashedPassword = await hash("password")
    const [superAdminUser] = await db.insert(users).values({
      email: "test@test.com",
      name: "Test User",
      password: hashedPassword,
      applicationId,
    }).returning({ id: users.id })
    // Assign the super admin role to the initial user
    await db.insert(usersToRoles).values({
      applicationId,
      roleId: superAdminRoleId,
      userId: superAdminUser.id,
    })

    const loginBody: LoginUserBody = {
      applicationId,
      email: "test@test.com",
      password: "password",
    }

    // MARK: Act
    const response = await supertest(testApp.server)
      .post("/api/users/login")
      .send(loginBody)

    // MARK: Assert
    const token = response.body.data.token
    expect(response.status).toBe(200)
    expect(token).toBeDefined()

    // Cjeck of the token is valid
    const decodedToken = verify(token, "secret") as { id: string, email: string, applicationId: string, scopes: string[] }
    expect(decodedToken.id).toBe(superAdminUser.id)
    expect(decodedToken.email).toBe("test@test.com")
    expect(decodedToken.applicationId).toBe(applicationId)
    expect(decodedToken.scopes).toEqual([...ALL_PERMISSIONS])
  })



  it("should login with app user", async () => {
    // MARK: Arrange 
    // Create an application user
    const hashedPassword = await hash("password")
    const [appUser] = await db.insert(users).values({
      applicationId,
      email: "test@test.com",
      name: "Test User",
      password: hashedPassword,
    }).returning({ id: users.id })
    // Assign the application user role to the application user
    await db.insert(usersToRoles).values({
      applicationId,
      roleId: applicationUserRoleId,
      userId: appUser.id,
    })

    const loginBody: LoginUserBody = {
      applicationId,
      email: "test@test.com",
      password: "password",
    }


    // MARK: Act
    const response = await supertest(testApp.server)
      .post("/api/users/login")
      .send(loginBody)

    // MARK: Assert
    const token = response.body.data.token
    expect(response.status).toBe(200)
    expect(token).toBeDefined()

    // Check of the token is valid
    const decodedToken = verify(token, "secret") as { id: string, email: string, applicationId: string, scopes: string[] }
    expect(decodedToken.id).toBe(appUser.id)
    expect(decodedToken.email).toBe("test@test.com")
    expect(decodedToken.applicationId).toBe(applicationId)
    expect(decodedToken.scopes).toEqual([...USER_ROLE_PERMISSIONS])
  })


  it("should not login with invalid credentials", async () => {
    // MARK: Arrange 
    const loginBody: LoginUserBody = {
      applicationId,
      email: "invalid@test.com",
      password: "invalid",
    }

    // MARK: Act
    const response = await supertest(testApp.server)
      .post("/api/users/login")
      .send(loginBody)

    // MARK: Assert
    expect(response.status).toBe(401)
    expect(response.body.message).toBe("Invalid credentials")
    expect(response.body.extensions.code).toBe("INVALID_CREDENTIALS")
  })


  it("admin user should assign a role to a app user", async () => {
    // MARK: Arrange 
    const hashedPassword = await hash("password")

    // Create an admin user 
    const [adminUser] = await db.insert(users).values({
      email: "admin@test.com",
      name: "Admin User",
      password: hashedPassword,
      applicationId,
    }).returning({ id: users.id })
    // Assign the super admin role to the admin user
    await db.insert(usersToRoles).values({
      applicationId,
      roleId: superAdminRoleId,
      userId: adminUser.id,
    })

    // Login admin user
    const loginBody: LoginUserBody = {
      applicationId,
      email: "admin@test.com",
      password: "password",
    }
    const loginResponse = await supertest(testApp.server)
      .post("/api/users/login")
      .send(loginBody)
    const adminUserToken = loginResponse.body.data.token

    // Create a test role to assign to the app user
    const testRolePermissions = [
      PERMISSIONS["roles:write"],
      PERMISSIONS["roles:read"],
      PERMISSIONS["roles:delete"],
    ]
    const [testRole] = await db.insert(roles).values({
      name: "Test Role",
      permissions: testRolePermissions,
      applicationId,
    }).returning({ id: roles.id })


    // Create an app user 
    const [appUser] = await db.insert(users).values({
      email: "app@test.com",
      name: "App User",
      password: hashedPassword,
      applicationId,
    }).returning({ id: users.id })
    // Assign the application user role to the app user
    await db.insert(usersToRoles).values({
      applicationId,
      roleId: applicationUserRoleId,
      userId: appUser.id,
    })

    // MARK: Act
    const response = await supertest(testApp.server)
      .post("/api/users/roles")
      .set("Authorization", `Bearer ${adminUserToken}`)
      .send({
        userId: appUser.id,
        roleId: testRole.id,
      })

    // MARK: Assert
    expect(response.status).toBe(200)
    expect(response.body.data.applicationId).toBe(applicationId)
    expect(response.body.data.userId).toBe(appUser.id)
    expect(response.body.data.roleId).toBe(testRole.id)

    // Get the user with the new permissions and check if the permissions are correct
    const user = await getUserByEmail({
      applicationId,
      email: "app@test.com",
      password: "password",
    })
    const expectedPermissionsSet = new Set([...testRolePermissions, ...USER_ROLE_PERMISSIONS,]);
    const actualPermissionsSet = new Set(user?.permissions || []);
    expect(actualPermissionsSet).toEqual(expectedPermissionsSet)


  })

  it("Users without the required permissions should not be able to assign a role to a user", async () => {
    // MARK: Arrange 
    const hashedPassword = await hash("password")
    // create a user which does not have the assign role permission
    const [userWithoutRequiredPermissions] = await db.insert(users).values({
      email: "user@test.com",
      name: "User",
      password: hashedPassword,
      applicationId,
    }).returning({
      id: users.id
    })
    // Create a role that does not have the assign role permission
    const [roleWithoutRequiredPermissions] = await db.insert(roles).values({
      applicationId,
      name: "Role Without Required Permissions",
      permissions: [
        PERMISSIONS["roles:read"],
        PERMISSIONS["roles:delete"],
      ],
    }).returning({
      id: roles.id
    })
    // Assign the role to the user 
    await db.insert(usersToRoles).values({
      applicationId,
      roleId: roleWithoutRequiredPermissions.id,
      userId: userWithoutRequiredPermissions.id,
    })

    // Login the user
    const loginBody: LoginUserBody = {
      applicationId,
      email: "user@test.com",
      password: "password",
    }
    const loginResponse = await supertest(testApp.server)
      .post("/api/users/login")
      .send(loginBody)
    const userWithoutRequiredPermissionsToken = loginResponse.body.data.token

    // Create a test role to assign to the test user
    const [testRole] = await db.insert(roles).values({
      applicationId,
      name: "Test Role",
      permissions: [
        PERMISSIONS["roles:write"],
      ],
    }).returning({
      id: roles.id
    })

    // Create a test user to assign a role to
    const [testUser] = await db.insert(users).values({
      email: "test@test.com",
      name: "Test User",
      password: hashedPassword,
      applicationId,
    }).returning({ id: users.id })
    // Assign the application user role to the test user
    await db.insert(usersToRoles).values({
      applicationId,
      roleId: applicationUserRoleId,
      userId: testUser.id,
    })

    // MARK: Act
    const response = await supertest(testApp.server)
      .post("/api/users/roles")
      .set("Authorization", `Bearer ${userWithoutRequiredPermissionsToken}`)
      .send({
        userId: testUser.id,
        roleId: roleWithoutRequiredPermissions.id,
      })

    // MARK: Assert
    expect(response.status).toBe(401)
    expect(response.body.message).toBe("Unauthorized")
    expect(response.body.extensions.code).toBe("UNAUTHORIZED")
  })
})