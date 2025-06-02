import { describe, expect, it } from "vitest";
import { assignRoleToUser, createUser, getUserByEmail, getUsersByApplicationId } from "./users.services";
import { randomUUID } from "crypto";
import { createApplication } from "../applications/application.services";
import { createRole } from "../roles/role.services";
import { ALL_PERMISSIONS, USER_ROLE_PERMISSIONS, SYSTEM_ROLES, PERMISSIONS } from "../../config/permissions";



describe("User Services", () => {



  describe("createUser", () => {
    it("should be able to create a user with a valid applicationId", async () => {
      // MARK: Arrange
      const application = await createApplication({ name: "Test Application" })

      // MARK: Act
      const user = await createUser({
        email: "test@test.com",
        password: "password",
        name: "Test User",
        applicationId: application.id,
      })

      // MARK: Assert
      expect(user.id).toBeDefined()
      expect(user.email).toBe("test@test.com")
      expect(user.name).toBe("Test User")
      expect(user.applicationId).toBe(application.id)
    })


    it('should not be able to create a user with an invalid applicationId', async () => {
      // MARK: Arrange
      let thrownError: any;
      try {
        // MARK: Act
        await createUser({
          email: "test@test.com",
          password: "password",
          name: "Test User",
          applicationId: randomUUID(),
        })
      } catch (error) {
        thrownError = error
      }

      // MARK: Assert
      expect(thrownError).toBeDefined()
      // 23503: Standard SQLSTATE for foreign_key_violation
      expect(thrownError.code).toBe('23503');
    })
  })

  describe("getUsersByApplicationId", () => {
    it("should be able to get users by applicationId", async () => {
      // MARK: Arrange
      const application = await createApplication({ name: "Test Application" })
      const user1 = await createUser({
        email: "test@test.com",
        password: "password",
        name: "Test User",
        applicationId: application.id,
      })
      const user2 = await createUser({
        email: "test2@test.com",
        password: "password",
        name: "Test User 2",
        applicationId: application.id,
      })

      // MARK: Act
      const users = await getUsersByApplicationId({ applicationId: application.id })

      // MARK: Assert
      expect(users).toBeDefined()
      expect(users.length).toBe(2)
      const returnedUserIds = users.map(u => u.id);
      expect(returnedUserIds).toContain(user1.id);
      expect(returnedUserIds).toContain(user2.id);
    })

    it("should not be able to get users by an invalid applicationId", async () => {
      // MARK: Act
      const users = await getUsersByApplicationId({ applicationId: randomUUID() })

      // MARK: Assert
      expect(users).toBeDefined()
      expect(users.length).toBe(0)
    })
  })

  describe("getUserByEmail", () => {
    it('should be able to get a user by email', async () => {
      // MARK: Arrange
      const application = await createApplication({ name: "Test Application" })
      const user = await createUser({
        email: "test@test.com",
        name: "Test User",
        password: "password",
        applicationId: application.id,
      })
      const superAdminRole = await createRole({
        name: SYSTEM_ROLES.SUPER_ADMIN,
        permissions: [...ALL_PERMISSIONS],
        applicationId: application.id,
      })
      await assignRoleToUser({
        applicationId: application.id,
        roleId: superAdminRole.id,
        userId: user.id,
      })


      // MARK: Act
      const returnedUser = await getUserByEmail({
        applicationId: application.id,
        email: "test@test.com",
        password: "password"
      })

      // MARK: Assert
      expect(returnedUser).toBeDefined()
      expect(returnedUser?.id).toBe(user.id)
      expect(returnedUser?.email).toBe(user.email)
      expect(returnedUser?.name).toBe(user.name)
      expect(returnedUser?.applicationId).toBe(user.applicationId)

      expect(returnedUser?.permissions).toEqual([...ALL_PERMISSIONS])
      expect(returnedUser?.createdAt).toBeDefined()
    })

    it("should be able to get a user by email if the user has multiple roles", async () => {
      // MARK: Arrange
      const application = await createApplication({ name: "Test Application" })
      const user = await createUser({
        email: "test@test.com",
        name: "Test User",
        password: "password",
        applicationId: application.id,
      })


      const createRolesPromises = await Promise.allSettled([
        createRole({
          name: "Random Role 1",
          permissions: [
            PERMISSIONS["users:roles:write"],
            PERMISSIONS["posts:write"],
            PERMISSIONS["posts:read"],
          ],
          applicationId: application.id,
        }),
        createRole({
          name: "Random Role 2",
          permissions: [
            PERMISSIONS["posts:delete"],
          ],
          applicationId: application.id,
        }),
        createRole({
          name: SYSTEM_ROLES.APPLICATION_USER,
          permissions: [...USER_ROLE_PERMISSIONS],
          applicationId: application.id,
        })
      ])

      const fulfilledRoles = createRolesPromises.filter(r => r.status === 'fulfilled')
      if (fulfilledRoles.length !== 3) throw new Error('Failed to create roles')
      const createdRoles = fulfilledRoles.map(r => r.value)


      const assignRolesPromises = await Promise.allSettled(createdRoles.map(r => assignRoleToUser({
        applicationId: application.id,
        roleId: r.id,
        userId: user.id,
      })))

      if (assignRolesPromises.some(r => r.status !== 'fulfilled')) throw new Error('Failed to assign roles')
      const fulfilledAssignRoles = assignRolesPromises.filter(r => r.status === 'fulfilled')
      if (fulfilledAssignRoles.length !== 3) throw new Error('Failed to assign roles')


      // MARK: Act
      const returnedUser = await getUserByEmail({
        applicationId: application.id,
        email: "test@test.com",
        password: "password"
      })

      // MARK: Assert 
      expect(returnedUser).toBeDefined()
      expect(returnedUser?.id).toBe(user.id)
      expect(returnedUser?.email).toBe(user.email)
      expect(returnedUser?.name).toBe(user.name)
      expect(returnedUser?.applicationId).toBe(user.applicationId)

      const expectedPermissionsSet = new Set(createdRoles.map(r => r.permissions).flat());
      const actualPermissionsSet = new Set(returnedUser?.permissions || []);
      expect(actualPermissionsSet).toEqual(expectedPermissionsSet)
    })

    it("should not be able to get user by email if the password is incorrect", async () => {
      // MARK: Arrange
      const application = await createApplication({ name: "Test Application" })
      await createUser({
        email: "test@test.com",
        name: "Test User",
        password: "password",
        applicationId: application.id,
      })

      // MARK: Act
      const returnedUser = await getUserByEmail({
        applicationId: application.id,
        email: "test@test.com",
        password: "wrong-password"
      })

      // MARK: Assert
      expect(returnedUser).toBeNull()
    })

    it("should not be able to get user by email if the user does not exist", async () => {
      // MARK: Arrange
      const application = await createApplication({ name: "Test Application" })

      // MARK: Act
      const returnedUser = await getUserByEmail({
        applicationId: application.id,
        email: "test@test.com",
        password: "password"
      })

      // MARK: Assert
      expect(returnedUser).toBeNull()
    })

    it("should not be able to get user by email if applicationId is invalid", async () => {
      // MARK: Arrange
      const application = await createApplication({ name: "Test Application" })
      await createUser({
        email: "test@test.com",
        name: "Test User",
        password: "password",
        applicationId: application.id,
      })

      // MARK: Act
      const returnedUser = await getUserByEmail({
        applicationId: randomUUID(), // <- invalid applicationId 
        email: "test@test.com",
        password: "password"
      })

      // MARK: Assert
      expect(returnedUser).toBeNull()
    })
  })

})