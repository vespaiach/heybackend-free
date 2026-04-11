// Prisma CLI configuration for this project.
// This file defines the schema location, migration settings (including the seed command),
// and the datasource URL from the DATABASE_URL environment variable.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
