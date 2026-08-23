"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { blockCaseAction, markStepDoneAction } from "./serverActions";

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

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-medium text-white/60">Nästa handling</div>
        <div className="mt-2 text-sm text-white/90">{nextTodo ? nextTodo.title : "Klart."}</div>
        <button
          disabled={!nextTodo || isPending}
          className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#0b0c0e] disabled:opacity-40"
          onClick={() => {
            if (!nextTodo) return;
            setErr(null);
            startTransition(async () => {
              try {
                await markStepDoneAction({ tireCaseId: props.tireCaseId, stepKind: nextTodo.kind });
                router.refresh();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Kunde inte uppdatera steg.");
              }
            });
          }}
        >
          Markera klart
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-medium text-white/60">Kan inte fortsätta</div>
        <div className="mt-2 text-sm text-white/80">
          Välj en avvikelseåtgärd. Ärendet blir BLOCKED med strukturerad orsak och audit.
        </div>

        {err ? (
          <div className="mt-3 rounded-xl border border-red-200/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}

        <label className="mt-4 block">
          <div className="text-xs font-medium text-white/60">Orsak</div>
          <select
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value as any)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0c0e] px-3 py-2 text-sm text-white/90 outline-none"
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
            <div className="text-xs font-medium text-white/60">Hur många hjul saknas?</div>
            <input
              type="number"
              min={1}
              max={4}
              value={missingWheelCount}
              onChange={(e) => setMissingWheelCount(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0c0e] px-3 py-2 text-sm text-white/90 outline-none"
            />
          </label>
        ) : null}

        <label className="mt-3 block">
          <div className="text-xs font-medium text-white/60">Förväntad plats</div>
          <input
            value={expectedPosition}
            onChange={(e) => setExpectedPosition(e.target.value.toUpperCase())}
            placeholder="B-14-03"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0c0e] px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/40"
          />
        </label>

        <label className="mt-3 block">
          <div className="text-xs font-medium text-white/60">Sökta platser</div>
          <input
            value={searchedPositions}
            onChange={(e) => setSearchedPositions(e.target.value.toUpperCase())}
            placeholder="B-14-03, B-14-04"
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0c0e] px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/40"
          />
        </label>

        <label className="mt-3 block">
          <div className="text-xs font-medium text-white/60">Notering</div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0c0e] px-3 py-2 text-sm text-white/90 outline-none"
          />
        </label>

        <button
          disabled={isPending}
          className="mt-4 rounded-xl border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/90 disabled:opacity-40"
          onClick={() => {
            setErr(null);
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
                router.refresh();
              } catch (e) {
                setErr(e instanceof Error ? e.message : "Kunde inte blocka ärendet.");
              }
            });
          }}
        >
          Stoppa med orsak
        </button>
      </div>
    </div>
  );
}

