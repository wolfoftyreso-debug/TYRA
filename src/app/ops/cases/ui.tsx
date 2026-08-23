"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createDemoCaseAction } from "./serverActions";

export function DemoCaseButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs font-medium text-white/60">Demo</div>
      <div className="mt-2 text-sm text-white/80">
        Skapar ett ärende från ett simulerat DMS-event (idempotent eventlogg + code mapping → canonical
        operations → workflow steps).
      </div>
      {error ? (
        <div className="mt-3 rounded-xl border border-red-200/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      <button
        className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#0b0c0e] disabled:opacity-40"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const res = await createDemoCaseAction({
                registrationNumber: "ABC123",
                dmsCodes: ["DH01", "DH06", "DH05"] // swap-from-storage + wash + balance
              });
              router.push(`/ops/cases/${res.tireCaseId}`);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Kunde inte skapa demo-ärende.");
            }
          });
        }}
      >
        {isPending ? "Skapar…" : "Skapa demo-ärende (ABC123)"}
      </button>
    </div>
  );
}

