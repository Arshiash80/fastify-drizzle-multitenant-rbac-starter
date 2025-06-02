import type { RawServerDefault } from "fastify"
import type { FastifyLoggerOptions, PinoLoggerOptions } from "fastify/types/logger"
import { env } from "../config/env"
import { type LoggerOptions } from "pino"

const developmentLogger: LoggerOptions = {
  redact: ['DATABASE_CONNECTION_URL', 'JWT_SECRET'], // <- This will redact (hide) the variables. 
  // Example: `(DATABASE_CONNECTION: "[Redacted]")`
  level: 'debug', // <- To be able to see the debug logs.
  // Example: `app.log.debug(env, 'Environment variables')` 
  transport: {
    target: process.env.NODE_ENV === 'production' ? '' : 'pino-pretty', // <- Don't use pino-pretty in production.
  }
}

const envToLogger = {
  development: developmentLogger,
  production: true,
  test: false,
}

export const fastifyLogger: boolean | FastifyLoggerOptions<RawServerDefault> & PinoLoggerOptions = envToLogger[env.NODE_ENV]


