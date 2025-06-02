import type { FastifyReply, FastifyRequest } from "fastify";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AssignRoleToUserBody, CreateUserBody, LoginUserBody } from "./user.schemas";
// Import all as userService
import { ALL_PERMISSIONS, SYSTEM_ROLES, USER_ROLE_PERMISSIONS } from "../../config/permissions";
import { assignRoleToUserHandler, createUserHandler, loginUserHandler } from "./user.controllers";
import { assignRoleToUser, createUser, getUserByEmail, getUsersByApplicationId } from "./users.services";
import { getRoleByName } from "../roles/role.services";
import { sign } from "jsonwebtoken";
import { createMockFastifyObjects } from "../../../test/unit-test-utils";


// -- Mock The Services ---
vi.mock(import("./users.services"));
vi.mock(import("../roles/role.services"));

// --- Mock jsonwebtoken ---
vi.mock('jsonwebtoken', () => ({
  sign: vi.fn(), // mock 'sign' as a Vitest mock function
}));

describe("User Controllers", () => {

  const fakeApplicationId = 'app-id-123'
  const fakeUserId = 'user-id-123'
  const fakeRoleId = 'role-id-123'
  const fakePassword = '123'

  const fakeAdminEmail = 'admin@demo.com'
  const fakeAdminName = 'Admin User'

  const fakeAppUserEmail = 'app-user@demo.com'
  const fakeAppUserName = 'App User'




  describe("Create User", () => {
    it("should be able to create initial user successfully", async () => {
      // MARK: 1. Arrange - Mock the services
      const { request, reply } = createMockFastifyObjects<CreateUserBody>({
        request: {
          body: {
            applicationId: fakeApplicationId,
            email: fakeAdminEmail,
            name: fakeAdminName,
            password: fakePassword,
            initialUser: true, // <- Makes the user super admin
          }
        }
      })

      // Mock service responses
      vi.mocked(getUsersByApplicationId).mockResolvedValue([]) // No existing users
      vi.mocked(getRoleByName).mockResolvedValue({
        applicationId: fakeApplicationId,
        id: fakeRoleId,
        name: SYSTEM_ROLES.SUPER_ADMIN,
        permissions: [...ALL_PERMISSIONS],
        creatorType: "SYSTEM",
        creatorUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(createUser).mockResolvedValue({
        id: fakeUserId,
        email: fakeAdminEmail,
        name: fakeAdminName,
        applicationId: fakeApplicationId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      vi.mocked(assignRoleToUser).mockResolvedValue({
        applicationId: fakeApplicationId,
        userId: fakeUserId,
        roleId: fakeRoleId
      })

      // MARK: 2. Act - Call the controller
      await createUserHandler(request, reply);

      // MARK: 3. Assert - Check the results
      // Check if getUserByApplicationId was called correctly
      expect(getUsersByApplicationId).toHaveBeenCalledWith({
        applicationId: fakeApplicationId
      })

      // Check if getRoleByName was called correctly
      expect(getRoleByName).toHaveBeenCalledWith({
        name: SYSTEM_ROLES.SUPER_ADMIN,
        applicationId: fakeApplicationId,
      })

      // Check if createUser was called correctly
      expect(createUser).toHaveBeenCalledWith({
        applicationId: fakeApplicationId,
        email: fakeAdminEmail,
        name: fakeAdminName,
        password: fakePassword,
      })

      // Check if assignRoleToUser was called correctly
      expect(assignRoleToUser).toHaveBeenCalledWith({
        applicationId: fakeApplicationId,
        userId: fakeUserId,
        roleId: fakeRoleId
      })

      // Check if reply.code and reply.send were called with the correct status and data
      expect(reply.code).toHaveBeenCalledWith(201)
      expect(reply.send).toHaveBeenCalledWith({
        data: {
          user: {
            id: fakeUserId,
            applicationId: fakeApplicationId,
            email: fakeAdminEmail,
            name: fakeAdminName,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
          role: {
            id: fakeRoleId,
            name: SYSTEM_ROLES.SUPER_ADMIN,
            applicationId: fakeApplicationId,
            permissions: [...ALL_PERMISSIONS],
            creatorType: "SYSTEM",
            creatorUserId: null,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date)
          },
        },
        message: 'User created',
        extensions: {
          code: 'USER_CREATED',
        },
      })

    })


    it("should not be able to create another initial user", async () => {
      // MARK: 1. Arrange - Mock the services
      const { request, reply } = createMockFastifyObjects<CreateUserBody>({
        request: {
          body: {
            applicationId: fakeApplicationId,
            email: "user@demo.com",
            name: "User",
            password: fakePassword,
            initialUser: true,
          }
        }
      })

      // Mock the service so it returns a user array 
      // for the application that supposed to have no users 
      // to be able to create a initial user
      vi.mocked(getUsersByApplicationId).mockResolvedValue([{
        id: fakeUserId,
        email: "user@demo.com",
        name: "User",
        createdAt: new Date(),
        updatedAt: new Date(),
      }])

      // MARK: 2. Act - Call the controller
      await createUserHandler(
        request,
        reply
      );

      // MARK: 3. Assert - Check the results
      expect(reply.code).toHaveBeenCalledWith(400)
      expect(reply.send).toHaveBeenCalledWith({
        message: 'An initial super admin user already exists for this application.',
        extensions: {
          code: 'SUPER_ADMIN_ALREADY_EXISTS',
          applicationId: fakeApplicationId,
        },
      })
    })

    it("should be able to create a app user", async () => {
      // MARK: 1. Arrange - Mock the services
      const { request, reply } = createMockFastifyObjects<CreateUserBody>({
        request: {
          body: {
            applicationId: fakeApplicationId,
            email: fakeAppUserEmail,
            name: fakeAppUserName,
            password: fakePassword,
          }
        }
      })

      // mock the service so it returns a valid system role for the application user
      vi.mocked(getRoleByName).mockResolvedValue(
        {
          id: fakeRoleId,
          name: SYSTEM_ROLES.APPLICATION_USER,
          applicationId: fakeApplicationId,
          permissions: USER_ROLE_PERMISSIONS,
          creatorType: "SYSTEM",
          creatorUserId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      )
      // Mock the service so it returns a valid user as a successfully created user
      vi.mocked(createUser).mockResolvedValue({
        id: fakeUserId,
        applicationId: fakeApplicationId,
        email: fakeAppUserEmail,
        name: fakeAppUserName,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      // Mock the service so it returns a valid role assignment for the user
      vi.mocked(assignRoleToUser).mockResolvedValue({
        applicationId: fakeApplicationId,
        userId: fakeUserId,
        roleId: fakeRoleId
      })

      // MARK: 2. Act - Call the controller
      await createUserHandler(
        request,
        reply
      );

      // MARK: 3. Assert - Check the results
      // Check if getRoleByName was called correctly
      expect(getRoleByName).toHaveBeenCalledWith({
        name: SYSTEM_ROLES.APPLICATION_USER,
        applicationId: fakeApplicationId,
      })

      // Check if createUser was called correctly
      expect(createUser).toHaveBeenCalledWith({
        applicationId: fakeApplicationId,
        email: fakeAppUserEmail,
        name: fakeAppUserName,
        password: '123'
      })

      // Check if assignRoleToUser was called correctly
      expect(assignRoleToUser).toHaveBeenCalledWith({
        applicationId: fakeApplicationId,
        userId: fakeUserId,
        roleId: fakeRoleId
      })

      // Check if reply.code and reply.send were called with the correct status and data
      expect(reply.code).toHaveBeenCalledWith(201)
      expect(reply.send).toHaveBeenCalledWith({
        data: {
          user: {
            id: fakeUserId,
            applicationId: fakeApplicationId,
            email: fakeAppUserEmail,
            name: fakeAppUserName,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
          role: {
            id: fakeRoleId,
            name: SYSTEM_ROLES.APPLICATION_USER,
            applicationId: fakeApplicationId,
            permissions: USER_ROLE_PERMISSIONS,
            creatorType: "SYSTEM",
            creatorUserId: null,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
          }
        },
        message: 'User created',
        extensions: {
          code: 'USER_CREATED',
        },
      })
    })
  })


  describe("Login User", () => {
    it("should be able to login with admin user", async () => {
      // MARK: 1. Arrange - Mock the services
      // mock the jwt sign function to return a fake token
      vi.mocked(sign).mockReturnValue("fake-token" as any);
      // Mock the service so it returns a valid user for the application 
      vi.mocked(getUserByEmail).mockResolvedValue({
        permissions: [...ALL_PERMISSIONS],
        id: fakeUserId,
        applicationId: fakeApplicationId,
        email: fakeAdminEmail,
        name: fakeAdminName,
        createdAt: new Date(),
      })

      const { request, reply } = createMockFastifyObjects<LoginUserBody>({
        request: {
          body: {
            applicationId: fakeApplicationId,
            email: fakeAdminEmail,
            password: fakePassword,
          }
        }
      })

      // MARK: 2. Act - Call the controller
      await loginUserHandler(
        request,
        reply
      )

      // MARK: 3. Assert - Check the results
      // Check if getUserByEmail was called with the correct arguments
      expect(getUserByEmail).toHaveBeenCalledWith({
        applicationId: fakeApplicationId,
        email: fakeAdminEmail,
        password: fakePassword,
      })

      // Check if sign was called with the correct arguments
      expect(sign).toHaveBeenCalledWith({
        id: fakeUserId,
        email: fakeAdminEmail,
        applicationId: fakeApplicationId,
        scopes: [...ALL_PERMISSIONS],
      }, "secret")



      // Check if reply.code and reply.send were called with the correct status and data
      expect(reply.code).toHaveBeenCalledWith(200)
      expect(reply.send).toHaveBeenCalledWith({
        data: {
          token: 'fake-token'
        },
        message: 'User logged in',
        extensions: {
          code: 'USER_LOGGED_IN',
        },
      })
    })


    it("should be able to login with app user", async () => {
      // MARK: 1. Arrange - Mock the services
      // Mock the jwt sign function to return a fake token
      vi.mocked(sign).mockReturnValue("fake-token" as any);
      // Mock the service so it returns a valid user for the application
      vi.mocked(getUserByEmail).mockResolvedValue({
        id: fakeUserId,
        applicationId: fakeApplicationId,
        permissions: USER_ROLE_PERMISSIONS,
        email: fakeAppUserEmail,
        name: fakeAppUserName,
        createdAt: new Date(),
      })

      const { request, reply } = createMockFastifyObjects<LoginUserBody>({
        request: {
          body: {
            applicationId: fakeApplicationId,
            email: fakeAppUserEmail,
            password: fakePassword,
          }
        }
      })




      // MARK: 2. Act - Call the controller
      await loginUserHandler(
        request,
        reply
      )

      // MARK: 3. Assert - Check the results
      // Check if getUserByEmail was called with the correct arguments
      expect(getUserByEmail).toHaveBeenCalledWith({
        applicationId: fakeApplicationId,
        email: fakeAppUserEmail,
        password: fakePassword,
      })

      // Check if sign was called with the correct arguments
      expect(sign).toHaveBeenCalledWith({
        id: fakeUserId,
        email: fakeAppUserEmail,
        applicationId: fakeApplicationId,
        scopes: USER_ROLE_PERMISSIONS,
      }, "secret")

      // Check if reply.code and reply.send were called with the correct status and data
      expect(reply.code).toHaveBeenCalledWith(200)
      expect(reply.send).toHaveBeenCalledWith({
        data: {
          token: 'fake-token'
        },
        message: 'User logged in',
        extensions: {
          code: 'USER_LOGGED_IN',
        },
      })

    })


    it("should not be able to login with invalid credentials", async () => {
      // MARK: 1. Arrange - Mock the services
      // Mock the service so it returns null for the user (invalid credentials)
      vi.mocked(getUserByEmail).mockResolvedValue(null)

      const { request, reply } = createMockFastifyObjects<LoginUserBody>({
        request: {
          body: {
            applicationId: fakeApplicationId,
            email: fakeAppUserEmail,
            password: fakePassword,
          }
        }
      })



      // MARK: 2. Act - Call the controller 
      await loginUserHandler(
        request,
        reply
      )

      // MARK: 3. Assert - Check the results
      expect(reply.code).toHaveBeenCalledWith(401)
      expect(reply.send).toHaveBeenCalledWith({
        message: 'Invalid credentials',
        extensions: {
          code: 'INVALID_CREDENTIALS',
        },
      })
    })
  })

  describe("Assign Role To User", () => {
    it("admin should be able to assign a role to a user", async () => {
      // MARK: 1. Arrange - Mock the services
      // Mock the service so it returns a valid role assignment for the user
      vi.mocked(assignRoleToUser).mockResolvedValue({
        applicationId: fakeApplicationId,
        roleId: fakeRoleId,
        userId: fakeUserId,
      })

      const { request, reply } = createMockFastifyObjects<AssignRoleToUserBody>({
        request: {
          body: {
            userId: fakeUserId,
            roleId: fakeRoleId,
          },
          user: {
            applicationId: fakeApplicationId,
            id: fakeUserId,
            scopes: [...ALL_PERMISSIONS],
          }
        }
      })


      // MARK: 2. Act - Call the controller 
      await assignRoleToUserHandler(
        request,
        reply
      )

      // MARK: 3. Assert - Check the results
      expect(assignRoleToUser).toHaveBeenCalledWith({
        applicationId: fakeApplicationId,
        roleId: fakeRoleId,
        userId: fakeUserId,
      })

      expect(reply.code).toHaveBeenCalledWith(200)
      expect(reply.send).toHaveBeenCalledWith({
        data: {
          applicationId: fakeApplicationId,
          roleId: fakeRoleId,
          userId: fakeUserId,
        },
        message: 'Role assigned to user',
        extensions: {
          code: 'ROLE_ASSIGNED_TO_USER',
        },
      })
    })
  })

})