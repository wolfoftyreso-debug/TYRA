import { requireActiveOrg } from "@/lib/server/session";
import { listPickQueue } from "@/lib/server/search";

export default async function PickQueuePage() {
  const { org } = await requireActiveOrg();
  const rows = await listPickQueue({ organizationId: org.id });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Plockkö</h1>
      <p className="mt-2 text-sm text-white/60">{org.name}</p>

      <div className="mt-8 space-y-2">
        {rows.length ? (
          rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-white/90">
                  {r.registration_number ?? "—"}
                </div>
                <div className="text-xs text-white/60">{r.status}</div>
              </div>
              <div className="mt-1 text-sm text-white/70">
                {r.customer_name ?? "—"} • {r.season} • {r.storage_code ?? "—"}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Inga plock just nu.
          </div>
        )}
      </div>
    </main>
  );
}

