"use server";

import { createUser } from "@/lib/server/users";

export async function signUpAction(input: {
  name: string;
  email: string;
  password: string;
}) {
  try {
    await createUser(input);
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Kunde inte skapa användare.";
    return { ok: false as const, error: msg };
  }

  return { ok: true as const };
}

