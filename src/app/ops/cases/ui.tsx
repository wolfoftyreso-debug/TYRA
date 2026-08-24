"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBanner } from "@/components/ui/Status";

import { createDemoCaseAction } from "./serverActions";

export function DemoCaseButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <Card pad="lg">
      <div className="text-xs font-medium text-[var(--tyra-muted)]">Demo</div>
      <div className="mt-2 text-base text-[var(--tyra-muted)]">
        Skapar ett ärende från ett simulerat DMS-event (idempotent eventlogg + code mapping → canonical
        operations → workflow steps).
      </div>
      {error ? (
        <div className="mt-3">
          <StatusBanner tone="blocked" title="Kunde inte skapa">
            {error}
          </StatusBanner>
        </div>
      ) : null}
      <Button
        tone="primary"
        size="lg"
        className="mt-4"
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
      </Button>
    </Card>
  );
}

