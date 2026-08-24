"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBanner } from "@/components/ui/Status";

import { blockCaseAction, markStepDoneAction, setCustomerReadyAction } from "./serverActions";

type Step = { kind: string; title: string; status: string };

export function WorkControls(props: { tireCaseId: string; steps: Step[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const nextTodo = useMemo(() => props.steps.find((s) => s.status === "TODO") ?? null, [props.steps]);

  const [blockReason, setBlockReason] = useState<
    "WHEEL_SET_NOT_FOUND" | "MISSING_WHEEL" | "WRONG_WHEEL_SET_ON_POSITION" | "TPMS_FAULT" | "OTHER"
  >("WHEEL_SET_NOT_FOUND");
  const [missingWheelCount, setMissingWheelCount] = useState(1);
  const [expectedPosition, setExpectedPosition] = useState("");
  const [searchedPositions, setSearchedPositions] = useState("");
  const [notes, setNotes] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Card pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Nästa handling</div>
        <div className="mt-2 text-2xl font-semibold tracking-tight">{nextTodo ? nextTodo.title : "Klart."}</div>

        {err ? (
          <StatusBanner tone="blocked" title="Kunde inte spara">
            {err}
          </StatusBanner>
        ) : null}

        {ok ? (
          <div className="mt-3">
            <StatusBanner tone="good" title="Klart">
              {ok}
            </StatusBanner>
          </div>
        ) : null}

        <div className="mt-4 grid gap-2">
          <Button
            tone="primary"
            size="xl"
            disabled={!nextTodo || isPending}
            onClick={() => {
              if (!nextTodo) return;
              setErr(null);
              setOk(null);
              startTransition(async () => {
                try {
                  await markStepDoneAction({ tireCaseId: props.tireCaseId, stepKind: nextTodo.kind });
                  setOk(`${nextTodo.title} markerat som klart.`);
                  router.refresh();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Kunde inte uppdatera steg.");
                }
              });
            }}
          >
            {isPending ? "Sparar…" : "Markera klart"}
          </Button>

          <Button
            tone="secondary"
            size="lg"
            disabled={isPending}
            onClick={() => {
              setErr(null);
              setOk(null);
              startTransition(async () => {
                try {
                  await setCustomerReadyAction({ tireCaseId: props.tireCaseId, ready: true });
                  setOk("Bilen kan lämnas ut.");
                  router.refresh();
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Kunde inte uppdatera.");
                }
              });
            }}
          >
            Bilen kan lämnas ut
          </Button>
        </div>
      </Card>

      <Card pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Kan inte fortsätta</div>
        <div className="mt-2 text-base text-[var(--tyra-muted)]">
          Välj en avvikelseåtgärd. Ärendet blir BLOCKED med strukturerad orsak och audit.
        </div>

        {err ? (
          <div className="mt-3">
            <StatusBanner tone="blocked" title="Kan inte fortsätta">
              {err}
            </StatusBanner>
          </div>
        ) : null}

        <label className="mt-4 block">
          <div className="text-xs font-medium text-[var(--tyra-muted)]">Orsak</div>
          <select
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value as any)}
            className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base text-[var(--tyra-fg)] outline-none"
          >
            <option value="WHEEL_SET_NOT_FOUND">Hjulset hittas inte</option>
            <option value="WRONG_WHEEL_SET_ON_POSITION">Fel hjul på platsen</option>
            <option value="MISSING_WHEEL">Ett eller flera hjul saknas</option>
            <option value="TPMS_FAULT">TPMS-fel</option>
            <option value="OTHER">Annat</option>
          </select>
        </label>

        {blockReason === "MISSING_WHEEL" ? (
          <label className="mt-3 block">
            <div className="text-xs font-medium text-[var(--tyra-muted)]">Hur många hjul saknas?</div>
            <input
              type="number"
              min={1}
              max={4}
              value={missingWheelCount}
              onChange={(e) => setMissingWheelCount(Number(e.target.value))}
              className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base text-[var(--tyra-fg)] outline-none"
            />
          </label>
        ) : null}

        <label className="mt-3 block">
          <div className="text-xs font-medium text-[var(--tyra-muted)]">Förväntad plats</div>
          <input
            value={expectedPosition}
            onChange={(e) => setExpectedPosition(e.target.value.toUpperCase())}
            placeholder="B-14-03"
            className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base text-[var(--tyra-fg)] outline-none placeholder:text-[var(--tyra-subtle)]"
          />
        </label>

        <label className="mt-3 block">
          <div className="text-xs font-medium text-[var(--tyra-muted)]">Sökta platser</div>
          <input
            value={searchedPositions}
            onChange={(e) => setSearchedPositions(e.target.value.toUpperCase())}
            placeholder="B-14-03, B-14-04"
            className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base text-[var(--tyra-fg)] outline-none placeholder:text-[var(--tyra-subtle)]"
          />
        </label>

        <label className="mt-3 block">
          <div className="text-xs font-medium text-[var(--tyra-muted)]">Notering</div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base text-[var(--tyra-fg)] outline-none"
          />
        </label>

        <Button
          disabled={isPending}
          tone="destructive"
          size="lg"
          className="mt-4 w-full"
          onClick={() => {
            setErr(null);
            setOk(null);
            startTransition(async () => {
              try {
                await blockCaseAction({
                  tireCaseId: props.tireCaseId,
                  reason: blockReason,
                  details: {
                    expectedPosition: expectedPosition || null,
                    searchedPositions:
                      searchedPositions
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean) || [],
                    missingWheelCount: blockReason === "MISSING_WHEEL" ? missingWheelCount : null,
                    notes: notes || null
                  }
                });
                setOk("Ärendet är stoppat med orsak.");
                router.refresh();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Kunde inte blocka ärendet.");
              }
            });
          }}
        >
          {isPending ? "Sparar…" : "Stoppa med orsak"}
        </Button>
      </Card>
    </div>
  );
}

