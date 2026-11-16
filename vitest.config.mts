import path from "node:path";
import { defineConfig } from "vitest/config";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";

// Testovi se izvode u Workers runtimeu (workerd) s pravim lokalnim D1, kao u akredo-hr.
export default defineConfig(async () => {
  const migrations = await readD1Migrations(path.join(import.meta.dirname, "drizzle"));
  return {
    resolve: { alias: { "@": path.join(import.meta.dirname, "src") } },
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityDate: "2026-11-01",
          compatibilityFlags: ["nodejs_compat"],
          d1Databases: ["DB"],
          bindings: { TEST_MIGRATIONS: migrations, APP_ENV: "test", EMAIL_TRANSPORT: "log" },
        },
      }),
    ],
    test: { include: ["tests/**/*.test.ts"], setupFiles: ["./tests/apply-migrations.ts"] },
  };
});
