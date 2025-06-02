import fastify from "fastify";
import { applicationsRoutes } from "../modules/applications/application.routes";
import { usersRoutes } from "../modules/users/user.routes";
import { roleRoutes } from "../modules/roles/role.routes";
import guard from "fastify-guard";
import { JsonWebTokenError, verify } from "jsonwebtoken";
import { fastifyLogger } from "./logger";
import cors from '@fastify/cors'
import { db } from "../db";
import { sql } from "drizzle-orm";
import { env } from "../config/env";
import { ALLOWED_ORIGINS } from "../config/server";

type User = {
  id: string,
  applicationId: string,
  scopes: string[],
}


declare module 'fastify' {
  interface FastifyRequest {
    user: User | null,
  }
}

export const buildServer = async () => {
  const app = fastify({
    logger: fastifyLogger
  });


  // Put a user object in the request object
  app.decorateRequest('user', null)

  // Verify the JWT token and put the user object in the request object
  app.addHook('onRequest', async function (request, reply) {
    const authHeader = request.headers.authorization
    // user is not verified, so no user object will be put in the request object
    if (!authHeader) return

    try {
      const token = authHeader.replace('Bearer ', '')
      const decoded = verify(token, env.JWT_SECRET) as User
      request.user = decoded // <- Put the verified user object in the request object
    } catch (error) {
      // Token is invalid, so send a 401 response
      app.log.error({ error }, 'Invalid token')

      if (error instanceof JsonWebTokenError) {
        return reply.code(401).send({
          message: error.name === 'TokenExpiredError' ? 'Token expired' : 'Unauthorized',
          extensions: {
            code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'UNAUTHORIZED',
          },
        })
      }

      return reply.code(500).send({
        message: 'Internal server error',
        extensions: {
          code: 'INTERNAL_SERVER_ERROR',
        },
      })
    }
  })

  // MARK:: Register plugins
  app.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? ALLOWED_ORIGINS // TODO: Change this to the actual origin
      : '*',
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
  app.register(guard, {
    requestProperty: "user",
    scopeProperty: "scopes",
    errorHandler(result, request, reply) {
      reply.code(401).send({
        message: 'Unauthorized',
        extensions: {
          code: 'UNAUTHORIZED',
        },
      })
    },
  })

  //  MARK: Register routes
  app.register(applicationsRoutes, { prefix: 'api/applications' })
  app.register(usersRoutes, { prefix: "api/users" })
  app.register(roleRoutes, { prefix: "api/roles" })

  // MARK: Healt Check 
  app.get('/healthcheck', async (_, reply) => {
    try {
      // Check database connection
      await db.execute(sql`SELECT 1`)
      return reply.code(200).send({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
      })
    } catch (error) {
      return reply.code(503).send({
        status: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      })
    }
  })


  return app;
}