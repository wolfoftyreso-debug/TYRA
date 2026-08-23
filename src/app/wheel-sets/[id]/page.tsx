import Link from "next/link";
import { AlertTriangle, ArrowLeft, MapPin } from "lucide-react";
import { notFound } from "next/navigation";
import { OpsShell } from "@/components/ops-shell";
import { StatusBadge } from "@/components/status-badge";
import { WheelSetActions } from "@/components/wheel-set-actions";
import { getCustomer, vehicles } from "@/lib/demo-data";

export default async function WheelSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = vehicles.find((item) =>
    item.wheelSets.some((set) => set.id === id),
  );
  const set = vehicle?.wheelSets.find((item) => item.id === id);
  if (!vehicle || !set) notFound();
  const customer = getCustomer(vehicle.customerId);

  return (
    <OpsShell title={`${vehicle.registration} · ${set.season}`}>
      <Link
        href={`/vehicles/${vehicle.registration}`}
        className="focus-ring mb-6 inline-flex items-center gap-2 text-sm text-[#9299a4] hover:text-white"
      >
        <ArrowLeft size={17} /> Fordonet
      </Link>
      <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-[#2a2e35] bg-[#14161a] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Däckkort</p>
              <h2 className="mt-2 text-3xl font-semibold">{set.tyre}</h2>
              <p className="mt-2 text-[#a6adb7]">{set.dimension}</p>
            </div>
            <StatusBadge status={set.status} />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {set.tread.map((depth, index) => (
              <div key={index} className="rounded-xl bg-[#1b1e23] p-4">
                <p className="text-xs text-[#9299a4]">Hjul {index + 1}</p>
                <p className="mt-2 text-xl font-semibold">
                  {depth.toLocaleString("sv-SE")} mm
                </p>
              </div>
            ))}
          </div>
          {set.replacementRecommended && (
            <div className="mt-6 flex gap-3 rounded-xl border border-[#ff7657]/30 bg-[#ff7657]/10 p-4 text-sm text-[#ffc0b1]">
              <AlertTriangle className="shrink-0" size={20} />
              <p>
                Byte rekommenderas. Minst två hjul ligger under 4 mm eller har
                ett konstaterat bytesbehov.
              </p>
            </div>
          )}
        </section>
        <aside className="space-y-4">
          <div className="rounded-2xl border border-[#2a2e35] bg-[#101215] p-5">
            <p className="eyebrow">Ägare</p>
            <p className="mt-3 font-semibold">{customer?.name}</p>
            <p className="mt-1 text-sm text-[#9299a4]">
              {vehicle.make} {vehicle.model} · {vehicle.registration}
            </p>
          </div>
          <div className="rounded-2xl border border-[#2a2e35] bg-[#101215] p-5">
            <p className="eyebrow">Aktuell plats</p>
            <p className="mt-3 flex items-center gap-2 font-mono text-lg">
              <MapPin size={19} className="text-[#d8ff57]" />
              {set.location ?? "På fordonet"}
            </p>
          </div>
          <WheelSetActions initialStatus={set.status} />
          {set.replacementRecommended && (
            <Link
              href="/quotes/builder"
              className="focus-ring block min-h-12 rounded-xl bg-[#d8ff57] px-5 py-3 text-center font-semibold text-[#0b0c0e]"
            >
              Förbered offert
            </Link>
          )}
        </aside>
      </div>
    </OpsShell>
  );
}
