import type { FastifyRequest, FastifyReply } from "fastify";
import { type CreateApplicationBody } from "./application.schemas";
import { createApplication, getApplications } from "./application.services";
import { createRole } from "../roles/role.services";
import { ALL_PERMISSIONS, SYSTEM_ROLES, USER_ROLE_PERMISSIONS } from "../../config/permissions";

export const createApplicationHandler = async (request: FastifyRequest<{ Body: CreateApplicationBody }>, reply: FastifyReply) => {
  const { name } = request.body
  // Create the application
  const application = await createApplication({ name })

  // Create the super admin role
  const superAdminRolePromise = createRole(
    {
      applicationId: application.id,
      name: SYSTEM_ROLES.SUPER_ADMIN,
      permissions: [...ALL_PERMISSIONS] // <- Super admin has access to all permissions
    }
  )

  // Create the application user role
  const applicationUserRolePromise = createRole(
    {
      applicationId: application.id,
      name: SYSTEM_ROLES.APPLICATION_USER,
      permissions: [...USER_ROLE_PERMISSIONS] // <- Application user has access to user role permissions
    }
  )

  const [superAdminRole, applicationUserRole] = await Promise.allSettled([
    superAdminRolePromise,
    applicationUserRolePromise
  ])

  if (superAdminRole.status === 'rejected') {
    throw new Error('Failed to create super admin role. Reason:' + superAdminRole.reason)
  }

  if (applicationUserRole.status === 'rejected') {
    throw new Error('Failed  to create application user role.Reason:' + applicationUserRole.reason)
  }


  reply.code(201).send({
    data: {
      application,
      superAdminRole: superAdminRole.value,
      applicationUserRole: applicationUserRole.value
    }
  })
}


export const getApplicationsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const applications = await getApplications()

  reply.code(200).send({
    data: applications
  })
}