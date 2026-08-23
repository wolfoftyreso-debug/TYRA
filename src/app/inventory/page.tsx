import Link from "next/link";
import { MapPin } from "lucide-react";
import { OpsShell } from "@/components/ops-shell";
import { StatusBadge } from "@/components/status-badge";
import { organization, vehicles } from "@/lib/demo-data";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ location?: string; move?: string }>;
}) {
  const filters = await searchParams;
  const stored = vehicles.flatMap((vehicle) =>
    vehicle.wheelSets
      .filter((set) => set.location)
      .map((set) => ({ vehicle, set })),
  );

  return (
    <OpsShell title="Lager">
      {(filters.location || filters.move) && (
        <div className="mb-5 rounded-xl border border-[#d8ff57]/30 bg-[#d8ff57]/10 p-4 text-sm">
          {filters.location
            ? `Visar träff för plats ${filters.location}.`
            : `Flytta hjul för ${filters.move}: välj en ledig plats.`}
        </div>
      )}
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Zon A</p>
          <p className="mt-2 text-sm text-[#9299a4]">
            Rumsmätning · {organization.temperature.toLocaleString("sv-SE")} °C ·{" "}
            {organization.humidity} % RH
          </p>
        </div>
        <p className="text-sm text-[#9299a4]">{stored.length} platser upptagna</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#2a2e35]">
        <div className="hidden grid-cols-[1fr_1fr_1.5fr_1fr] bg-[#101215] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#9299a4] md:grid">
          <span>Plats</span>
          <span>Reg.nr</span>
          <span>Hjul</span>
          <span>Status</span>
        </div>
        {stored.map(({ vehicle, set }) => (
          <Link
            href={`/wheel-sets/${set.id}`}
            key={set.id}
            className="focus-ring grid gap-3 border-t border-[#2a2e35] bg-[#14161a] px-5 py-5 transition first:border-t-0 hover:bg-[#1b1e23] md:grid-cols-[1fr_1fr_1.5fr_1fr] md:items-center"
          >
            <span className="flex items-center gap-2 font-mono">
              <MapPin size={16} className="text-[#d8ff57]" /> {set.location}
            </span>
            <strong>{vehicle.registration}</strong>
            <span className="text-sm text-[#a6adb7]">
              {set.season} · {set.dimension}
            </span>
            <span>
              <StatusBadge status={set.status} />
            </span>
          </Link>
        ))}
      </div>
      <div className="mt-6 rounded-xl border border-dashed border-[#343941] p-5">
        <p className="font-mono text-sm">A-04-B-13 · LEDIG</p>
      </div>
    </OpsShell>
  );
}
