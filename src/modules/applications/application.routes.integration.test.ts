import supertest from "supertest"
import { describe, it, expect } from "vitest"
import { testApp } from "../../../test/vitest.integration.test.setup"
import { CreateApplicationBody } from "./application.schemas"
import { ALL_PERMISSIONS, SYSTEM_ROLES, USER_ROLE_PERMISSIONS } from "../../config/permissions"
import { db } from "../../db"
import { applications } from "../../db/schema"


describe("Application Routes", () => {

  it("should create an application", async () => {
    // MARK: Arrange
    const body = {
      name: "Test Application"
    } as CreateApplicationBody

    // MARK: Act
    const response = await supertest(testApp.server)
      .post("/api/applications")
      .send(body)
      .expect(201)

    // MARK: Assert
    const application = response.body.data.application
    const superAdminRole = response.body.data.superAdminRole
    const applicationUserRole = response.body.data.applicationUserRole

    expect(application.id).toBeDefined()
    expect(application.name).toBe(body.name)
    expect(application.createdAt).toBeDefined()
    expect(application.updatedAt).toBeDefined()

    expect(superAdminRole.id).toBeDefined()
    expect(superAdminRole.name).toBe(SYSTEM_ROLES.SUPER_ADMIN)
    expect(superAdminRole.permissions).toEqual(ALL_PERMISSIONS)
    expect(superAdminRole.creatorType).toBe("SYSTEM")
    expect(superAdminRole.creatorUserId).toBeNull()

    expect(applicationUserRole.id).toBeDefined()
    expect(applicationUserRole.name).toBe(SYSTEM_ROLES.APPLICATION_USER)
    expect(applicationUserRole.permissions).toEqual(USER_ROLE_PERMISSIONS)
    expect(applicationUserRole.creatorType).toBe("SYSTEM")
    expect(applicationUserRole.creatorUserId).toBeNull()
  })

  it("should get all applications", async () => {
    // MARK: Arrange
    // Create some test applications
    await db.insert(applications).values([
      {
        name: "Test Application 1"
      },
      {
        name: "Test Application 2"
      }
    ])

    // MARK: Act
    const response = await supertest(testApp.server)
      .get("/api/applications")
      .expect(200)


    // MARK: Assert
    const retrunedApplications = response.body.data
    // Should return all the applications we just created 
    expect(retrunedApplications.length).toBe(2)

  })
})