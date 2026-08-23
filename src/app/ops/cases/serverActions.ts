"use server";

import { requireActiveOrg } from "@/lib/server/session";
import { ingestDmsEventAndUpsertCase } from "@/lib/server/cases";

export async function createDemoCaseAction(input: {
  registrationNumber: string;
  dmsCodes: string[];
}) {
  const { org } = await requireActiveOrg();

  const res = await ingestDmsEventAndUpsertCase({
    organizationId: org.id,
    sourceSystemKey: "DEMO_DMS",
    externalEventId: `demo-${Date.now()}`,
    occurredAtIso: new Date().toISOString(),
    externalOrderId: `DEMO-ORDER-${Date.now()}`,
    dmsCodes: input.dmsCodes,
    vehicleRegistrationNumber: input.registrationNumber.toUpperCase()
  });

  return { ok: true as const, tireCaseId: res.tireCaseId };
}

