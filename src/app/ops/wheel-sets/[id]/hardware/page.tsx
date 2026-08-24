import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { requireActiveOrg } from "@/lib/server/session";
import { getWheelSetHardware } from "@/lib/server/wheelHardware";

import { HardwareClient } from "./ui";

export default async function WheelSetHardwarePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await requireActiveOrg();

  const hardware = await getWheelSetHardware({ organizationId: org.id, wheelSetId: id });

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/ops" className="text-sm text-[var(--tyra-muted)] underline">
        ← Ops
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Hjuldetaljer</h1>
      <p className="mt-2 text-base text-[var(--tyra-muted)]">
        Saker som kåpor, hjullås och bulttyper ska inte skapa friktion på golvet. Registrera en gång – se alltid.
      </p>

      <Card className="mt-6" pad="lg">
        <div className="text-xs font-medium text-[var(--tyra-muted)]">Hjulset</div>
        <div className="mt-2 text-lg font-semibold tracking-tight">{id}</div>
        {hardware.updatedAt ? (
          <div className="mt-1 text-sm text-[var(--tyra-subtle)]">
            Uppdaterad {new Date(hardware.updatedAt).toLocaleString("sv-SE")}
          </div>
        ) : (
          <div className="mt-1 text-sm text-[var(--tyra-subtle)]">Ej registrerad ännu.</div>
        )}
      </Card>

      <HardwareClient wheelSetId={id} initial={hardware as any} />
    </main>
  );
}

