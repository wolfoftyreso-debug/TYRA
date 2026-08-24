"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBanner } from "@/components/ui/Status";

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
      {confirmed ? (
        <div className="text-left">
          <StatusBanner tone="good" title="Beställning mottagen">
            Vi har tagit emot din beställning.
          </StatusBanner>
        </div>
      ) : null}

      {!selected && !confirmed ? (
        <Button
          tone="primary"
          size="lg"
          disabled={isPending}
          onClick={() => {
            setErr(null);
            setSelected(true);
          }}
        >
          Välj
        </Button>
      ) : null}

      {selected && !confirmed ? (
        <Card className="mt-3 text-left" pad="sm">
          <div className="text-xs font-medium text-[var(--tyra-muted)]">Bekräfta din bil</div>
          <div className="mt-1 text-xs text-[var(--tyra-muted)]">
            Ange registreringsnumret för bilen som beställningen gäller.
          </div>
          <input
            value={reg}
            onChange={(e) => setReg(e.target.value.toUpperCase())}
            className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base font-medium tracking-tight outline-none placeholder:text-[var(--tyra-subtle)]"
            placeholder="ABC123"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          <Button
            tone="primary"
            size="lg"
            className="mt-3 w-full"
            disabled={isPending || reg.trim().length < 3}
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
          </Button>

          <div className="mt-2 text-xs text-[var(--tyra-subtle)]">
            Priset snapshotas vid beställning. Betalning sker hos verkstaden.
          </div>
        </Card>
      ) : null}

      {err ? (
        <div className="mt-2 text-left">
          <StatusBanner tone="blocked" title="Kunde inte beställa">
            {err}
          </StatusBanner>
        </div>
      ) : null}
    </div>
  );
}

