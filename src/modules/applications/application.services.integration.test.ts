import { describe, it, expect } from "vitest"
import { CreateApplicationBody } from "./application.schemas"
import { createApplication, getApplications } from "./application.services"
import { db } from "../../db"
import { applications } from "../../db/schema"


describe("Application Services", () => {
  it("should create an application", async () => {
    // MARK: Arrange
    const body = {
      name: "Test Application"
    } as CreateApplicationBody

    // MARK: Act
    const application = await createApplication(body)

    // MARK: Assert
    expect(application.id).toBeDefined()
    expect(application.name).toBe(body.name)
    expect(application.createdAt).toBeDefined()
    expect(application.updatedAt).toBeDefined()
  })

  it("should get all applications", async () => {
    // MARK: Arrange
    await db.insert(applications).values([
      {
        name: "Test Application 1"
      },
      {
        name: "Test Application 2"
      }
    ])

    // MARK: Act
    const returnedApplications = await getApplications()

    // MARK: Assert
    expect(returnedApplications.length).toBe(2)
  })
})