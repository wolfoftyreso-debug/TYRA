import { formatSekFromOre } from "@/lib/domain/pricing";
import { getHubViewByToken } from "@/lib/server/hub";

import { HubClient } from "./ui";

function stateColor(state: string) {
  if (state === "green") return "bg-emerald-500";
  if (state === "yellow") return "bg-amber-500";
  if (state === "red") return "bg-red-500";
  return "bg-zinc-300";
}

function posLabel(p: string) {
  if (p === "LF") return "Vänster fram";
  if (p === "RF") return "Höger fram";
  if (p === "LR") return "Vänster bak";
  if (p === "RR") return "Höger bak";
  return p;
}

export default async function HubPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await getHubViewByToken({ token });

  if (!view) {
    return (
      <main className="min-h-screen bg-white text-[#0b0c0e]">
        <div className="mx-auto w-full max-w-3xl px-6 py-10">
          <div className="rounded-2xl border border-black/10 bg-white p-6">
            <div className="text-sm text-black/70">Länken är ogiltig eller har återkallats.</div>
          </div>
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

        {view.lastOrder ? (
          <div className="mt-8 rounded-3xl border border-black/10 bg-white p-6">
            <div className="text-xs font-medium text-black/60">Beställning</div>
            <div className="mt-2 text-sm text-black/80">
              Vi har tagit emot din beställning. Betalning sker hos verkstaden.
            </div>
            <div className="mt-3 rounded-2xl border border-black/10 bg-white p-4 text-sm">
              <div className="font-medium">
                {view.lastOrder.order_snapshot?.product?.brand ?? ""}{" "}
                {view.lastOrder.order_snapshot?.product?.model ?? ""}
              </div>
              <div className="mt-1 text-black/60">
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
              <div className="mt-1 text-xs text-black/50">
                Mottagen {new Date(view.lastOrder.ordered_at).toLocaleString("sv-SE")}
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-10 rounded-3xl border border-black/10 bg-white p-6">
          <div className="text-xs font-medium text-black/60">Dina däck</div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            {view.positions.map((p) => (
              <div key={p.position} className="rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{posLabel(p.position)}</div>
                  <div className="text-xs text-black/60">{p.health.label}</div>
                </div>

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
                      <span className="text-black/50">Ingen mätning</span>
                    )}
                    {p.health.treadDepthSource ? (
                      <span className="ml-2 text-xs text-black/50">{p.health.treadDepthSource}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-xs text-black/50">
            Vi visar både mätvärde och bedömning. Rekommendation ≠ lagkrav.
          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-black/10 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-black/60">Dagens alternativ</div>
              <div className="mt-2 text-sm text-black/70">
                Livepris monterat och klart (inkl. montering + miljöavgift).
              </div>
            </div>
          </div>

          {view.liveOptions?.options?.length ? (
            <div className="mt-6 space-y-3">
              {view.liveOptions.options.map((o: any) => (
                <div key={o.liveOptionId} className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className="text-sm font-semibold tracking-tight">
                        {o.brand} {o.model}
                      </div>
                      <div className="mt-1 text-xs text-black/60">{o.dimension}</div>
                      <div className="mt-2 text-sm">
                        <span className="font-medium">
                          {formatSekFromOre(o.livePrice.totalCustomerPriceOre)}
                        </span>{" "}
                        <span className="text-black/60">komplett</span>{" "}
                        <span className="text-black/50">
                          för {o.livePrice.quantity}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-black/50">
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
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/70">
              Inga alternativ tillgängliga just nu (eller kontroll pågår).
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

