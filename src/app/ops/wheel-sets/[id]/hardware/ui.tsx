"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBanner } from "@/components/ui/Status";

import { updateHardwareAction } from "./serverActions";

type Hardware = {
  hasCenterBore: boolean | null;
  centerBoreNotes: string | null;
  hasHubRings: boolean | null;
  hubRingDimensions: string | null;
  hubRingNotes: string | null;
  centerCapType: "NONE" | "PLASTIC_CAP" | "LUG_COVERS" | "UNKNOWN" | null;
  capNotes: string | null;
  hasWheelLock: boolean | null;
  wheelLockKeyPresent: boolean | null;
  wheelLockKeyLocation: string | null;
  boltsSummer: string | null;
  boltsWinter: string | null;
  notes: string | null;
};

function segValue<T extends string>(v: T | null | undefined) {
  return v ?? "";
}

export function HardwareClient(props: { wheelSetId: string; initial: Hardware }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [state, setState] = useState<Hardware>(props.initial);

  const canSave = useMemo(() => !isPending, [isPending]);

  async function save(patch: Partial<Hardware>, okMsg: string) {
    setErr(null);
    setOk(null);
    start(async () => {
      try {
        await updateHardwareAction({ wheelSetId: props.wheelSetId, patch: patch as any });
        setState((s) => ({ ...s, ...patch }));
        setOk(okMsg);
        router.refresh();
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Kunde inte spara.");
      }
    });
  }

  return (
    <div className="mt-6 grid gap-3">
      {err ? (
        <StatusBanner tone="blocked" title="Kunde inte spara">
          {err}
        </StatusBanner>
      ) : null}
      {ok ? (
        <StatusBanner tone="good" title="Sparat">
          {ok}
        </StatusBanner>
      ) : null}

      <Card pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Centreringshål</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button
            tone={state.hasCenterBore === true ? "primary" : "secondary"}
            size="lg"
            disabled={!canSave}
            onClick={() => save({ hasCenterBore: true }, "Centreringshål: finns")}
          >
            Finns
          </Button>
          <Button
            tone={state.hasCenterBore === false ? "destructive" : "secondary"}
            size="lg"
            disabled={!canSave}
            onClick={() => save({ hasCenterBore: false }, "Centreringshål: saknas")}
          >
            Saknas
          </Button>
          <Button
            tone={state.hasCenterBore == null ? "secondary" : "tertiary"}
            size="lg"
            disabled={!canSave}
            onClick={() => save({ hasCenterBore: null }, "Centreringshål: okänt")}
          >
            Okänt
          </Button>
        </div>
        <input
          value={state.centerBoreNotes ?? ""}
          onChange={(e) => setState((s) => ({ ...s, centerBoreNotes: e.target.value }))}
          placeholder="Notering (t.ex. kräver ringar)"
          className="mt-3 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base outline-none placeholder:text-[var(--tyra-subtle)]"
        />
        <Button
          className="mt-2"
          tone="secondary"
          size="lg"
          disabled={!canSave}
          onClick={() => save({ centerBoreNotes: state.centerBoreNotes || null }, "Notering sparad")}
        >
          Spara notering
        </Button>
      </Card>

      <Card pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Navringar</div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Button
            tone={state.hasHubRings === true ? "primary" : "secondary"}
            size="lg"
            disabled={!canSave}
            onClick={() => save({ hasHubRings: true }, "Navringar: ja")}
          >
            Finns
          </Button>
          <Button
            tone={state.hasHubRings === false ? "secondary" : "tertiary"}
            size="lg"
            disabled={!canSave}
            onClick={() => save({ hasHubRings: false, hubRingDimensions: null, hubRingNotes: null }, "Navringar: nej")}
          >
            Inga
          </Button>
          <Button
            tone={state.hasHubRings == null ? "secondary" : "tertiary"}
            size="lg"
            disabled={!canSave}
            onClick={() => save({ hasHubRings: null }, "Navringar: okänt")}
          >
            Okänt
          </Button>
        </div>

        {state.hasHubRings ? (
          <>
            <input
              value={state.hubRingDimensions ?? ""}
              onChange={(e) => setState((s) => ({ ...s, hubRingDimensions: e.target.value }))}
              placeholder="Dimension (t.ex. 72.6→66.6)"
              className="mt-3 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base outline-none placeholder:text-[var(--tyra-subtle)]"
            />
            <Button
              className="mt-2"
              tone="secondary"
              size="lg"
              disabled={!canSave}
              onClick={() => save({ hubRingDimensions: state.hubRingDimensions || null }, "Dimension sparad")}
            >
              Spara dimension
            </Button>
            <input
              value={state.hubRingNotes ?? ""}
              onChange={(e) => setState((s) => ({ ...s, hubRingNotes: e.target.value }))}
              placeholder="Notering (t.ex. plast/aluminium, sitter i fälg)"
              className="mt-3 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base outline-none placeholder:text-[var(--tyra-subtle)]"
            />
            <Button
              className="mt-2"
              tone="secondary"
              size="lg"
              disabled={!canSave}
              onClick={() => save({ hubRingNotes: state.hubRingNotes || null }, "Notering sparad")}
            >
              Spara notering
            </Button>
          </>
        ) : null}
      </Card>

      <Card pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Kåpor</div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["NONE", "Inga"],
            ["PLASTIC_CAP", "Plastkåpa"],
            ["LUG_COVERS", "Kåpor på skruv"],
            ["UNKNOWN", "Okänt"]
          ].map(([v, label]) => (
            <Button
              key={v}
              tone={segValue(state.centerCapType) === v ? "primary" : "secondary"}
              size="lg"
              disabled={!canSave}
              onClick={() => save({ centerCapType: v as any }, `Kåpor: ${label}`)}
            >
              {label}
            </Button>
          ))}
        </div>
        <input
          value={state.capNotes ?? ""}
          onChange={(e) => setState((s) => ({ ...s, capNotes: e.target.value }))}
          placeholder="Notering (t.ex. specialverktyg för kåpa)"
          className="mt-3 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base outline-none placeholder:text-[var(--tyra-subtle)]"
        />
        <Button className="mt-2" tone="secondary" size="lg" disabled={!canSave} onClick={() => save({ capNotes: state.capNotes || null }, "Notering sparad")}>
          Spara notering
        </Button>
      </Card>

      <Card pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Hjullås</div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            tone={state.hasWheelLock === true ? "primary" : "secondary"}
            size="lg"
            disabled={!canSave}
            onClick={() => save({ hasWheelLock: true }, "Hjullås: ja")}
          >
            Har hjullås
          </Button>
          <Button
            tone={state.hasWheelLock === false ? "secondary" : "tertiary"}
            size="lg"
            disabled={!canSave}
            onClick={() => save({ hasWheelLock: false, wheelLockKeyPresent: null, wheelLockKeyLocation: null }, "Hjullås: nej")}
          >
            Inget hjullås
          </Button>
        </div>

        {state.hasWheelLock ? (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                tone={state.wheelLockKeyPresent === true ? "primary" : "secondary"}
                size="lg"
                disabled={!canSave}
                onClick={() => save({ wheelLockKeyPresent: true }, "Hjullåsnyckel: finns")}
              >
                Nyckel finns
              </Button>
              <Button
                tone={state.wheelLockKeyPresent === false ? "destructive" : "secondary"}
                size="lg"
                disabled={!canSave}
                onClick={() => save({ wheelLockKeyPresent: false }, "Hjullåsnyckel: saknas")}
              >
                Nyckel saknas
              </Button>
            </div>
            <input
              value={state.wheelLockKeyLocation ?? ""}
              onChange={(e) => setState((s) => ({ ...s, wheelLockKeyLocation: e.target.value }))}
              placeholder="Var ligger nyckeln? (t.ex. bagage höger, under golv)"
              className="mt-3 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base outline-none placeholder:text-[var(--tyra-subtle)]"
            />
            <Button
              className="mt-2"
              tone="secondary"
              size="lg"
              disabled={!canSave}
              onClick={() => save({ wheelLockKeyLocation: state.wheelLockKeyLocation || null }, "Nyckelplats sparad")}
            >
              Spara nyckelplats
            </Button>
          </>
        ) : null}
      </Card>

      <Card pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Bultar (sommar/vinter)</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-[var(--tyra-muted)]">Sommar</div>
            <input
              value={state.boltsSummer ?? ""}
              onChange={(e) => setState((s) => ({ ...s, boltsSummer: e.target.value }))}
              placeholder="t.ex. konisk M14x1.5"
              className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base outline-none placeholder:text-[var(--tyra-subtle)]"
            />
            <Button className="mt-2" tone="secondary" size="lg" disabled={!canSave} onClick={() => save({ boltsSummer: state.boltsSummer || null }, "Sommarbultar sparade")}>
              Spara sommar
            </Button>
          </div>
          <div>
            <div className="text-xs font-medium text-[var(--tyra-muted)]">Vinter</div>
            <input
              value={state.boltsWinter ?? ""}
              onChange={(e) => setState((s) => ({ ...s, boltsWinter: e.target.value }))}
              placeholder="t.ex. kulform M14x1.5"
              className="mt-2 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base outline-none placeholder:text-[var(--tyra-subtle)]"
            />
            <Button className="mt-2" tone="secondary" size="lg" disabled={!canSave} onClick={() => save({ boltsWinter: state.boltsWinter || null }, "Vinterbultar sparade")}>
              Spara vinter
            </Button>
          </div>
        </div>
      </Card>

      <Card pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Övrigt</div>
        <textarea
          value={state.notes ?? ""}
          onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
          placeholder="Övriga noteringar (t.ex. specialhylsa, känsliga kåpor, etc.)"
          className="mt-3 min-h-24 w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-4 py-3 text-base outline-none placeholder:text-[var(--tyra-subtle)]"
        />
        <Button className="mt-2" tone="secondary" size="lg" disabled={!canSave} onClick={() => save({ notes: state.notes || null }, "Noteringar sparade")}>
          Spara noteringar
        </Button>
      </Card>
    </div>
  );
}

