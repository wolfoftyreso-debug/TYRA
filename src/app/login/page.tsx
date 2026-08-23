"use client";

import { signIn } from "next-auth/react";
import { useState, useTransition } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <main className="min-h-screen bg-white text-[#0b0c0e]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Logga in</h1>
        <p className="mt-2 text-sm text-black/60">
          Personalkonto för verkstaden.
        </p>

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            startTransition(async () => {
              const res = await signIn("credentials", {
                email,
                password,
                redirect: true,
                callbackUrl: "/ops"
              });
              if (res?.error) setError("Fel e-post eller lösenord.");
            });
          }}
        >
          <label className="block">
            <div className="text-xs font-medium text-black/70">E-post</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-black/30"
              autoComplete="email"
              inputMode="email"
              required
            />
          </label>

          <label className="block">
            <div className="text-xs font-medium text-black/70">Lösenord</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm outline-none ring-0 focus:border-black/30"
              autoComplete="current-password"
              required
            />
          </label>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-[#0b0c0e] px-4 py-3 text-sm font-medium text-white disabled:opacity-60"
          >
            {isPending ? "Loggar in…" : "Logga in"}
          </button>
        </form>

        <div className="mt-6 text-sm text-black/70">
          Ingen användare än?{" "}
          <a className="underline" href="/signup">
            Skapa konto
          </a>
        </div>
      </div>
    </main>
  );
}

