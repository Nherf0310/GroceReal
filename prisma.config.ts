import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config();
dotenv.config({ path: "apps/api/.env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL") || env("DATABASE_URL"),
  },
});
