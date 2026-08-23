import { ShieldCheck, Snowflake, Sun } from "lucide-react";
import { notFound } from "next/navigation";
import { getCustomer, organization, vehicles } from "@/lib/demo-data";
import { statusLabels } from "@/lib/domain/status";

export default async function PortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (token !== "demo-anna-portal") notFound();
  const vehicle = vehicles[0];
  const customer = getCustomer(vehicle.customerId);

  return (
    <div className="public-surface">
      <header className="border-b border-black/10 px-5 py-5">
        <div className="mx-auto flex max-w-5xl justify-between">
          <strong className="tracking-[0.14em]">WERKSTAD TYRESÖ</strong>
          <span className="text-sm text-[#66695f]">{customer?.name}</span>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-14">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#707365]">
          Mina hjul
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.04em]">
          {vehicle.make} {vehicle.model}
        </h1>
        <p className="mt-2 text-[#66695f]">
          {vehicle.registration} · {vehicle.year}
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {vehicle.wheelSets.map((set) => (
            <article
              key={set.id}
              className="rounded-2xl border border-black/10 bg-[#faf9f5] p-6"
            >
              {set.season === "Vinter" ? <Snowflake /> : <Sun />}
              <div className="mt-6 flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold">{set.season}hjul</h2>
                <span className="rounded-full bg-[#e6e4dc] px-3 py-1 text-xs font-semibold">
                  {statusLabels[set.status]}
                </span>
              </div>
              <p className="mt-2 text-[#66695f]">
                {set.tyre} · {set.dimension}
              </p>
              <p className="mt-6 text-sm">
                Mönsterdjup {Math.min(...set.tread).toLocaleString("sv-SE")}–
                {Math.max(...set.tread).toLocaleString("sv-SE")} mm
              </p>
            </article>
          ))}
        </div>
        <div className="mt-8 flex gap-3 rounded-2xl border border-black/10 p-5 text-sm text-[#5c5f56]">
          <ShieldCheck className="shrink-0" size={20} />
          <p>
            Lagerklimat zon A: {organization.temperature.toLocaleString("sv-SE")} °C
            och {organization.humidity} % RH. Värdet är en rumsmätning och
            gäller inte per hjul.
          </p>
        </div>
      </main>
    </div>
  );
}
