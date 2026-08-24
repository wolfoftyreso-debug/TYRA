"use server";

import { z } from "zod";

import { requireActiveOrg } from "@/lib/server/session";
import { updateOrgPolicies } from "@/lib/server/orgPolicies";

const schema = z.object({
  forgottenDisposeAfterDays: z.coerce.number().int().min(0).max(3650)
});

export async function updateOrgPolicyAction(input: { forgottenDisposeAfterDays: number }) {
  const parsed = schema.parse(input);
  const { org } = await requireActiveOrg();
  return updateOrgPolicies({
    organizationId: org.id,
    forgottenDisposeAfterDays: parsed.forgottenDisposeAfterDays
  });
}

