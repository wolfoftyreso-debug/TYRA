import { formatSekFromOre } from "@/lib/domain/pricing";
import { getHubViewByToken } from "@/lib/server/hub";

import { Card } from "@/components/ui/Card";
import { HubClient } from "./ui";
import { RelationshipClient } from "./relationship";

function stateColor(state: string) {
  if (state === "green") return "bg-emerald-500";
  if (state === "yellow") return "bg-amber-500";
  if (state === "red") return "bg-red-500";
  return "bg-zinc-300";
}

function warningLabel(warnings: Array<{ tone: string }> | null | undefined) {
  const list = warnings ?? [];
  if (list.some((w) => w.tone === "blocked")) return { text: "Åtgärd krävs", cls: "text-red-700" } as const;
  if (list.some((w) => w.tone === "attention")) return { text: "Behöver uppmärksamhet", cls: "text-amber-700" } as const;
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

function isRearPosition(p: string) {
  return p === "LR" || p === "RR" || p === "LRO" || p === "LRI" || p === "RRO" || p === "RRI";
}

function targetPressureKpa(profile: string, position: string) {
  if (position === "SPARE") return null;
  const base = profile === "light" ? 230 : profile === "full" ? 270 : 250; // normal default
  return base + (isRearPosition(position) ? 10 : 0);
}

export default async function HubPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getHubViewByToken({ token });

  if (!view) {
    return (
      <main className="min-h-screen bg-white text-[#0b0c0e]">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <Card pad="lg">
            <div className="text-sm text-[var(--tyra-muted)]">Länken är ogiltig eller har återkallats.</div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white text-[#0b0c0e]">
      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="text-sm text-black/60">Mina däck</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {view.vehicle?.make ? `${view.vehicle.make} ` : ""}
          {view.vehicle?.model ?? ""}
        </h1>
        <div className="mt-2 text-sm text-black/60">{view.customerName}</div>

        <Card className="mt-8" pad="lg">
          <div className="text-xs font-medium text-[var(--tyra-muted)]">Status</div>
          <div className="mt-2 text-sm text-[var(--tyra-muted)]">
            {view.commercialState === "NO_NEED"
              ? "Allt ser bra ut just nu."
              : view.commercialState === "LIVE_OPTIONS_AVAILABLE"
                ? "Några däck behöver uppmärksamhet. Här är dagens alternativ."
                : view.commercialState === "ORDER_CONFIRMED"
                  ? "Däck är beställda. Nästa steg är att boka tid."
                  : "Din status uppdateras här över tid."}
          </div>
          {view.nextBooking ? (
            <Card className="mt-3" pad="sm">
              <div className="font-medium">Din nästa tid</div>
              <div className="mt-1 text-[var(--tyra-muted)]">
                {new Date(view.nextBooking.start_at).toLocaleString("sv-SE")} –{" "}
                {new Date(view.nextBooking.end_at).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </Card>
          ) : null}
        </Card>

        {view.lastOrder ? (
          <Card className="mt-8" pad="lg">
            <div className="text-xs font-medium text-[var(--tyra-muted)]">Beställning</div>
            <div className="mt-2 text-sm text-[var(--tyra-muted)]">
              Vi har tagit emot din beställning. Betalning sker hos verkstaden.
            </div>
            <Card className="mt-3" pad="sm">
              <div className="font-medium">
                {view.lastOrder.order_snapshot?.product?.brand ?? ""}{" "}
                {view.lastOrder.order_snapshot?.product?.model ?? ""}
              </div>
              <div className="mt-1 text-[var(--tyra-muted)]">
                {view.lastOrder.order_snapshot?.product?.dimension ?? ""} •{" "}
                {view.lastOrder.order_snapshot?.quantity ?? ""} st
              </div>
              <div className="mt-2">
                Totalt:{" "}
                <span className="font-medium">
                  {view.lastOrder.order_snapshot?.livePriceSnapshot?.totalCustomerPriceOre
                    ? formatSekFromOre(view.lastOrder.order_snapshot.livePriceSnapshot.totalCustomerPriceOre)
                    : "—"}
                </span>
              </div>
              <div className="mt-1 text-xs text-[var(--tyra-subtle)]">
                Mottagen {new Date(view.lastOrder.ordered_at).toLocaleString("sv-SE")}
              </div>
            </Card>
          </Card>
        ) : null}

        <Card className="mt-10" pad="lg">
          <div className="text-xs font-medium text-[var(--tyra-muted)]">Dina däck</div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {view.positions.map((p) => (
              <Card key={p.position} pad="sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{posLabel(p.position)}</div>
                  <div className="text-xs text-[var(--tyra-muted)]">{p.health.label}</div>
                </div>
                {p.tyre.dimension ? (
                  <div className="mt-1 text-xs text-[var(--tyra-subtle)]">{p.tyre.dimension}</div>
                ) : null}

                <div className="mt-3">
                  <div className="h-2 w-full rounded-full bg-black/10">
                    <div
                      className={`h-2 rounded-full ${stateColor(p.health.state)}`}
                      style={{ width: `${p.health.percent ?? 0}%` }}
                    />
                  </div>
                  <div className="mt-2 text-sm">
                    {p.health.treadDepthMm != null ? (
                      <span className="font-medium">{p.health.treadDepthMm.toFixed(1)} mm</span>
                    ) : (
                      <span className="text-[var(--tyra-subtle)]">Ingen mätning</span>
                    )}
                    {p.health.treadDepthSource ? (
                      <span className="ml-2 text-xs text-[var(--tyra-subtle)]">{p.health.treadDepthSource}</span>
                    ) : null}
                  </div>

                  <div className="mt-2 text-xs text-[var(--tyra-muted)]">
                    {(() => {
                      const target = targetPressureKpa(view.prefs.pressure_profile, p.position);
                      const now = p.pressureKpa;
                      const parts: string[] = [];
                      parts.push(`Tryck: ${now != null ? `${Math.round(now)} kPa` : "—"}`);
                      if (target != null) parts.push(`Mål: ${target} kPa`);
                      return parts.join(" • ");
                    })()}
                  </div>

                  {(() => {
                    const wl = warningLabel((p as any).warnings);
                    return wl ? <div className={`mt-2 text-xs font-medium ${wl.cls}`}>{wl.text}</div> : null;
                  })()}
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-6 text-xs text-[var(--tyra-subtle)]">
            Vi visar både mätvärde och bedömning. Rekommendation ≠ lagkrav.
          </div>
        </Card>

        {view.storedWheelSets?.length ? (
          <Card className="mt-10" pad="lg">
            <div className="text-xs font-medium text-[var(--tyra-muted)]">På hotellet</div>
            <div className="mt-4 space-y-2">
              {view.storedWheelSets.map((ws: any) => (
                <Card key={ws.wheel_set_id} pad="sm" className="text-sm">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {ws.season === "winter" ? "Vinterhjul" : ws.season === "summer" ? "Sommarhjul" : ws.season}
                    </div>
                    <div className="text-[var(--tyra-muted)]">{ws.storage_code ?? "—"}</div>
                  </div>
                  <div className="mt-1 text-[var(--tyra-muted)]">
                    Status: {ws.status} • Lager: {ws.storage_status}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        ) : null}

        <Card className="mt-10" pad="lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-[var(--tyra-muted)]">Dagens alternativ</div>
              <div className="mt-2 text-sm text-[var(--tyra-muted)]">
                Livepris monterat och klart (inkl. montering + miljöavgift).
              </div>
            </div>
          </div>

          {view.liveOptions?.options?.length ? (
            <div className="mt-6 space-y-3">
              {view.liveOptions.options.map((o: any) => (
                <Card key={o.liveOptionId} pad="sm">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="text-sm font-semibold tracking-tight">
                        {o.brand} {o.model}
                      </div>
                      <div className="mt-1 text-xs text-[var(--tyra-muted)]">{o.dimension}</div>
                      <div className="mt-2 text-sm">
                        <span className="font-medium">
                          {formatSekFromOre(o.livePrice.totalCustomerPriceOre)}
                        </span>{" "}
                        <span className="text-[var(--tyra-muted)]">komplett</span>{" "}
                        <span className="text-[var(--tyra-subtle)]">
                          för {o.livePrice.quantity}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-[var(--tyra-subtle)]">
                        Pris uppdaterat{" "}
                        {new Date(o.livePrice.supplierPriceTimestamp).toLocaleString("sv-SE")}
                      </div>
                    </div>
                    <HubClient
                      token={token}
                      tireProductId={o.tireProductId}
                      quantity={o.livePrice.quantity}
                    />
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="mt-6" pad="sm">
              <div className="text-sm text-[var(--tyra-muted)]">
              Inga alternativ tillgängliga just nu (eller kontroll pågår).
              </div>
            </Card>
          )}
        </Card>

        <RelationshipClient token={token} commercialState={view.commercialState} prefs={view.prefs} />
      </div>
    </main>
  );
}

