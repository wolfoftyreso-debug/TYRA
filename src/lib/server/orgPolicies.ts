import { query } from "@/lib/server/db";

export async function getOrgPolicies(input: { organizationId: string }) {
  const res = await query<{ name: string; forgotten_dispose_after_days: number }>(
    `select name, forgotten_dispose_after_days
     from organizations
     where id = $1
     limit 1`,
    [input.organizationId]
  );
  return res.rows[0] ?? { name: "Verkstaden", forgotten_dispose_after_days: 60 };
}

export async function updateOrgPolicies(input: {
  organizationId: string;
  forgottenDisposeAfterDays: number;
}) {
  const days = Math.max(0, Math.min(3650, Math.trunc(input.forgottenDisposeAfterDays)));
  const res = await query<{ name: string; forgotten_dispose_after_days: number }>(
    `update organizations
     set forgotten_dispose_after_days = $2
     where id = $1
     returning name, forgotten_dispose_after_days`,
    [input.organizationId, days]
  );
  return { ok: true as const, ...(res.rows[0] ?? { name: "Verkstaden", forgotten_dispose_after_days: days }), forgotten_dispose_after_days: days };
}

