import { requireActiveOrg } from "@/lib/server/session";
import { getInspection } from "@/lib/server/inspections";
import Link from "next/link";

import { Card } from "@/components/ui/Card";

import { InspectionReviewClient } from "./ui";

export default async function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await requireActiveOrg();

  const data = await getInspection({ organizationId: org.id, inspectionId: id });
  if (!data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <Card>Hittade ingen inspektion.</Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/ops" className="text-sm text-[var(--tyra-muted)] underline">
        ← Ops
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Inspektion</h1>
      <p className="mt-2 text-base text-[var(--tyra-muted)]">
        Status: {data.inspection.inspection_status} •{" "}
        {new Date(data.inspection.captured_at).toLocaleString("sv-SE")}
      </p>

      <Card className="mt-4">
        <div className="text-base text-[var(--tyra-muted)]">
          Princip: AI förifyller. Teknikern verifierar och äger sanningen. Endast VERIFIED-data används i kundvy och affärslogik.
        </div>
      </Card>

      <InspectionReviewClient inspectionId={id} rows={data.positions as any} />
    </main>
  );
}

