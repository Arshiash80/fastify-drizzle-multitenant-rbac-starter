import { type FastifyInstance } from "fastify";
import { createApplicationHandler, getApplicationsHandler } from "./applications.controllers";
import { createApplicationJsonSchema } from "./application.schemas";

export const applicationsRoutes = async (app: FastifyInstance) => {

  app.post(
    "/",
    { schema: createApplicationJsonSchema },
    createApplicationHandler
  )

  app.get("/", getApplicationsHandler)
}