import type { FastifyReply, FastifyRequest } from "fastify";
import type { AssignRoleToUserBody, CreateUserBody, LoginUserBody } from "./user.schemas";
import { assignRoleToUser, createUser, getUserByEmail, getUsersByApplicationId } from "./users.services";
import { getRoleByName } from "../roles/role.services";
import { SYSTEM_ROLES } from "../../config/permissions";
import { sign } from "jsonwebtoken";
import { env } from "../../config/env";
import { AUTH_TOKEN_EXPIRATION_TIME } from "../../config/server";

export const createUserHandler = async (request: FastifyRequest<{ Body: CreateUserBody }>, reqply: FastifyReply) => {
  const {
    initialUser, // <- if true, the user is an initial user and will be assigned the super admin role.
    ...newAppUserData
  } = request.body

  // The roles `SUPER_ADMIN` and `APPLICATION_USER` should be already created when the application is created.
  const roleName = initialUser ? SYSTEM_ROLES.SUPER_ADMIN : SYSTEM_ROLES.APPLICATION_USER

  // If the user is an initial user, we need to check if the super admin user already exists.
  // Or in other words we need to check if is there any user in the application at all. 
  if (roleName === SYSTEM_ROLES.SUPER_ADMIN) {
    // Try to get the users for the application.
    const applicationCurrentUsers = await getUsersByApplicationId({
      applicationId: newAppUserData.applicationId,
    })
    // If there is any user in the application, we should not allow to create a super admin user.
    // This means the inital user is not trustworthy or something is wrong with the application.
    if (applicationCurrentUsers.length > 0) {
      return reqply.code(400).send({
        message: 'An initial super admin user already exists for this application.',
        extensions: {
          code: 'SUPER_ADMIN_ALREADY_EXISTS',
          applicationId: newAppUserData.applicationId,
        },
      })
    }
  }

  // Try to get the role by name for the application.
  const role = await getRoleByName({
    name: roleName,
    applicationId: newAppUserData.applicationId,
  })


  if (!role) {
    // We should never get here because the role should be created when the application is created.
    return reqply.code(404).send({
      message: 'Role not found',
      extensions: {
        code: 'ROLE_NOT_FOUND',
        applicationId: newAppUserData.applicationId,
      },
    })
  }

  try {
    // Create the new user.
    const newAppUser = await createUser(newAppUserData)

    // Assign the role (roleName) to the new user. 
    await assignRoleToUser({
      applicationId: newAppUserData.applicationId,
      userId: newAppUser.id,
      roleId: role.id
    })

    return reqply.code(201).send({
      data: {
        user: newAppUser,
        role: role,
      },
      message: 'User created',
      extensions: {
        code: 'USER_CREATED',
      },
    })


  } catch (error) {
    return reqply.code(500).send({
      message: 'Error creating user',
      extensions: {
        code: 'USER_CREATION_ERROR',
      },
    })
  }
}



export const loginUserHandler = async (
  request: FastifyRequest<{
    Body: LoginUserBody
  }>,
  reply: FastifyReply
) => {
  const {
    applicationId,
    email,
    password,
  } = request.body


  const user = await getUserByEmail({
    applicationId,
    email,
    password
  })


  if (!user) {
    return reply.code(401).send({
      message: 'Invalid credentials',
      extensions: {
        code: 'INVALID_CREDENTIALS',
      },
    })
  }


  const token = sign(
    {
      id: user.id,
      email,
      applicationId,
      scopes: user.permissions,
    },
    env.JWT_SECRET,
    {
      // 10 seconds
      expiresIn: AUTH_TOKEN_EXPIRATION_TIME
    }
  )


  return reply.code(200).send({
    data: {
      token,
    },
    message: 'User logged in',
    extensions: {
      code: 'USER_LOGGED_IN',
    },
  })
}



export const assignRoleToUserHandler = async (request: FastifyRequest<{
  Body: AssignRoleToUserBody
}>, reply: FastifyReply) => {

  const user = request.user
  if (!user) {
    return reply.code(401).send({
      message: 'Unauthorized',
      extensions: {
        code: 'UNAUTHORIZED',
      },
    })
  }

  const applicationId = user.applicationId

  const {
    roleId,
    userId
  } = request.body
  try {
    const result = await assignRoleToUser({
      applicationId,
      roleId,
      userId
    })

    return reply.code(200).send({
      data: result,
      message: 'Role assigned to user',
      extensions: {
        code: 'ROLE_ASSIGNED_TO_USER',
      },
    })
  } catch (error) {
    return reply.code(500).send({
      message: 'Error assigning role to user',
      extensions: {
        code: 'ROLE_ASSIGNMENT_ERROR',
      },
    })
  }
}