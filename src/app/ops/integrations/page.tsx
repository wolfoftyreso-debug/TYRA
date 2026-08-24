import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Status";
import { TaskRow } from "@/components/ui/Rows";
import { requireActiveOrg } from "@/lib/server/session";
import { listTenantSupplierAccounts, getSupplierCapabilities } from "@/lib/server/suppliers/gateway";
import type { SupplierId } from "@/lib/suppliers/types";

function statusForAccount(a: {
  enabled: boolean;
  lastOkAt?: string | null;
  lastErrorAt?: string | null;
}) {
  if (!a.enabled) return { tone: "neutral" as const, label: "Inte konfigurerad" };
  if (a.lastErrorAt && (!a.lastOkAt || Date.parse(a.lastErrorAt) > Date.parse(a.lastOkAt))) {
    return { tone: "blocked" as const, label: "Problem" };
  }
  if (a.lastOkAt) return { tone: "good" as const, label: "Ansluten" };
  return { tone: "attention" as const, label: "Väntar" };
}

function supplierLabel(id: SupplierId) {
  if (id === "ntg") return "Gummigrossen / Nordic Tyre Group";
  if (id === "delticom") return "Delticom";
  if (id === "inter_sprint") return "Inter-Sprint";
  if (id === "deldo") return "Deldo";
  return id;
}

export default async function IntegrationsPage() {
  const { org } = await requireActiveOrg();
  const accounts = await listTenantSupplierAccounts({ organizationId: org.id });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/ops" className="text-sm text-[var(--tyra-muted)] underline">
        ← Ops
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Leverantörer</h1>
      <p className="mt-2 text-base text-[var(--tyra-muted)]">
        Integrationshälsa: ansluten, senast OK, och senaste fel. Inga stack traces i UI.
      </p>

      <Card className="mt-6" pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Däckleverantörer</div>
        <div className="mt-4 space-y-2">
          {accounts.map((a) => {
            const supplierId = a.supplierId as SupplierId;
            const caps = getSupplierCapabilities(supplierId);
            const status = statusForAccount({
              enabled: a.enabled,
              lastOkAt: a.lastOkAt,
              lastErrorAt: a.lastErrorAt
            });
            return (
              <TaskRow
                key={supplierId}
                headline={supplierLabel(supplierId)}
                subtitle={
                  <span>
                    {a.lastOkAt ? `Senast OK: ${new Date(a.lastOkAt).toLocaleString("sv-SE")}` : "Senast OK: —"}
                    {a.lastErrorAt ? ` • Senast fel: ${new Date(a.lastErrorAt).toLocaleString("sv-SE")}` : ""}
                    {a.lastErrorMessage ? ` • ${a.lastErrorMessage}` : ""}
                  </span>
                }
                status={status}
                right={
                  <div className="hidden sm:flex items-center gap-2">
                    <StatusBadge tone={caps.productSearch ? "good" : "neutral"} label="Sök" />
                    <StatusBadge tone={caps.customerSpecificPricing ? "good" : "neutral"} label="Pris" />
                    <StatusBadge tone={caps.orderCreation ? "good" : "neutral"} label="Order" />
                  </div>
                }
              />
            );
          })}
        </div>
      </Card>
    </main>
  );
}

