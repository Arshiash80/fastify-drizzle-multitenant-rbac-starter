import z from 'zod';
import { config } from 'dotenv';

config({ path: '.env' });

const envSchema = z.object({
  PORT: z.number(
    {
      coerce: true, // <- This will convert the port to a number if it is a string
    }
  ).default(3000),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  DATABASE_CONNECTION_URL: z.string().min(1).startsWith('postgresql://'),
  // 32 bytes * 2 hex characters/byte = 64 characters.
  JWT_SECRET: z.string().min(64),
});

export const env = envSchema.parse(process.env); 