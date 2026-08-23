import { requireActiveOrg } from "@/lib/server/session";
import { getCaseWorkCard } from "@/lib/server/cases";
import Link from "next/link";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await requireActiveOrg();

  const card = await getCaseWorkCard({ organizationId: org.id, tireCaseId: id });
  if (!card) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Hittade inget ärende.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/ops/cases" className="text-sm text-white/60 underline">
        ← Ärenden
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">{card.headline}</h1>
      <p className="mt-2 text-sm text-white/60">{card.summary}</p>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-medium text-white/60">Nästa</div>
        <div className="mt-2 text-sm text-white/90">
          {card.nextBestAction?.title ?? "Klart."}
        </div>
      </div>

      <div className="mt-8 space-y-2">
        {card.steps.map((s) => (
          <div
            key={s.kind}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-white/90">{s.title}</div>
              <div className="text-xs text-white/60">{s.status}</div>
            </div>
            <div className="mt-2 text-xs text-white/50">{s.kind}</div>
          </div>
        ))}
      </div>
    </main>
  );
}

