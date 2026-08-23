import { requireActiveOrg } from "@/lib/server/session";
import { listCases } from "@/lib/server/cases";

import { DemoCaseButton } from "./ui";

export default async function CasesPage() {
  const { org } = await requireActiveOrg();
  const rows = await listCases({ organizationId: org.id });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Ärenden</h1>
      <p className="mt-2 text-sm text-white/60">{org.name}</p>

      <div className="mt-6">
        <DemoCaseButton />
      </div>

      <div className="mt-8 space-y-2">
        {rows.length ? (
          rows.map((r) => (
            <a
              key={r.id}
              href={`/ops/cases/${r.id}`}
              className="block rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-white/20"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white/90">
                  {r.registration_number ?? "—"}{" "}
                  <span className="text-white/60">{r.customer_name ?? ""}</span>
                </div>
                <div className="text-xs text-white/60">{r.case_status}</div>
              </div>
              <div className="mt-1 text-sm text-white/70">{r.intent}</div>
            </a>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Inga ärenden ännu.
          </div>
        )}
      </div>
    </main>
  );
}

