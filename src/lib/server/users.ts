import { z } from "zod";

import { query } from "./db";
import { hashPassword } from "./password";

export type DbUser = {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
};

export async function getUserByEmail(input: { email: string }) {
  const res = await query<DbUser>(
    `select id, email, name, password_hash
     from users
     where lower(email) = lower($1)
     limit 1`,
    [input.email]
  );
  return res.rows[0] ?? null;
}

const createUserSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(320),
  password: z.string().min(8).max(200)
});

export async function createUser(input: {
  name: string;
  email: string;
  password: string;
}) {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) throw new Error("Ogiltiga uppgifter.");

  const exists = await getUserByEmail({ email: parsed.data.email });
  if (exists) throw new Error("E-posten används redan.");

  const passwordHash = await hashPassword(parsed.data.password);

  const res = await query<{ id: string }>(
    `insert into users (email, name, password_hash)
     values ($1, $2, $3)
     returning id`,
    [parsed.data.email, parsed.data.name, passwordHash]
  );

  return res.rows[0]!;
}

