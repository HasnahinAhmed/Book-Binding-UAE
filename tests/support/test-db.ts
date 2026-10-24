import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "@/db/schema";

/** A clean, migrated test database, or null when TEST_DATABASE_URL is not set. */
export function testDb() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return null;
  const client = postgres(url, { max: 2, onnotice: () => {} });
  const db = drizzle({ client, schema });
  return {
    db,
    async reset() {
      await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;`);
      await migrate(db, { migrationsFolder: "./drizzle" });
    },
    end: () => client.end(),
  };
}
