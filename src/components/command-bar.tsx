"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { intentHref, parseCommand } from "@/lib/command";

export function CommandBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return;
    router.push(intentHref(parseCommand(query)));
  }

  return (
    <form onSubmit={submit} className="relative">
      <Search
        aria-hidden="true"
        className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9299a4]"
        size={22}
      />
      <label htmlFor="command" className="sr-only">
        Sök eller skriv vad du vill göra
      </label>
      <input
        id="command"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Sök reg.nr, hyllplats eller skriv vad du vill göra…"
        autoComplete="off"
        className="focus-ring h-17 w-full rounded-2xl border border-[#373c44] bg-[#1b1e23] pl-14 pr-16 text-base text-white shadow-2xl shadow-black/30 placeholder:text-[#7f8791]"
      />
      <button
        type="submit"
        aria-label="Kör kommando"
        className="focus-ring absolute right-3 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-xl bg-[#d8ff57] text-[#0b0c0e]"
      >
        <ArrowRight size={21} />
      </button>
    </form>
  );
}
