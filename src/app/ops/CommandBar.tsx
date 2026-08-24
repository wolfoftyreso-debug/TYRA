"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import type { CommandResponse } from "./serverActions";
import { runCommandAction } from "./serverActions";
import { HubLinkButton } from "./hub/HubLinkButton";

function pill(text: string) {
  return (
    <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white/70">
      {text}
    </span>
  );
}

function EmptyHint() {
  return (
    <div className="mt-3 text-sm text-white/60">
      <div className="flex flex-wrap gap-2">
        {pill("ärenden")}
        {pill("ABC123")}
        {pill("A-04-B-12")}
        {pill("WS-7K2F")}
        {pill("plockkö")}
        {pill("offerter")}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6">
      <div className="text-xs font-medium text-white/60">{label}</div>
      <div className="text-sm text-white/90">{value}</div>
    </div>
  );
}

export function CommandBar() {
  const [text, setText] = useState("");
  const [last, setLast] = useState<CommandResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canSubmit = useMemo(() => text.trim().length > 0 && !isPending, [text, isPending]);

  return (
    <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs font-medium text-white/60">Sök eller gör något…</div>

      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          const q = text;
          startTransition(async () => {
            const res = await runCommandAction({ text: q });
            if (res.kind === "navigate") {
              router.push(
                res.to === "pick_queue"
                  ? "/ops/pick"
                  : res.to === "quotes_queue"
                    ? "/ops/quotes"
                    : "/ops/cases"
              );
              return;
            }
            setLast(res);
          });
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-[#0b0c0e] px-4 py-3 text-sm text-white/90 outline-none placeholder:text-white/40 focus:border-white/20"
          placeholder="ABC123"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          aria-label="Kommandofält"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-white/50">
            {isPending ? "Söker…" : last?.kind === "unknown" ? last.message : " "}
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-[#0b0c0e] disabled:opacity-40"
          >
            Kör
          </button>
        </div>
      </form>

      {!last ? <EmptyHint /> : null}

      {last?.kind === "vehicle" ? (
        <Card>
          {last.data ? (
            <>
              <div className="text-lg font-semibold tracking-tight">
                {last.data.make ? `${last.data.make} ` : ""}
                {last.data.model ?? ""}{" "}
                <span className="text-white/60">{last.data.registration_number}</span>
              </div>
              <div className="mt-1 text-sm text-white/70">
                Kund: {last.data.customer_name ?? "—"}
              </div>

              {last.data.customer_id ? <HubLinkButton customerId={last.data.customer_id} /> : null}

              <div className="mt-4 space-y-2">
                {last.data.wheel_sets.map((ws) => (
                  <div
                    key={ws.id}
                    className="rounded-xl border border-white/10 bg-[#0b0c0e] px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-white/90">
                        {ws.season === "winter"
                          ? "Vinterhjul"
                          : ws.season === "summer"
                            ? "Sommarhjul"
                            : ws.season}
                      </div>
                      <div className="text-xs text-white/60">{ws.public_code ?? "—"}</div>
                    </div>
                    <div className="mt-2 grid gap-1">
                      <Row label="Status" value={ws.status} />
                      <Row label="Lager" value={ws.storage_code ?? "—"} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-sm text-white/70">Hittade inget fordon på det regnumret.</div>
          )}
        </Card>
      ) : null}

      {last?.kind === "position" ? (
        <Card>
          {last.data ? (
            <>
              <div className="text-lg font-semibold tracking-tight">
                Lagerplats <span className="text-white/70">{last.data.position.code}</span>
              </div>
              <div className="mt-4 space-y-2">
                {last.data.wheelSets.length ? (
                  last.data.wheelSets.map((ws) => (
                    <div
                      key={ws.wheel_set_id}
                      className="rounded-xl border border-white/10 bg-[#0b0c0e] px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-white/90">
                          {ws.registration_number ?? "—"}
                        </div>
                        <div className="text-xs text-white/60">{ws.public_code ?? "—"}</div>
                      </div>
                      <div className="mt-1 text-sm text-white/70">
                        {ws.customer_name ?? "—"} •{" "}
                        {(ws.make && ws.model) ? `${ws.make} ${ws.model}` : "—"}
                      </div>
                      <div className="mt-2 grid gap-1">
                        <Row label="Säsong" value={ws.season} />
                        <Row label="Status" value={ws.status} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-white/70">Inga hjuluppsättningar på platsen.</div>
                )}
              </div>
            </>
          ) : (
            <div className="text-sm text-white/70">Hittade ingen sådan lagerplats.</div>
          )}
        </Card>
      ) : null}

      {last?.kind === "wheel_set" ? (
        <Card>
          {last.data ? (
            <>
              <div className="text-lg font-semibold tracking-tight">
                {last.data.public_code}{" "}
                <span className="text-white/60">{last.data.registration_number ?? ""}</span>
              </div>
              <div className="mt-1 text-sm text-white/70">
                {last.data.customer_name ?? "—"} •{" "}
                {(last.data.make && last.data.model) ? `${last.data.make} ${last.data.model}` : "—"}
              </div>
              <div className="mt-4 grid gap-1">
                <Row label="Säsong" value={last.data.season} />
                <Row label="Status" value={last.data.status} />
                <Row label="Lager" value={last.data.storage_code ?? "—"} />
              </div>
            </>
          ) : (
            <div className="text-sm text-white/70">Hittade ingen hjuluppsättning på den koden.</div>
          )}
        </Card>
      ) : null}
    </section>
  );
}

