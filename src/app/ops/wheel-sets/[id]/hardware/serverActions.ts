"use server";

import { requireActiveOrg } from "@/lib/server/session";
import { upsertWheelSetHardware } from "@/lib/server/wheelHardware";

export async function updateHardwareAction(input: {
  wheelSetId: string;
  patch: {
    hasCenterBore?: boolean | null;
    centerBoreNotes?: string | null;
    centerCapType?: "NONE" | "PLASTIC_CAP" | "LUG_COVERS" | "UNKNOWN" | null;
    capNotes?: string | null;
    hasWheelLock?: boolean | null;
    wheelLockKeyPresent?: boolean | null;
    wheelLockKeyLocation?: string | null;
    boltsSummer?: string | null;
    boltsWinter?: string | null;
    notes?: string | null;
  };
}) {
  const { org } = await requireActiveOrg();
  await upsertWheelSetHardware({
    organizationId: org.id,
    wheelSetId: input.wheelSetId,
    patch: input.patch
  });
  return { ok: true as const };
}

