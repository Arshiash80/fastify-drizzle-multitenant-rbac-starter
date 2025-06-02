import { migrate } from "drizzle-orm/neon-http/migrator";
import closeWithGrace from "close-with-grace";
import { buildServer } from "./utils/server";
import { env } from "./config/env";
import { db } from "./db";

const main = async () => {
  const app = await buildServer()

  await app.listen(
    { port: env.PORT, host: env.HOST });

  app.log.debug(env, 'Environment variables')

  // skip this in 'test' environment because the test setup will handle its own migrations.
  if (env.NODE_ENV !== 'test') {
    app.log.info('Migrating database...')
    await migrate(db, { migrationsFolder: './migrations' });
    app.log.info('Database migrated.')
  }
  closeWithGrace(async ({ signal, err, manual }) => {
    if (err) {
      app.log.error({ err }, 'server closing with error')
    } else if (manual) {
      app.log.info('Manual close, quitting...')
    } else {
      // SIGINT: Ctrl+C 
      app.log.info(`${signal} Signal received, quitting...`)
    }
    await app.close()
  })
}

main();
