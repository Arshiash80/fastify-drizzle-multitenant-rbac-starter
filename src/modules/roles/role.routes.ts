import { FastifyInstance } from "fastify";
import { createRoleHandler } from "./role.controllers";
import { CreateRoleBody, createRoleJsonSchema } from "./role.schemas";
import { PERMISSIONS } from "../../config/permissions";



export const roleRoutes = async (app: FastifyInstance) => {
  app.post<
    {
      Body: CreateRoleBody
    }
  >("/", {
    schema: createRoleJsonSchema,
    preHandler: [
      app.guard.scope(
        [
          PERMISSIONS["roles:write"]
        ]
      )
    ]
  },
    createRoleHandler
  )
}