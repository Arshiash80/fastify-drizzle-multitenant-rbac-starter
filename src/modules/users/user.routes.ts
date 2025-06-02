import { type FastifyInstance } from "fastify";
import { AssignRoleToUserBody, assignRoleToUserJsonSchema, createUserJsonSchema, loginUserJsonSchema } from "./user.schemas";
import { assignRoleToUserHandler, createUserHandler, loginUserHandler } from "./user.controllers";
import { PERMISSIONS } from "../../config/permissions";

export const usersRoutes = async (app: FastifyInstance) => {
  app.post(
    "/",
    {
      schema: createUserJsonSchema
    },
    createUserHandler
  )

  app.post(
    "/login",
    {
      schema: loginUserJsonSchema
    },
    loginUserHandler
  )


  app.post<{
    Body: AssignRoleToUserBody
  }>(
    "/roles",
    {
      schema: assignRoleToUserJsonSchema,
      preHandler: [
        app.guard.scope(
          PERMISSIONS['users:roles:write']
        )
      ]
    },
    assignRoleToUserHandler
  )
}