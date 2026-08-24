import { requireActiveOrg } from "@/lib/server/session";
import { listOpenOpportunities } from "@/lib/server/search";

import { TaskRow } from "@/components/ui/Rows";

export default async function QuotesQueuePage() {
  const { org } = await requireActiveOrg();
  const rows = await listOpenOpportunities({ organizationId: org.id });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Offerter</h1>
      <p className="mt-2 text-base text-[var(--tyra-muted)]">{org.name}</p>

      <div className="mt-8 space-y-2">
        {rows.length ? (
          rows.map((r) => (
            <TaskRow
              key={r.id}
              headline={r.registration_number ?? "—"}
              subtitle={
                <span>
                  {r.customer_name ?? "—"} • {r.season} • {r.storage_code ?? "—"}
                </span>
              }
              status={{ tone: "attention", label: r.reason }}
            />
          ))
        ) : (
          <TaskRow headline="Inga öppna opportunities just nu." subtitle="När ett behov identifieras visas det här." status={null} />
        )}
      </div>
    </main>
  );
}

