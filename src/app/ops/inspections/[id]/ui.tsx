"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBanner, StatusBadge } from "@/components/ui/Status";

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
  const [ok, setOk] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});

  return (
    <div className="mt-8">
      {err ? (
        <StatusBanner tone="blocked" title="Kunde inte spara" className="mb-4">
          {err}
        </StatusBanner>
      ) : null}

      {ok ? (
        <StatusBanner tone="good" title="Sparat" className="mb-4">
          {ok}
        </StatusBanner>
      ) : null}

      <Button
        tone="primary"
        size="xl"
        disabled={isPending}
        onClick={() => {
          setErr(null);
          setOk(null);
          startTransition(async () => {
            try {
              await confirmAllAction({ inspectionId: props.inspectionId });
              setOk("Alla positioner är verifierade.");
              router.refresh();
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Kunde inte godkänna.");
            }
          });
        }}
      >
        {isPending ? "Sparar…" : "Allt stämmer — godkänn alla"}
      </Button>

      <div className="mt-6 space-y-2">
        {props.rows.map((r) => (
          <Card key={r.id} pad="lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="text-lg font-semibold tracking-tight">{posLabel(r.position)}</div>
                  <StatusBadge
                    tone={r.verified ? "good" : "attention"}
                    label={r.verified ? "Verifierad" : "Behöver verifieras"}
                  />
                </div>

                <div className="mt-3 text-base text-[var(--tyra-muted)]">
                  Gällande{" "}
                  {r.verified && r.tread_depth_mm != null ? (
                    <span className="font-medium">{r.tread_depth_mm.toFixed(1)} mm</span>
                  ) : (
                    <span className="text-[var(--tyra-subtle)]">Ej verifierat</span>
                  )}
                  <span className="ml-2 text-sm text-[var(--tyra-subtle)]">{r.tread_depth_source ?? ""}</span>
                </div>

                <div className="mt-2 text-base text-[var(--tyra-muted)]">
                  AI-förslag{" "}
                  {r.ai_tread_depth_mm != null ? (
                    <>
                      <span className="font-medium">{r.ai_tread_depth_mm.toFixed(1)} mm</span>
                      {r.ai_confidence != null ? (
                        <span className="ml-2 text-sm text-[var(--tyra-subtle)]">
                          conf {Math.round(r.ai_confidence * 100)}%
                        </span>
                      ) : null}
                      {r.ai_model_version ? (
                        <span className="ml-2 text-sm text-[var(--tyra-subtle)]">{r.ai_model_version}</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-[var(--tyra-subtle)]">—</span>
                  )}
                </div>
              </div>

              <div className="w-44">
                <div className="text-xs font-medium text-[var(--tyra-muted)]">Mätning</div>
                <input
                  value={draft[r.position] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [r.position]: e.target.value }))}
                  placeholder="t.ex 6.0"
                  inputMode="decimal"
                  className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-lg font-medium tracking-tight text-[var(--tyra-fg)] outline-none placeholder:text-[var(--tyra-subtle)]"
                />
                <Button
                  disabled={isPending}
                  tone="secondary"
                  size="lg"
                  className="mt-2 w-full"
                  onClick={() => {
                    const v = Number(String(draft[r.position] ?? "").replace(",", "."));
                    if (!Number.isFinite(v)) {
                      setErr("Ogiltigt värde.");
                      return;
                    }
                    setErr(null);
                    setOk(null);
                    startTransition(async () => {
                      try {
                        await setTreadDepthAction({
                          inspectionId: props.inspectionId,
                          position: r.position,
                          treadDepthMm: v
                        });
                        setOk(`${posLabel(r.position)} sparat: ${v.toFixed(1)} mm`);
                        router.refresh();
                      } catch (e) {
                        setErr(e instanceof Error ? e.message : "Kunde inte spara.");
                      }
                    });
                  }}
                >
                  Spara
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

