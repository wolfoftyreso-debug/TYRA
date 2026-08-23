import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1)
});

export function getServerEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    throw new Error(`Missing env vars: ${msg}`);
  }
  return parsed.data;
}

