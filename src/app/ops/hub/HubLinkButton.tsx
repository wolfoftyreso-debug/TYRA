"use client";

import { useState, useTransition } from "react";

import { createCustomerHubLinkAction } from "./serverActions";

export function HubLinkButton(props: { customerId: string }) {
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="mt-4">
      {err ? (
        <div className="mb-2 rounded-xl border border-red-200/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}
      <button
        disabled={isPending}
        className="rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/90 disabled:opacity-40"
        onClick={() => {
          setErr(null);
          startTransition(async () => {
            try {
              const res = await createCustomerHubLinkAction({ customerId: props.customerId });
              // Definition-of-done: open first, copy second (best-effort)
              window.open(res.url, "_blank", "noopener,noreferrer");
              try {
                await navigator.clipboard.writeText(window.location.origin + res.url);
              } catch {
                // ignore
              }
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Kunde inte skapa kundlänk.");
            }
          });
        }}
      >
        {isPending ? "Skapar länk…" : "Öppna kundens däckvy"}
      </button>
      <div className="mt-2 text-xs text-white/50">
        Öppnar live-vyn i ny flik och försöker kopiera länken.
      </div>
    </div>
  );
}

