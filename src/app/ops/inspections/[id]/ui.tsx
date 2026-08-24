"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { confirmAllAction, setTreadDepthAction } from "./serverActions";

type Row = {
  id: string;
  position: "LF" | "RF" | "LR" | "RR";
  tread_depth_mm: number | null;
  tread_depth_source: string | null;
  verified: boolean;
  ai_tread_depth_mm: number | null;
  ai_confidence: number | null;
  ai_model_version: string | null;
};

function posLabel(p: string) {
  if (p === "LF") return "Vänster fram";
  if (p === "RF") return "Höger fram";
  if (p === "LR") return "Vänster bak";
  if (p === "RR") return "Höger bak";
  return p;
}

export function InspectionReviewClient(props: { inspectionId: string; rows: Row[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  return (
    <div className="mt-8">
      {err ? (
        <div className="mb-4 rounded-xl border border-red-200/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      <button
        disabled={isPending}
        className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#0b0c0e] disabled:opacity-40"
        onClick={() => {
          setErr(null);
          startTransition(async () => {
            try {
              await confirmAllAction({ inspectionId: props.inspectionId });
              router.refresh();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Kunde inte godkänna.");
            }
          });
        }}
      >
        {isPending ? "Sparar…" : "Allt stämmer — godkänn alla"}
      </button>

      <div className="mt-6 space-y-2">
        {props.rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white/90">{posLabel(r.position)}</div>
                <div className="mt-2 text-sm text-white/80">
                  Gällande:{" "}
                  {r.verified && r.tread_depth_mm != null ? (
                    <span className="font-medium">{r.tread_depth_mm.toFixed(1)} mm</span>
                  ) : (
                    <span className="text-white/60">Ej verifierat</span>
                  )}
                  <span className="ml-2 text-xs text-white/50">{r.tread_depth_source ?? ""}</span>
                </div>

                <div className="mt-2 text-sm text-white/70">
                  AI-förslag:{" "}
                  {r.ai_tread_depth_mm != null ? (
                    <>
                      <span className="font-medium">{r.ai_tread_depth_mm.toFixed(1)} mm</span>
                      {r.ai_confidence != null ? (
                        <span className="ml-2 text-xs text-white/50">
                          conf {Math.round(r.ai_confidence * 100)}%
                        </span>
                      ) : null}
                      {r.ai_model_version ? (
                        <span className="ml-2 text-xs text-white/50">{r.ai_model_version}</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-white/60">—</span>
                  )}
                </div>
              </div>

              <div className="w-40">
                <div className="text-xs font-medium text-white/60">Mätning</div>
                <input
                  value={draft[r.position] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [r.position]: e.target.value }))}
                  placeholder="t.ex 6.0"
                  inputMode="decimal"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b0c0e] px-3 py-2 text-sm text-white/90 outline-none placeholder:text-white/40"
                />
                <button
                  disabled={isPending}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-transparent px-3 py-2 text-sm font-medium text-white/90 disabled:opacity-40"
                  onClick={() => {
                    const v = Number(String(draft[r.position] ?? "").replace(",", "."));
                    if (!Number.isFinite(v)) {
                      setErr("Ogiltigt värde.");
                      return;
                    }
                    setErr(null);
                    startTransition(async () => {
                      try {
                        await setTreadDepthAction({
                          inspectionId: props.inspectionId,
                          position: r.position,
                          treadDepthMm: v
                        });
                        router.refresh();
                      } catch (e) {
                        setErr(e instanceof Error ? e.message : "Kunde inte spara.");
                      }
                    });
                  }}
                >
                  Spara
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

