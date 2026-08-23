import "server-only";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

const authDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://unconfigured:unconfigured@127.0.0.1:5432/unconfigured";

const authPool = new Pool({
  connectionString: authDatabaseUrl,
  max: 3,
  ssl:
    process.env.DATABASE_URL && process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : undefined,
});

export const auth = betterAuth({
  appName: "TYRA Däckhotell",
  database: authPool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "local-development-secret-change-before-deploy",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ],
  plugins: [nextCookies()],
});
