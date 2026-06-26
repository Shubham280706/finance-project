import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getEnv } from "@/lib/env";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __filingiq_db__: PostgresJsDatabase<typeof schema> | undefined;
}

function makeDb(): PostgresJsDatabase<typeof schema> {
  const { DATABASE_URL } = getEnv();
  // Supabase pooled connection: prepare must be disabled for transaction pooling.
  const client = postgres(DATABASE_URL, { prepare: false, max: 5 });
  return drizzle(client, { schema });
}

/**
 * Lazily-initialized Drizzle client. Created on first query rather than at
 * import time so `next build` (which imports route modules to read their config)
 * never triggers env validation or a DB connection. Reused across hot reloads.
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop) {
    const instance = (globalThis.__filingiq_db__ ??= makeDb());
    const value = Reflect.get(instance, prop);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
