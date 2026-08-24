"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { StatusBanner } from "@/components/ui/Status";

import { updateOrgPolicyAction } from "./serverActions";

export function SettingsClient(props: { forgottenDisposeAfterDays: number }) {
  const [isPending, startTransition] = useTransition();
  const [days, setDays] = useState(String(props.forgottenDisposeAfterDays ?? 60));
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div>
      {msg ? (
        <div className="mb-3">
          <StatusBanner tone="good" title="Sparat">
            {msg}
          </StatusBanner>
        </div>
      ) : null}

      <label className="block">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Dagar efter eskalering</div>
        <input
          value={days}
          onChange={(e) => setDays(e.target.value)}
          inputMode="numeric"
          className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-sm outline-none"
          placeholder="60"
        />
        <div className="mt-2 text-xs text-[var(--tyra-subtle)]">
          0 = kassera direkt efter eskalering. Vi capsar max till 3650 dagar.
        </div>
      </label>

      <Button
        tone="primary"
        size="lg"
        className="mt-4"
        disabled={isPending}
        onClick={() => {
          setMsg(null);
          startTransition(async () => {
            await updateOrgPolicyAction({ forgottenDisposeAfterDays: Number(days) });
            setMsg("Policy uppdaterad.");
          });
        }}
      >
        {isPending ? "Sparar…" : "Spara"}
      </Button>
    </div>
  );
}

