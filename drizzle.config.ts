import { defineConfig } from "drizzle-kit";
import { env } from './src/config/env';


export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./migrations",
  breakpoints: true,
  dbCredentials: {
    url: env.DATABASE_CONNECTION_URL,
  },
});

