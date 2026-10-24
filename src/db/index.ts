import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { serverEnv } from "@/lib/server/env";
import * as schema from "./schema";

declare global {
  var __bbuSql: ReturnType<typeof postgres> | undefined;
}

function connect() {
  if (!serverEnv.databaseUrl) throw new Error("DATABASE_URL is not set");
  // reuse one pool across hot reloads in development
  globalThis.__bbuSql ??= postgres(serverEnv.databaseUrl, { max: 10, prepare: true });
  return globalThis.__bbuSql;
}

export const db = drizzle({ client: connect(), schema, casing: "snake_case" });
export type DB = typeof db;
export { schema };
