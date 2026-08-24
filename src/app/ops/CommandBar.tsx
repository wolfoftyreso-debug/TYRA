"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldRow } from "@/components/ui/Rows";

import type { CommandResponse } from "./serverActions";
import { runCommandAction } from "./serverActions";
import { HubLinkButton } from "./hub/HubLinkButton";

function pill(text: string) {
  return (
    <span className="rounded-full border border-[var(--tyra-border)] bg-[var(--tyra-surface)] px-3 py-1 text-xs text-[var(--tyra-muted)]">
      {text}
    </span>
  );
}

function EmptyHint() {
  return (
    <div className="mt-3 text-sm text-[var(--tyra-muted)]">
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

export function CommandBar() {
  const [text, setText] = useState("");
  const [last, setLast] = useState<CommandResponse | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const canSubmit = useMemo(() => text.trim().length > 0 && !isPending, [text, isPending]);

  return (
    <section className="mt-10">
      <Card pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Sök eller gör något…</div>

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
                    : res.to === "integrations"
                      ? "/ops/integrations"
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
            className="w-full rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-5 py-4 text-lg font-medium tracking-tight text-[var(--tyra-fg)] outline-none placeholder:text-[var(--tyra-subtle)] focus:border-[var(--tyra-focus)]"
            placeholder="ABC123"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label="Kommandofält"
          />

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="text-sm text-[var(--tyra-muted)]">
              {isPending
                ? "Söker…"
                : last?.kind === "unknown"
                  ? last.message
                  : last?.kind === "ok"
                    ? last.message
                    : " "}
            </div>
            <Button type="submit" tone="primary" size="lg" disabled={!canSubmit}>
              Kör
            </Button>
          </div>
        </form>

        {!last ? <EmptyHint /> : null}

        {last?.kind === "vehicle" ? (
          <div className="mt-4">
            <Card>
              {last.data ? (
                <>
                  <div className="text-xl font-semibold tracking-tight">
                    {last.data.make ? `${last.data.make} ` : ""}
                    {last.data.model ?? ""}{" "}
                    <span className="text-[var(--tyra-muted)]">{last.data.registration_number}</span>
                  </div>
                  <div className="mt-2 text-base text-[var(--tyra-muted)]">
                    Kund: {last.data.customer_name ?? "—"}
                  </div>

                  {last.data.customer_id ? <HubLinkButton customerId={last.data.customer_id} /> : null}

                  <div className="mt-5 space-y-2">
                    {last.data.wheel_sets.map((ws) => (
                      <div
                        key={ws.id}
                        className="rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-5 py-4"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-base font-semibold tracking-tight">
                            {ws.season === "winter"
                              ? "Vinterhjul"
                              : ws.season === "summer"
                                ? "Sommarhjul"
                                : ws.season}
                          </div>
                          <div className="text-sm text-[var(--tyra-muted)]">{ws.public_code ?? "—"}</div>
                        </div>
                        <div className="mt-3 grid gap-2">
                          <FieldRow label="Status" value={ws.status} />
                          <FieldRow label="Lager" value={ws.storage_code ?? "—"} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-base text-[var(--tyra-muted)]">Hittade inget fordon på det regnumret.</div>
              )}
            </Card>
          </div>
        ) : null}

        {last?.kind === "position" ? (
          <div className="mt-4">
            <Card>
              {last.data ? (
                <>
                  <div className="text-xl font-semibold tracking-tight">
                    Lagerplats <span className="text-[var(--tyra-muted)]">{last.data.position.code}</span>
                  </div>
                  <div className="mt-5 space-y-2">
                    {last.data.wheelSets.length ? (
                      last.data.wheelSets.map((ws) => (
                        <div
                          key={ws.wheel_set_id}
                          className="rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-5 py-4"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-base font-semibold tracking-tight">
                              {ws.registration_number ?? "—"}
                            </div>
                            <div className="text-sm text-[var(--tyra-muted)]">{ws.public_code ?? "—"}</div>
                          </div>
                          <div className="mt-2 text-base text-[var(--tyra-muted)]">
                            {ws.customer_name ?? "—"} •{" "}
                            {(ws.make && ws.model) ? `${ws.make} ${ws.model}` : "—"}
                          </div>
                          <div className="mt-3 grid gap-2">
                            <FieldRow label="Säsong" value={ws.season} />
                            <FieldRow label="Status" value={ws.status} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-base text-[var(--tyra-muted)]">Inga hjuluppsättningar på platsen.</div>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-base text-[var(--tyra-muted)]">Hittade ingen sådan lagerplats.</div>
              )}
            </Card>
          </div>
        ) : null}

        {last?.kind === "wheel_set" ? (
          <div className="mt-4">
            <Card>
              {last.data ? (
                <>
                  <div className="text-xl font-semibold tracking-tight">
                    {last.data.public_code}{" "}
                    <span className="text-[var(--tyra-muted)]">{last.data.registration_number ?? ""}</span>
                  </div>
                  <div className="mt-2 text-base text-[var(--tyra-muted)]">
                    {last.data.customer_name ?? "—"} •{" "}
                    {(last.data.make && last.data.model) ? `${last.data.make} ${last.data.model}` : "—"}
                  </div>
                  <div className="mt-5 grid gap-2">
                    <FieldRow label="Säsong" value={last.data.season} />
                    <FieldRow label="Status" value={last.data.status} />
                    <FieldRow label="Lager" value={last.data.storage_code ?? "—"} />
                  </div>
                </>
              ) : (
                <div className="text-base text-[var(--tyra-muted)]">Hittade ingen hjuluppsättning på den koden.</div>
              )}
            </Card>
          </div>
        ) : null}
      </Card>
    </section>
  );
}

