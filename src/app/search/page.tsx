import Link from "next/link";
import { OpsShell } from "@/components/ops-shell";
import { vehicles } from "@/lib/demo-data";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim().toLocaleLowerCase("sv") ?? "";
  const matches = vehicles.filter((vehicle) =>
    [
      vehicle.registration,
      vehicle.make,
      vehicle.model,
      ...vehicle.wheelSets.map((set) => set.tyre),
    ].some((value) => value.toLocaleLowerCase("sv").includes(query)),
  );

  return (
    <OpsShell title="Sökresultat">
      <p className="mb-5 text-sm text-[#9299a4]">
        {matches.length} träffar för “{query}”
      </p>
      <div className="space-y-3">
        {matches.map((vehicle) => (
          <Link
            key={vehicle.registration}
            href={`/vehicles/${vehicle.registration}`}
            className="focus-ring block rounded-2xl border border-[#2a2e35] bg-[#14161a] p-5 hover:bg-[#1b1e23]"
          >
            <h2 className="font-semibold">{vehicle.registration}</h2>
            <p className="mt-1 text-sm text-[#9299a4]">
              {vehicle.make} {vehicle.model} {vehicle.year}
            </p>
          </Link>
        ))}
      </div>
    </OpsShell>
  );
}
