"use client";

import { useState, useTransition } from "react";

import { acceptOfferOptionAction } from "./serverActions";

export function HubClient(props: { token: string; offerId: string; optionId: string }) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="shrink-0 text-right">
      {done ? (
        <div className="text-sm font-medium text-emerald-700">Godkänt</div>
      ) : (
        <button
          disabled={isPending}
          className="rounded-xl bg-[#0b0c0e] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          onClick={() => {
            setErr(null);
            startTransition(async () => {
              try {
                await acceptOfferOptionAction({
                  token: props.token,
                  offerId: props.offerId,
                  optionId: props.optionId
                });
                setDone(true);
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Kunde inte godkänna.");
              }
            });
          }}
        >
          {isPending ? "Kontrollerar…" : "Välj dessa däck"}
        </button>
      )}
      {err ? <div className="mt-2 text-xs text-red-700">{err}</div> : null}
      {!err && !done ? (
        <div className="mt-2 text-xs text-black/50">Du bekräftar beställningen till verkstaden.</div>
      ) : null}
    </div>
  );
}

