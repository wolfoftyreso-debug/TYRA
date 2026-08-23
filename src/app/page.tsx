import Link from "next/link";
import { ArrowRight, CloudSun, PackageSearch, Tags } from "lucide-react";
import { CommandBar } from "@/components/command-bar";
import { OpsShell } from "@/components/ops-shell";
import { organization, vehicles } from "@/lib/demo-data";

export default function HomePage() {
  const pickCount = vehicles.flatMap((vehicle) => vehicle.wheelSets).filter(
    (set) => set.status === "PICK_REQUESTED",
  ).length;
  const returnDue = vehicles.flatMap((vehicle) => vehicle.wheelSets).filter(
    (set) => set.status === "RETURN_PENDING",
  ).length;
  const opportunityCount = vehicles
    .flatMap((vehicle) => vehicle.wheelSets)
    .filter((set) => set.replacementRecommended).length;

  return (
    <OpsShell title="Vad behöver göras?">
      <section className="mx-auto max-w-4xl pt-4 md:pt-10">
        <CommandBar />
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#9299a4]">
          {["ABC123", "A-04-B-12", "plockkö", "dagens bokningar"].map((hint) => (
            <span key={hint} className="rounded-full border border-[#2a2e35] px-3 py-1.5">
              {hint}
            </span>
          ))}
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          <Metric label="Att plocka" value={pickCount} />
          <Metric label="Ska åter" value={returnDue} />
          <Metric label="Offertmöjligheter" value={opportunityCount} />
        </div>

        <section className="mt-8 rounded-2xl border border-[#343941] bg-[#14161a] p-5 md:p-7">
          <p className="eyebrow">Nästa handling</p>
          <div className="mt-3 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Plocka DEF456
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-[#a6adb7]">
                BMW X5 · vinterhjul · A-03-A-08. Skanna hyllplatsen och
                registreringsnumret för att bekräfta rätt set.
              </p>
            </div>
            <Link
              href="/pick"
              className="focus-ring inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-[#d8ff57] px-5 font-semibold text-[#0b0c0e]"
            >
              Börja plocka <ArrowRight size={19} />
            </Link>
          </div>
        </section>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Link
            href="/quotes"
            className="focus-ring rounded-2xl border border-[#2a2e35] bg-[#101215] p-5 transition hover:border-[#555d68]"
          >
            <Tags className="text-[#d8ff57]" size={22} />
            <h3 className="mt-4 font-semibold">Förbered offert</h3>
            <p className="mt-1 text-sm text-[#9299a4]">
              {opportunityCount} konstaterade bytesbehov väntar.
            </p>
          </Link>
          <div className="rounded-2xl border border-[#2a2e35] bg-[#101215] p-5">
            <CloudSun className="text-[#d8ff57]" size={22} />
            <h3 className="mt-4 font-semibold">Lagerklimat · zon A</h3>
            <p className="mt-1 text-sm text-[#9299a4]">
              {organization.temperature.toLocaleString("sv-SE")} °C ·{" "}
              {organization.humidity} % RH · rumsmätning
            </p>
          </div>
        </div>
        <Link
          href="/inventory"
          className="focus-ring mt-6 inline-flex items-center gap-2 text-sm text-[#b8bdc5] hover:text-white"
        >
          <PackageSearch size={17} /> Visa hela lagret
        </Link>
      </section>
    </OpsShell>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#2a2e35] bg-[#101215] p-4">
      <span className="text-2xl font-semibold">{value}</span>
      <p className="mt-1 text-xs font-medium uppercase tracking-wider text-[#9299a4]">
        {label}
      </p>
    </div>
  );
}
