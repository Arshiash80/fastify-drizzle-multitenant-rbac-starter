import { FastifyReply, FastifyRequest } from "fastify";
import { CreateRoleBody } from "./role.schemas";
import { createRole } from "./role.services";


export const createRoleHandler = async (
  request: FastifyRequest<{
    Body: CreateRoleBody
  }>,
  reply: FastifyReply
) => {

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
    name,
    permissions
  } = request.body

  const newRole = await createRole({
    name,
    permissions,
    applicationId,
    creatorType: 'USER',
    creatorUserId: user.id,
  })

  return reply.code(201).send({
    data: {
      role: newRole,
    },
    message: 'Role created',
    extensions: {
      code: 'ROLE_CREATED',
    },
  })
}