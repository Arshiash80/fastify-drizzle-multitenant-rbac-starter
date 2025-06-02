
import { describe, it, expect } from "vitest"
import { createRole, getRoleByName } from "./role.services"
import { db } from "../../db/__mock__"
import { applications, roles, users } from "../../db/schema"
import { PERMISSIONS } from "../../config/permissions"


describe('Role Services', () => {
  it('system should be able tocreate a role with some permissions', async () => {
    // MARK: Arrange 
    // Create an application for the role 
    const [application] = await db.insert(applications).values({
      name: 'Test Application',
    }).returning({
      id: applications.id
    })


    // MARK: Act
    const result = await createRole({
      name: 'Test Role',
      applicationId: application.id,
      permissions: [
        PERMISSIONS["posts:delete"],
        PERMISSIONS["posts:read"],
      ],
      creatorType: "SYSTEM",
    })


    // MARK: Assert
    expect(result.id).toBeDefined()
    const expectedPermissions = new Set([
      PERMISSIONS["posts:delete"],
      PERMISSIONS["posts:read"],
    ])
    const actualPermissions = new Set(result.permissions)
    expect(actualPermissions).toEqual(expectedPermissions)
    expect(result.creatorType).toEqual("SYSTEM")
    expect(result.applicationId).toEqual(application.id)
    expect(result.creatorUserId).toBeNull()
  })

  it("user should be able to create a role with some permissions", async () => {
    // MARK: Arrange 
    const [application] = await db.insert(applications).values({
      name: "Test Application",
    }).returning({
      id: applications.id
    })

    const [user] = await db.insert(users).values({
      email: "test@test.com",
      name: "Test User",
      password: "123",
      applicationId: application.id,
    }).returning({
      id: users.id
    })

    // MARK: Act 
    const result = await createRole({
      name: "Test Role",
      applicationId: application.id,
      permissions: [
        PERMISSIONS["posts:delete"],
        PERMISSIONS["posts:read"],
      ],
      creatorType: "USER",
      creatorUserId: user.id,
    })

    // MARK: Assert
    expect(result.id).toBeDefined()
    const expectedPermissions = new Set([
      PERMISSIONS["posts:delete"],
      PERMISSIONS["posts:read"],
    ])
    const actualPermissions = new Set(result.permissions)
    expect(actualPermissions).toEqual(expectedPermissions)
    expect(result.creatorType).toEqual("USER")
  })

  it('role without application should not be created', async () => {
    // MARK: Arrange
    let thrownWithCode: string | undefined = undefined

    // MARK: Act 

    try {
      await createRole({
        name: "Test Role",
        permissions: [],
        creatorType: "SYSTEM",
      })
    } catch (error: any) { thrownWithCode = error.code }

    // MARK: Assert
    // 23502: violates not-null constraint error code
    expect(thrownWithCode).toBe("23502")

  })

  it('role with same name should not be created', async () => {

    // MARK: Arrange
    const sharedRoleName = "Test Role"

    // Create an application for the role 
    const [application] = await db.insert(applications).values({
      name: "Test Application",
    }).returning({
      id: applications.id
    })
    // Create a role 
    await db.insert(roles).values({
      name: sharedRoleName,
      permissions: [],
      applicationId: application.id,
      creatorType: "SYSTEM",
    })

    let thrownWithCode: string | undefined = undefined


    // MARK: Act

    try {
      await createRole({
        name: sharedRoleName,
        permissions: [],
        applicationId: application.id,
        creatorType: "SYSTEM",
      })
    } catch (error: any) {
      thrownWithCode = error.code
    }

    // MARK: Assert
    // 23505: duplicate key 
    expect(thrownWithCode).toBe("23505")
  })

  it("should be able to get a role by name", async () => {
    // MARK: Arrange
    // Create an application for the role
    const [application] = await db.insert(applications).values({
      name: "Test Application",
    }).returning({
      id: applications.id
    })
    // Create a role 
    await db.insert(roles).values({
      name: "Test Role",
      permissions: [],
      applicationId: application.id,
      creatorType: "SYSTEM",
    })

    // MARK: Act
    const result = await getRoleByName({
      name: "Test Role",
      applicationId: application.id,
    })

    // MARK: Assert
    expect(result).toBeDefined()
    expect(result?.name).toEqual("Test Role")
    expect(result?.applicationId).toEqual(application.id)
    expect(result?.permissions).toEqual([])
    expect(result?.creatorType).toEqual("SYSTEM")
  })

  it("should return null if role is not found", async () => {
    // MARK: Arrange
    const [application] = await db.insert(applications).values({
      name: "Test Application",
    }).returning({
      id: applications.id
    })

    // MARK: Act
    const result = await getRoleByName({
      name: "Test Role",
      applicationId: application.id,
    })

    // MARK: Assert
    expect(result).toBeNull()
  })


  it("should return null if application is not found", async () => {
    const fakeApplicationId = "123e4567-e89b-12d3-a456-426614174000"

    // MARK: Act
    const result = await getRoleByName({
      name: "Test Role",
      applicationId: fakeApplicationId,
    })

    // MARK: Assert
    expect(result).toBeNull()
  })

  it("should return null if role is from another application", async () => {
    // MARK: Arrange
    const roleName = "Test Role"
    const [otherApplication] = await db.insert(applications).values({
      name: "Other Application",
    }).returning({
      id: applications.id
    })

    const [applicationWeSearchIn] = await db.insert(applications).values({
      name: "Application We Search In",
    }).returning({
      id: applications.id
    })

    await db.insert(roles).values({
      name: roleName,
      permissions: [],
      applicationId: otherApplication.id,
      creatorType: "SYSTEM",
    })

    // MARK: Act
    const result = await getRoleByName({
      name: roleName,
      applicationId: applicationWeSearchIn.id,
    })
    // MARK: Assert
    expect(result).toBeNull()
  })
})