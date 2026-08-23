"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const result =
      mode === "signup"
        ? await authClient.signUp.email({ name, email, password })
        : await authClient.signIn.email({ email, password });
    setLoading(false);
    if (result.error) {
      setError(
        process.env.NEXT_PUBLIC_APP_URL
          ? result.error.message ?? "Inloggningen misslyckades."
          : "Databasen är inte ansluten i demoläget.",
      );
      return;
    }
    window.location.href = "/";
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-[#2a2e35] bg-[#14161a] p-6 md:p-8">
      <p className="eyebrow">Werkstad Tyresö</p>
      <h1 className="mt-3 text-3xl font-semibold">
        {mode === "login" ? "Logga in" : "Skapa verkstadskonto"}
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#9299a4]">
        {mode === "signup"
          ? "Första kontot skapar organisationen och grunddata."
          : "Fortsätt till dagens lagerarbete."}
      </p>
      <form onSubmit={submit} className="mt-7 space-y-4">
        {mode === "signup" && (
          <Input label="Namn" value={name} onChange={setName} type="text" />
        )}
        <Input label="E-post" value={email} onChange={setEmail} type="email" />
        <Input
          label="Lösenord"
          value={password}
          onChange={setPassword}
          type="password"
        />
        {error && <p className="text-sm text-[#ff9a82]">{error}</p>}
        <button
          disabled={loading}
          className="focus-ring min-h-12 w-full rounded-xl bg-[#d8ff57] px-5 font-semibold text-[#0b0c0e] disabled:opacity-60"
        >
          {loading
            ? "Arbetar…"
            : mode === "login"
              ? "Logga in"
              : "Skapa konto"}
        </button>
      </form>
      <button
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="focus-ring mt-5 w-full text-sm text-[#b8bdc5] underline underline-offset-4"
      >
        {mode === "login" ? "Skapa ett nytt konto" : "Jag har redan ett konto"}
      </button>
      <Link
        href="/"
        className="focus-ring mt-5 block text-center text-xs text-[#7f8791]"
      >
        Fortsätt i demo utan databas
      </Link>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: string;
}) {
  return (
    <label className="block text-sm text-[#a6adb7]">
      {label}
      <input
        required
        minLength={type === "password" ? 8 : undefined}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring mt-2 h-12 w-full rounded-xl border border-[#3a4049] bg-[#0f1114] px-4 text-white"
      />
    </label>
  );
}
