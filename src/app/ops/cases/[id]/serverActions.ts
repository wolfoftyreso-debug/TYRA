"use server";

import { requireActiveOrg } from "@/lib/server/session";
import { blockCase, markCustomerReady, setStepStatus } from "@/lib/server/cases";

export async function markStepDoneAction(input: { tireCaseId: string; stepKind: string }) {
  const { org, userId } = await requireActiveOrg();
  await setStepStatus({
    organizationId: org.id,
    tireCaseId: input.tireCaseId,
    stepKind: input.stepKind,
    status: "DONE",
    actorUserId: userId,
    source: "TECHNICIAN"
  });
  return { ok: true as const };
}

export async function blockCaseAction(input: {
  tireCaseId: string;
  reason: "WHEEL_SET_NOT_FOUND" | "MISSING_WHEEL" | "WRONG_WHEEL_SET_ON_POSITION" | "TPMS_FAULT" | "OTHER";
  details: any;
}) {
  const { org, userId } = await requireActiveOrg();
  await blockCase({
    organizationId: org.id,
    tireCaseId: input.tireCaseId,
    actorUserId: userId,
    reason: input.reason,
    details: input.details ?? {},
    source: "TECHNICIAN"
  });
  return { ok: true as const };
}

export async function setCustomerReadyAction(input: { tireCaseId: string; ready: boolean }) {
  const { org, userId } = await requireActiveOrg();
  await markCustomerReady({
    organizationId: org.id,
    tireCaseId: input.tireCaseId,
    actorUserId: userId,
    ready: input.ready,
    source: "TECHNICIAN"
  });
  return { ok: true as const };
}

