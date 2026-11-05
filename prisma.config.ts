import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config();
dotenv.config({ path: "apps/api/.env" });

export default defineConfig({
  schema: "apps/api/prisma/schema.prisma",
  migrations: {
    path: "apps/api/prisma/migrations",
    seed: "tsx apps/api/prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL") || env("DATABASE_URL"),
  },
});
