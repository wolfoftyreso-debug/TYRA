"use server";

import { requireActiveOrg } from "@/lib/server/session";
import { confirmAllPositions, setTechnicianTreadDepth } from "@/lib/server/inspections";

export async function confirmAllAction(input: { inspectionId: string }) {
  const { org, userId } = await requireActiveOrg();
  await confirmAllPositions({ organizationId: org.id, inspectionId: input.inspectionId, actorUserId: userId });
  return { ok: true as const };
}

export async function setTreadDepthAction(input: {
  inspectionId: string;
  position: "LF" | "RF" | "LR" | "RR";
  treadDepthMm: number;
}) {
  const { org, userId } = await requireActiveOrg();
  await setTechnicianTreadDepth({
    organizationId: org.id,
    inspectionId: input.inspectionId,
    position: input.position,
    treadDepthMm: input.treadDepthMm,
    actorUserId: userId
  });
  return { ok: true as const };
}

