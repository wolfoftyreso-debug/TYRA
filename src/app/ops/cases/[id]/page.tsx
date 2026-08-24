import { requireActiveOrg } from "@/lib/server/session";
import { getCaseWorkCard, listCaseEvents } from "@/lib/server/cases";
import Link from "next/link";
import { WorkControls } from "./WorkControls";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Status";
import { WorkCard } from "@/components/ui/WorkCard";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await requireActiveOrg();

  const card = await getCaseWorkCard({ organizationId: org.id, tireCaseId: id });
  const events = await listCaseEvents({ organizationId: org.id, tireCaseId: id });
  if (!card) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <Card>Hittade inget ärende.</Card>
      </main>
    );
  }

  const status =
    card.steps.some((s) => s.status === "BLOCKED")
      ? ({ tone: "blocked", label: "Blocked" } as const)
      : card.steps.some((s) => s.status === "TODO")
        ? ({ tone: "attention", label: "Pågår" } as const)
        : ({ tone: "good", label: "Klar" } as const);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/ops/cases" className="text-sm text-[var(--tyra-muted)] underline">
        ← Ärenden
      </Link>

      <WorkCard
        title={card.headline}
        subtitle={card.summary}
        status={status}
        nextTitle={card.nextBestAction?.title ?? "Klart."}
        nextHint={null}
      >
        <WorkControls tireCaseId={id} steps={card.steps} />
      </WorkCard>

      {events.some((e) => e.event_type === "WHEEL_SET_REMOVED") ? (
        <Card className="mt-6">
          <div className="text-xs font-medium text-[var(--tyra-muted)]">Efterflöde</div>
          <div className="mt-2 text-base text-[var(--tyra-muted)]">
            Avtaget hjulset har en pågående inspektion och ska återlagras efter att moment är klara.
          </div>
          <div className="mt-4 text-base">
            {(() => {
              const ev = events.find((e) => e.event_type === "WHEEL_SET_REMOVED");
              const inspId = ev?.data?.inspectionId;
              return inspId ? <Link className="underline" href={`/ops/inspections/${inspId}`}>Öppna inspektion</Link> : null;
            })()}
          </div>
        </Card>
      ) : null}

      <div className="mt-8 space-y-2">
        {card.steps.map((s) => (
          <Card key={s.kind} pad="md">
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold tracking-tight">{s.title}</div>
              <StatusBadge
                tone={s.status === "DONE" ? "good" : s.status === "BLOCKED" ? "blocked" : s.status === "TODO" ? "attention" : "neutral"}
                label={s.status === "DONE" ? "Klar" : s.status === "BLOCKED" ? "Blockerad" : s.status === "TODO" ? "Nästa" : s.status}
              />
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-10" pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Händelser</div>
        <div className="mt-3 space-y-2">
          {events.length ? (
            events.map((e) => (
              <div
                key={e.id}
                className="rounded-[var(--tyra-radius)] border border-[var(--tyra-border)] bg-[var(--tyra-panel)] px-5 py-4"
              >
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold tracking-tight">{e.event_type}</div>
                  <div className="text-sm text-[var(--tyra-muted)]">{e.source}</div>
                </div>
                <div className="mt-1 text-sm text-[var(--tyra-subtle)]">{new Date(e.created_at).toLocaleString("sv-SE")}</div>
                {e.previous_value || e.new_value ? (
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-[var(--tyra-muted)] underline">
                      Visa detaljer
                    </summary>
                    <div className="mt-2 text-sm text-[var(--tyra-muted)]">
                      {e.previous_value ? <div>Före: {JSON.stringify(e.previous_value)}</div> : null}
                      {e.new_value ? <div>Efter: {JSON.stringify(e.new_value)}</div> : null}
                    </div>
                  </details>
                ) : null}
              </div>
            ))
          ) : (
            <div className="text-base text-[var(--tyra-muted)]">Inga händelser ännu.</div>
          )}
        </div>
      </Card>
    </main>
  );
}

