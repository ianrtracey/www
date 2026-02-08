import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/poker/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "file:data/poker.db",
  },
});
