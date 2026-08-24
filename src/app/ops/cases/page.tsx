import { requireActiveOrg } from "@/lib/server/session";
import { listCases } from "@/lib/server/cases";
import Link from "next/link";

import { DemoCaseButton } from "./ui";
import { TaskRow } from "@/components/ui/Rows";

export default async function CasesPage() {
  const { org } = await requireActiveOrg();
  const rows = await listCases({ organizationId: org.id });

  function toneForStatus(status: string) {
    if (status === "BLOCKED") return { tone: "blocked" as const, label: "Blocked" };
    if (status === "IN_PROGRESS") return { tone: "attention" as const, label: "Pågår" };
    if (status === "OPEN") return { tone: "neutral" as const, label: "Öppen" };
    if (status === "DONE") return { tone: "good" as const, label: "Klar" };
    return { tone: "neutral" as const, label: status };
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Ärenden</h1>
      <p className="mt-2 text-base text-[var(--tyra-muted)]">{org.name}</p>

      <div className="mt-6">
        <DemoCaseButton />
      </div>

      <div className="mt-8 space-y-2">
        {rows.length ? (
          rows.map((r) => (
            <Link key={r.id} href={`/ops/cases/${r.id}`} className="block">
              <TaskRow
                headline={
                  <span>
                    {r.registration_number ?? "—"}{" "}
                    <span className="text-[var(--tyra-muted)]">{r.customer_name ?? ""}</span>
                  </span>
                }
                subtitle={r.intent}
                status={toneForStatus(r.case_status)}
                className="hover:border-[var(--tyra-focus)]"
              />
            </Link>
          ))
        ) : (
          <TaskRow headline="Inga ärenden ännu." subtitle="Skapa ett demoärende för att testa flödet." status={null} />
        )}
      </div>
    </main>
  );
}

