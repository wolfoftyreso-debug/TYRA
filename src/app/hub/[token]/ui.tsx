"use client";

import { useState, useTransition } from "react";

import { placeOrderAction } from "./serverActions";

export function HubClient(props: {
  token: string;
  tireProductId: string;
  quantity: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [reg, setReg] = useState("");
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="shrink-0 text-right">
      {confirmed ? <div className="text-sm font-medium text-emerald-700">Beställning mottagen</div> : null}

      {!selected && !confirmed ? (
        <button
          disabled={isPending}
          className="rounded-xl bg-[#0b0c0e] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          onClick={() => {
            setErr(null);
            setSelected(true);
          }}
        >
          Välj
        </button>
      ) : null}

      {selected && !confirmed ? (
        <div className="mt-3 rounded-2xl border border-black/10 bg-white p-3 text-left">
          <div className="text-xs font-medium text-black/60">Bekräfta din bil</div>
          <div className="mt-1 text-xs text-black/60">
            Ange registreringsnumret för bilen som beställningen gäller.
          </div>
          <input
            value={reg}
            onChange={(e) => setReg(e.target.value.toUpperCase())}
            className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none"
            placeholder="ABC123"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <button
            disabled={isPending || reg.trim().length < 3}
            className="mt-3 w-full rounded-xl bg-[#0b0c0e] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            onClick={() => {
              setErr(null);
              startTransition(async () => {
                try {
                  await placeOrderAction({
                    token: props.token,
                    tireProductId: props.tireProductId,
                    quantity: props.quantity,
                    enteredRegistrationNumber: reg
                  });
                  setConfirmed(true);
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Kunde inte beställa.");
                }
              });
            }}
          >
            {isPending ? "Kontrollerar…" : "Beställ (betalning hos verkstaden)"}
          </button>

          <div className="mt-2 text-xs text-black/50">
            Priset snapshotas vid beställning. Betalning sker hos verkstaden.
          </div>
        </div>
      ) : null}

      {err ? <div className="mt-2 text-xs text-red-700">{err}</div> : null}
    </div>
  );
}

