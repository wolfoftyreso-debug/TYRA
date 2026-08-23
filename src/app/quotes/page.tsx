import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";
import { OpsShell } from "@/components/ops-shell";
import { getCustomer, vehicles } from "@/lib/demo-data";

export default function QuotesPage() {
  const opportunities = vehicles.flatMap((vehicle) =>
    vehicle.wheelSets
      .filter((set) => set.replacementRecommended)
      .map((set) => ({ vehicle, set, customer: getCustomer(vehicle.customerId) })),
  );

  return (
    <OpsShell title="Offertkö">
      <p className="mb-6 max-w-2xl text-sm leading-6 text-[#9299a4]">
        Bytesbehov kommer från inspektioner och mätningar. Produkturval och
        belopp räknas deterministiskt från katalog och prispolicy.
      </p>
      <div className="space-y-3">
        {opportunities.map(({ vehicle, set, customer }) => (
          <div
            key={set.id}
            className="grid gap-5 rounded-2xl border border-[#2a2e35] bg-[#14161a] p-5 md:grid-cols-[auto_1fr_auto] md:items-center"
          >
            <span className="grid size-10 place-items-center rounded-full bg-[#ff7657]/10 text-[#ff9a82]">
              <AlertTriangle size={19} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">{vehicle.registration}</h2>
                <span className="text-sm text-[#9299a4]">
                  {vehicle.make} {vehicle.model} {vehicle.year}
                </span>
              </div>
              <p className="mt-2 text-sm text-[#a6adb7]">
                {customer?.name} · {set.season} {set.dimension} ·{" "}
                {Math.min(...set.tread).toLocaleString("sv-SE")} mm
              </p>
            </div>
            <Link
              href={
                vehicle.registration === "ABC123"
                  ? "/quotes/builder"
                  : `/wheel-sets/${set.id}`
              }
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#535a65] px-4 text-sm font-semibold hover:bg-[#1b1e23]"
            >
              Förbered offert <ArrowRight size={17} />
            </Link>
          </div>
        ))}
      </div>
    </OpsShell>
  );
}
