// import { Pool } from 'pg';
// import { drizzle } from 'drizzle-orm/node-postgres';
// import { env } from '../config/env';
// import * as schema from './schema';

// const pool = new Pool({
//   connectionString: env.DATABASE_CONNECTION_URL,
//   ssl: true,
// });

// export const db = drizzle(pool, { schema });



import * as schema from './schema';
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { env } from '../config/env';


const sql = neon(env.DATABASE_CONNECTION_URL!);
export const db = drizzle({ client: sql, schema });
