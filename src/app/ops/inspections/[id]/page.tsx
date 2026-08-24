import { requireActiveOrg } from "@/lib/server/session";
import { getInspection } from "@/lib/server/inspections";
import Link from "next/link";

import { InspectionReviewClient } from "./ui";

export default async function InspectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { org } = await requireActiveOrg();

  const data = await getInspection({ organizationId: org.id, inspectionId: id });
  if (!data) {
    return (
      <main className="mx-auto w-full max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Hittade ingen inspektion.
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link href="/ops" className="text-sm text-white/60 underline">
        ← Ops
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">Inspektion</h1>
      <p className="mt-2 text-sm text-white/60">
        Status: {data.inspection.inspection_status} •{" "}
        {new Date(data.inspection.captured_at).toLocaleString("sv-SE")}
      </p>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        Princip: AI förifyller. Teknikern verifierar och äger sanningen. Endast VERIFIED data används i kundvy
        och affärslogik.
      </div>

      <InspectionReviewClient inspectionId={id} rows={data.positions as any} />
    </main>
  );
}

