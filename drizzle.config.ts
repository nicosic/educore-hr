import { defineConfig } from "drizzle-kit";

// Migracije se samo generiraju ovdje; primjenjuju se s `wrangler d1 migrations apply`.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
});
