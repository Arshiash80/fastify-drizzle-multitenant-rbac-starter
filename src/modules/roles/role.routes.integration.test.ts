import { describe, it, expect, beforeAll, beforeEach } from "vitest"
import { db } from "../../db"
import { applications, roles, users, usersToRoles } from "../../db/schema"
import { CreateRoleBody } from "./role.schemas"
import { PERMISSIONS } from "../../config/permissions"
import supertest from "supertest";
import { testApp } from "../../../test/vitest.integration.test.setup"
import { sign } from "jsonwebtoken"


describe("Role Routes", () => {

  let applicationId: string
  beforeEach(async () => {
    // Create a test application
    const [application] = await db
      .insert(applications)
      .values({
        name: "Test Application",
      }).returning({
        id: applications.id
      })

    applicationId = application.id
  })


  it("users with 'roles:write' permission should be able to create a role", async () => {
    // MARK: Arrange
    const [user] = await db.insert(users).values({
      email: "test@test.com",
      name: "Test User",
      password: "123",
      applicationId,
    }).returning({ id: users.id })

    const token = sign({
      id: user.id,
      applicationId,
      scopes: [
        PERMISSIONS["roles:write"]
      ]
    }, "secret")


    const body = {
      name: "Test Role",
      permissions: [
        PERMISSIONS["roles:read"],
        PERMISSIONS["roles:write"],
      ]
    } as CreateRoleBody

    // MARK: Act
    const response = await supertest(testApp.server)
      .post("/api/roles")
      .set("Authorization", `Bearer ${token}`)
      .send(body)
      .expect(201)

    // MARK: Assert
    const role = response.body.data.role
    expect(role.id).toBeDefined()
    expect(role.name).toBe(body.name)
    expect(role.permissions).toEqual(body.permissions)
    expect(role.creatorType).toBe("USER")
    expect(role.creatorUserId).toBe(user.id)
    expect(role.applicationId).toBe(applicationId)
  })
})