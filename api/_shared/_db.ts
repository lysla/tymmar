// api/_shared/_db.ts
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./../../db/schema";

/** 👀 !! we use drizzle ORM to manage database interactions */

/** the connection string uses a high privilege user, so it bypasses RLS policies */
const connectionString = process.env.POSTGRES_URL!;
const client = postgres(connectionString, {
    prepare: false,
});
export const db = drizzle(client, { schema });
