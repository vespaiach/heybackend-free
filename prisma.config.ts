// Prisma v6 reads DATABASE_URL directly from the environment via schema.prisma.
// This file is kept as a placeholder for future Prisma CLI configuration.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
});
