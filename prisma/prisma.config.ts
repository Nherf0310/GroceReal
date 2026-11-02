import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "apps/prisma/schema.prisma",
  migrations: {
    path: "apps/prisma/migrations",
    seed: "tsx apps/prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL") || env("DIRECT_URL")
  },
});
