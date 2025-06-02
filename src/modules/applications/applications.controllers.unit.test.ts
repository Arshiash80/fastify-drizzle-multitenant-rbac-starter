import { createApplication } from "./application.services"
import { createRole } from "../roles/role.services"
import { describe, it, expect, vi } from "vitest"
import { createMockFastifyObjects } from "../../../test/unit-test-utils"
import { CreateApplicationBody } from "./application.schemas"
import { ALL_PERMISSIONS, SYSTEM_ROLES, USER_ROLE_PERMISSIONS } from "../../config/permissions"
import { createApplicationHandler } from "./applications.controllers"



vi.mock(import("./application.services"))
vi.mock(import("../roles/role.services"))

describe("Applications Controllers", () => {
  it("should create an application with a super admin role and an application user role", async () => {
    // MARK: Arrange
    const body = {
      name: "Test Application"
    } as CreateApplicationBody

    const { reply, request } = createMockFastifyObjects<CreateApplicationBody>({
      request: {
        body,
      }
    })

    vi.mocked(createApplication).mockResolvedValue({
      name: body.name,
      id: "test-app-id",
      createdAt: new Date(),
      updatedAt: new Date()
    })

    vi.mocked(createRole)
      .mockResolvedValueOnce({ // <- Mock the first call to createRole (super admin role)
        applicationId: "test-app-id",
        name: SYSTEM_ROLES.SUPER_ADMIN,
        permissions: [...ALL_PERMISSIONS],
        creatorType: "SYSTEM",
        creatorUserId: null,
        id: "test-super-admin-role-id",
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .mockResolvedValueOnce({ // <- Mock the second call to createRole (application user role)
        applicationId: "test-app-id",
        name: SYSTEM_ROLES.APPLICATION_USER,
        permissions: [...USER_ROLE_PERMISSIONS],
        creatorType: "SYSTEM",
        creatorUserId: null,
        id: "test-app-user-role-id",
        createdAt: new Date(),
        updatedAt: new Date()
      })

    // MARK: Act
    await createApplicationHandler(
      request,
      reply
    )

    expect(createRole).toHaveBeenCalledTimes(2)
    expect(createRole).toHaveBeenCalledWith({
      applicationId: "test-app-id",
      name: SYSTEM_ROLES.SUPER_ADMIN,
      permissions: [...ALL_PERMISSIONS],
    })
    expect(createRole).toHaveBeenCalledWith({
      applicationId: "test-app-id",
      name: SYSTEM_ROLES.APPLICATION_USER,
      permissions: [...USER_ROLE_PERMISSIONS],
    })
    expect(reply.code).toHaveBeenCalledWith(201)
    expect(reply.send).toHaveBeenCalledWith({
      data: {
        application: {
          id: "test-app-id",
          name: "Test Application",
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        superAdminRole: {
          id: "test-super-admin-role-id",
          name: SYSTEM_ROLES.SUPER_ADMIN,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          applicationId: "test-app-id",
          permissions: [...ALL_PERMISSIONS],
          creatorType: "SYSTEM",
          creatorUserId: null,
        },
        applicationUserRole: {
          id: "test-app-user-role-id",
          name: SYSTEM_ROLES.APPLICATION_USER,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
          applicationId: "test-app-id",
          permissions: [...USER_ROLE_PERMISSIONS],
          creatorType: "SYSTEM",
          creatorUserId: null,
        }
      }
    })
  })
})