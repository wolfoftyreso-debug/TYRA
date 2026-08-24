import { query } from "@/lib/server/db";

export async function getOrgPolicies(input: { organizationId: string }) {
  const res = await query<{ forgotten_dispose_after_days: number }>(
    `select forgotten_dispose_after_days
     from organizations
     where id = $1
     limit 1`,
    [input.organizationId]
  );
  return res.rows[0] ?? { forgotten_dispose_after_days: 60 };
}

export async function updateOrgPolicies(input: {
  organizationId: string;
  forgottenDisposeAfterDays: number;
}) {
  const days = Math.max(0, Math.min(3650, Math.trunc(input.forgottenDisposeAfterDays)));
  await query(
    `update organizations
     set forgotten_dispose_after_days = $2
     where id = $1`,
    [input.organizationId, days]
  );
  return { ok: true as const, forgotten_dispose_after_days: days };
}

