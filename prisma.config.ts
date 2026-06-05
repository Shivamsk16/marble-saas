import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js uses .env.local; Prisma CLI loads this config first
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
    directUrl: process.env.DIRECT_URL!,
  },
});
