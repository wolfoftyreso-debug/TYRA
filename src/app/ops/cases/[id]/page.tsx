import { requireActiveOrg } from "@/lib/server/session";
import { getCaseWorkCard, listCaseEvents } from "@/lib/server/cases";
import Link from "next/link";
import { WorkControls } from "./WorkControls";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await requireActiveOrg();

  const card = await getCaseWorkCard({ organizationId: org.id, tireCaseId: id });
  const events = await listCaseEvents({ organizationId: org.id, tireCaseId: id });
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

      <WorkControls tireCaseId={id} steps={card.steps} />

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

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="text-xs font-medium text-white/60">Händelser</div>
        <div className="mt-3 space-y-2">
          {events.length ? (
            events.map((e) => (
              <div
                key={e.id}
                className="rounded-xl border border-white/10 bg-[#0b0c0e] px-4 py-3"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-white/90">{e.event_type}</div>
                  <div className="text-xs text-white/60">{e.source}</div>
                </div>
                <div className="mt-1 text-xs text-white/50">{new Date(e.created_at).toLocaleString("sv-SE")}</div>
                {e.previous_value || e.new_value ? (
                  <div className="mt-2 text-xs text-white/60">
                    {e.previous_value ? <div>Prev: {JSON.stringify(e.previous_value)}</div> : null}
                    {e.new_value ? <div>New: {JSON.stringify(e.new_value)}</div> : null}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-sm text-white/70">Inga events ännu.</div>
          )}
        </div>
      </div>
    </main>
  );
}

