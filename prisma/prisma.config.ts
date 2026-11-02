import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "apps/api/src/prisma/schema.prisma",
  migrations: {
    path: "apps/api/src/prisma/migrations",
    seed: "tsx apps/api/src/prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL") || env("DIRECT_URL")
  },
});
