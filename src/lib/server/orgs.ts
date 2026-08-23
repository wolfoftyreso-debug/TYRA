import { query } from "./db";

export type DbOrganization = { id: string; name: string };

export async function getActiveOrgForUser(input: { userId: string }) {
  const res = await query<DbOrganization>(
    `select o.id, o.name
     from memberships m
     join organizations o on o.id = m.organization_id
     where m.user_id = $1
     order by m.created_at asc
     limit 1`,
    [input.userId]
  );
  const org = res.rows[0];
  if (!org) throw new Error("Ingen organisation kopplad till användaren.");
  return org;
}

