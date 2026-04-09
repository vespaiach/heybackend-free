import { execSync } from "node:child_process";

const url = process.env.DATABASE_URL ?? "";

if (url.startsWith("mysql")) {
  console.log("MySQL detected — running prisma generate + migrate deploy");
  execSync("npx prisma generate && npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log("Non-MySQL database — skipping migrate deploy");
}
