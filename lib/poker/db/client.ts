import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

export function createDb(url?: string, authToken?: string) {
  const client = createClient({
    url: url ?? process.env.DATABASE_URL ?? "file:data/poker.db",
    authToken: authToken ?? process.env.TURSO_AUTH_TOKEN,
  });
  return drizzle(client, { schema });
}

export const db = createDb();
