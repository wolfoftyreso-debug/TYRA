"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBanner, StatusBadge } from "@/components/ui/Status";
import { computeTireWarnings } from "@/lib/domain/tireWarnings";

import {
  confirmAllAction,
  setFillGasAction,
  setInflationAction,
  setRimSeverityAction,
  setTreadDepthAction,
  setValveAgeAction
} from "./serverActions";

type Row = {
  id: string;
  position: string;
  tread_depth_mm: number | null;
  tread_depth_source: string | null;
  verified: boolean;
  ai_tread_depth_mm: number | null;
  ai_confidence: number | null;
  ai_model_version: string | null;
  wear_pattern?: string | null;
  damage_types?: string[] | null;
  tyre_brand?: string | null;
  tyre_model?: string | null;
  tyre_dimension?: string | null;
  dot_week?: number | null;
  dot_year?: number | null;
  notes?: string | null;
  valve_age_years?: number | null;
  valve_condition?: string | null;
  rim_severity?: string | null;
  tyre_pressure_kpa?: number | null;
  inflation_state?: string | null;
  fill_gas?: string | null;
};

function warningToneLabel(warnings: Array<{ tone: string; title: string; detail?: string | null }> | null | undefined) {
  const list = warnings ?? [];
  const blocked = list.filter((w) => w.tone === "blocked");
  const attention = list.filter((w) => w.tone === "attention");
  if (blocked.length) return { tone: "blocked" as const, label: `${blocked.length} åtgärd krävs` };
  if (attention.length) return { tone: "attention" as const, label: `${attention.length} varningar` };
  return null;
}

function posLabel(p: string) {
  if (p === "LF") return "Vänster fram";
  if (p === "RF") return "Höger fram";
  if (p === "LR") return "Vänster bak";
  if (p === "RR") return "Höger bak";
  if (p === "SPARE") return "Reservhjul";
  if (p === "LRO") return "Vänster bak (yttre)";
  if (p === "LRI") return "Vänster bak (inre)";
  if (p === "RRO") return "Höger bak (yttre)";
  if (p === "RRI") return "Höger bak (inre)";
  return p;
}

function parseKpa(s: string | undefined) {
  const raw = (s ?? "").trim();
  if (!raw) return null;
  const v = Number(raw.replace(",", "."));
  if (!Number.isFinite(v)) return NaN;
  return Math.trunc(v);
}

export function InspectionReviewClient(props: { inspectionId: string; rows: Row[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [valveDraft, setValveDraft] = useState<Record<string, string>>({});
  const [pressureDraft, setPressureDraft] = useState<Record<string, string>>({});

  const warnings = useMemo(() => {
    return computeTireWarnings({
      mountedSeason: null,
      positions: props.rows.map((r) => ({
        position: r.position,
        verified: r.verified === true,
        treadDepthMm: r.verified ? r.tread_depth_mm : null,
        tyreBrand: r.verified ? (r.tyre_brand ?? null) : null,
        tyreModel: r.verified ? (r.tyre_model ?? null) : null,
        tyreDimension: r.verified ? (r.tyre_dimension ?? null) : null,
        dotWeek: r.dot_week ?? null,
        dotYear: r.dot_year ?? null,
        valveAgeYears: r.valve_age_years ?? null,
        valveCondition: r.valve_condition ?? null,
        rimSeverity: r.rim_severity ?? null,
        tyrePressureKpa: r.tyre_pressure_kpa ?? null,
        inflationState: r.inflation_state ?? null,
        wearPattern: r.wear_pattern ?? null,
        damageTypes: (r.damage_types as any) ?? null,
        notes: r.notes ?? null
      }))
    });
  }, [props.rows]);

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
                  {(() => {
                    const wl = warningToneLabel(warnings.positionWarnings[r.position]);
                    return wl ? <StatusBadge tone={wl.tone} label={wl.label} /> : null;
                  })()}
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

                <div className="mt-3 text-sm text-[var(--tyra-muted)]">
                  Ventilstockar:{" "}
                  {r.valve_age_years != null ? (
                    <span className="font-medium">≈{r.valve_age_years} år</span>
                  ) : (
                    <span className="text-[var(--tyra-subtle)]">—</span>
                  )}
                  {r.valve_condition ? <span className="ml-2 text-[var(--tyra-subtle)]">{r.valve_condition}</span> : null}
                </div>

                <div className="mt-2 text-sm text-[var(--tyra-muted)]">
                  Fälg:{" "}
                  {r.rim_severity ? (
                    <span className="font-medium">
                      {r.rim_severity === "SAFETY" ? "Trafikfarlig" : r.rim_severity === "COSMETIC" ? "Kosmetisk" : "OK"}
                    </span>
                  ) : (
                    <span className="text-[var(--tyra-subtle)]">—</span>
                  )}
                </div>

                <div className="mt-2 text-sm text-[var(--tyra-muted)]">
                  Luft:{" "}
                  {r.inflation_state ? (
                    <span className="font-medium">
                      {r.inflation_state === "FLAT"
                        ? "Platt"
                        : r.inflation_state === "LOW"
                          ? "Lågt"
                          : r.inflation_state === "OK"
                            ? "OK"
                            : r.inflation_state}
                    </span>
                  ) : (
                    <span className="text-[var(--tyra-subtle)]">—</span>
                  )}
                  {r.tyre_pressure_kpa != null ? (
                    <span className="ml-2 text-[var(--tyra-subtle)]">{r.tyre_pressure_kpa} kPa</span>
                  ) : null}
                  <span className="ml-2 text-[var(--tyra-subtle)]">
                    • Fyllning: {r.fill_gas === "N2" ? "Nitrogen" : r.fill_gas === "AIR" ? "Luft" : "Okänd"}
                  </span>
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

                <div className="mt-4 text-xs font-medium text-[var(--tyra-muted)]">Ventil (år)</div>
                <input
                  value={valveDraft[r.position] ?? ""}
                  onChange={(e) => setValveDraft((d) => ({ ...d, [r.position]: e.target.value }))}
                  placeholder="t.ex 15"
                  inputMode="numeric"
                  className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-lg font-medium tracking-tight text-[var(--tyra-fg)] outline-none placeholder:text-[var(--tyra-subtle)]"
                />
                <Button
                  disabled={isPending}
                  tone="secondary"
                  size="lg"
                  className="mt-2 w-full"
                  onClick={() => {
                    const v = Number(String(valveDraft[r.position] ?? "").replace(",", "."));
                    if (!Number.isFinite(v) || v < 0 || v > 50) {
                      setErr("Ogiltig ventilålder.");
                      return;
                    }
                    setErr(null);
                    setOk(null);
                    startTransition(async () => {
                      try {
                        await setValveAgeAction({
                          inspectionId: props.inspectionId,
                          position: r.position,
                          valveAgeYears: Math.trunc(v),
                          valveCondition: "aging"
                        });
                        setOk(`${posLabel(r.position)} ventil sparad: ≈${Math.trunc(v)} år`);
                        router.refresh();
                      } catch (e) {
                        setErr(e instanceof Error ? e.message : "Kunde inte spara.");
                      }
                    });
                  }}
                >
                  Spara ventil
                </Button>

                <div className="mt-4 text-xs font-medium text-[var(--tyra-muted)]">Fälg</div>
                <div className="mt-2 grid gap-2">
                  <Button
                    disabled={isPending}
                    tone="secondary"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      setErr(null);
                      setOk(null);
                      startTransition(async () => {
                        try {
                          await setRimSeverityAction({ inspectionId: props.inspectionId, position: r.position, rimSeverity: "OK" });
                          setOk(`${posLabel(r.position)} fälg: OK`);
                          router.refresh();
                        } catch (e) {
                          setErr(e instanceof Error ? e.message : "Kunde inte spara.");
                        }
                      });
                    }}
                  >
                    Fälg OK
                  </Button>
                  <Button
                    disabled={isPending}
                    tone="secondary"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      setErr(null);
                      setOk(null);
                      startTransition(async () => {
                        try {
                          await setRimSeverityAction({
                            inspectionId: props.inspectionId,
                            position: r.position,
                            rimSeverity: "COSMETIC"
                          });
                          setOk(`${posLabel(r.position)} fälg: kosmetisk skada`);
                          router.refresh();
                        } catch (e) {
                          setErr(e instanceof Error ? e.message : "Kunde inte spara.");
                        }
                      });
                    }}
                  >
                    Kosmetisk
                  </Button>
                  <Button
                    disabled={isPending}
                    tone="destructive"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      setErr(null);
                      setOk(null);
                      startTransition(async () => {
                        try {
                          await setRimSeverityAction({
                            inspectionId: props.inspectionId,
                            position: r.position,
                            rimSeverity: "SAFETY"
                          });
                          setOk(`${posLabel(r.position)} fälg: trafikfarlig skada`);
                          router.refresh();
                        } catch (e) {
                          setErr(e instanceof Error ? e.message : "Kunde inte spara.");
                        }
                      });
                    }}
                  >
                    Trafikfarlig
                  </Button>
                </div>

                <div className="mt-4 text-xs font-medium text-[var(--tyra-muted)]">Luft (kPa)</div>
                <input
                  value={pressureDraft[r.position] ?? ""}
                  onChange={(e) => setPressureDraft((d) => ({ ...d, [r.position]: e.target.value }))}
                  placeholder="t.ex 230"
                  inputMode="numeric"
                  className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-lg font-medium tracking-tight text-[var(--tyra-fg)] outline-none placeholder:text-[var(--tyra-subtle)]"
                />
                <div className="mt-2 grid gap-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      disabled={isPending}
                      tone="secondary"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        setErr(null);
                        setOk(null);
                        startTransition(async () => {
                          try {
                            await setFillGasAction({ inspectionId: props.inspectionId, position: r.position, fillGas: "AIR" });
                            setOk(`${posLabel(r.position)} fyllning: Luft`);
                            router.refresh();
                          } catch (e) {
                            setErr(e instanceof Error ? e.message : "Kunde inte spara.");
                          }
                        });
                      }}
                    >
                      Luft
                    </Button>
                    <Button
                      disabled={isPending}
                      tone="secondary"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        setErr(null);
                        setOk(null);
                        startTransition(async () => {
                          try {
                            await setFillGasAction({ inspectionId: props.inspectionId, position: r.position, fillGas: "N2" });
                            setOk(`${posLabel(r.position)} fyllning: Nitrogen`);
                            router.refresh();
                          } catch (e) {
                            setErr(e instanceof Error ? e.message : "Kunde inte spara.");
                          }
                        });
                      }}
                    >
                      Nitrogen
                    </Button>
                    <Button
                      disabled={isPending}
                      tone="secondary"
                      size="lg"
                      className="w-full"
                      onClick={() => {
                        setErr(null);
                        setOk(null);
                        startTransition(async () => {
                          try {
                            await setFillGasAction({
                              inspectionId: props.inspectionId,
                              position: r.position,
                              fillGas: "UNKNOWN"
                            });
                            setOk(`${posLabel(r.position)} fyllning: Okänd`);
                            router.refresh();
                          } catch (e) {
                            setErr(e instanceof Error ? e.message : "Kunde inte spara.");
                          }
                        });
                      }}
                    >
                      Okänd
                    </Button>
                  </div>
                  <Button
                    disabled={isPending}
                    tone="secondary"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      setErr(null);
                      setOk(null);
                      const kpa = parseKpa(pressureDraft[r.position]);
                      if (Number.isNaN(kpa)) {
                        setErr("Ogiltigt tryck.");
                        return;
                      }
                      if (kpa != null && (kpa < 0 || kpa > 600)) {
                        setErr("Ogiltigt tryck.");
                        return;
                      }
                      startTransition(async () => {
                        try {
                          await setInflationAction({
                            inspectionId: props.inspectionId,
                            position: r.position,
                            inflationState: "OK",
                            tyrePressureKpa: kpa
                          });
                          setOk(`${posLabel(r.position)} luft: OK`);
                          router.refresh();
                        } catch (e) {
                          setErr(e instanceof Error ? e.message : "Kunde inte spara.");
                        }
                      });
                    }}
                  >
                    Luft OK
                  </Button>
                  <Button
                    disabled={isPending}
                    tone="secondary"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      setErr(null);
                      setOk(null);
                      const kpa = parseKpa(pressureDraft[r.position]);
                      if (Number.isNaN(kpa)) {
                        setErr("Ogiltigt tryck.");
                        return;
                      }
                      if (kpa != null && (kpa < 0 || kpa > 600)) {
                        setErr("Ogiltigt tryck.");
                        return;
                      }
                      startTransition(async () => {
                        try {
                          await setInflationAction({
                            inspectionId: props.inspectionId,
                            position: r.position,
                            inflationState: "LOW",
                            tyrePressureKpa: kpa
                          });
                          setOk(`${posLabel(r.position)} luft: lågt`);
                          router.refresh();
                        } catch (e) {
                          setErr(e instanceof Error ? e.message : "Kunde inte spara.");
                        }
                      });
                    }}
                  >
                    Lågt
                  </Button>
                  <Button
                    disabled={isPending}
                    tone="destructive"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      setErr(null);
                      setOk(null);
                      const kpa = parseKpa(pressureDraft[r.position]);
                      if (Number.isNaN(kpa)) {
                        setErr("Ogiltigt tryck.");
                        return;
                      }
                      if (kpa != null && (kpa < 0 || kpa > 600)) {
                        setErr("Ogiltigt tryck.");
                        return;
                      }
                      startTransition(async () => {
                        try {
                          await setInflationAction({
                            inspectionId: props.inspectionId,
                            position: r.position,
                            inflationState: "FLAT",
                            tyrePressureKpa: kpa ?? 0
                          });
                          setOk(`${posLabel(r.position)} luft: platt`);
                          router.refresh();
                        } catch (e) {
                          setErr(e instanceof Error ? e.message : "Kunde inte spara.");
                        }
                      });
                    }}
                  >
                    Platt
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

