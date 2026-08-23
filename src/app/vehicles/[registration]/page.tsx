import Link from "next/link";
import { ArrowLeft, ChevronRight, MapPin, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { OpsShell } from "@/components/ops-shell";
import { StatusBadge } from "@/components/status-badge";
import { getCustomer, getVehicle } from "@/lib/demo-data";

export default async function VehiclePage({
  params,
}: {
  params: Promise<{ registration: string }>;
}) {
  const { registration } = await params;
  const vehicle = getVehicle(registration);
  if (!vehicle) notFound();
  const customer = getCustomer(vehicle.customerId);

  return (
    <OpsShell title={vehicle.registration}>
      <Link
        href="/"
        className="focus-ring mb-6 inline-flex items-center gap-2 text-sm text-[#9299a4] hover:text-white"
      >
        <ArrowLeft size={17} /> Tillbaka
      </Link>
      <section className="flex flex-col justify-between gap-6 border-b border-[#2a2e35] pb-8 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">Fordon</p>
          <h2 className="mt-2 text-4xl font-semibold tracking-tight">
            {vehicle.make} {vehicle.model}
          </h2>
          <p className="mt-2 text-[#9299a4]">Årsmodell {vehicle.year}</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-[#14161a] px-4 py-3">
          <UserRound size={19} className="text-[#d8ff57]" />
          <div>
            <p className="text-sm font-medium">{customer?.name}</p>
            <p className="text-xs text-[#9299a4]">{customer?.phone}</p>
          </div>
        </div>
      </section>

      <h3 className="mb-4 mt-8 text-sm font-semibold uppercase tracking-wider text-[#9299a4]">
        Hjulset
      </h3>
      <div className="space-y-3">
        {vehicle.wheelSets.length ? (
          vehicle.wheelSets.map((set) => (
            <Link
              href={`/wheel-sets/${set.id}`}
              key={set.id}
              className="focus-ring grid gap-5 rounded-2xl border border-[#2a2e35] bg-[#14161a] p-5 transition hover:border-[#535a65] md:grid-cols-[1fr_auto_auto]"
            >
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="text-lg font-semibold">{set.season}</h4>
                  <StatusBadge status={set.status} />
                </div>
                <p className="mt-2 text-sm text-[#aeb4bd]">
                  {set.tyre} · {set.dimension}
                </p>
                {set.location && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-[#9299a4]">
                    <MapPin size={14} /> {set.location}
                  </p>
                )}
              </div>
              <div>
                <p className="eyebrow">Mönsterdjup</p>
                <p className="mt-2 text-sm">
                  {Math.min(...set.tread).toLocaleString("sv-SE")}–{Math.max(...set.tread).toLocaleString("sv-SE")} mm
                </p>
              </div>
              <ChevronRight className="self-center text-[#9299a4]" size={20} />
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#343941] p-8 text-center text-sm text-[#9299a4]">
            Inga hjulset registrerade.
          </div>
        )}
      </div>
    </OpsShell>
  );
}
