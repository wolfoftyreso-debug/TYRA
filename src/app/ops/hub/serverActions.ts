"use server";

import { requireActiveOrg } from "@/lib/server/session";
import { getOrCreateCustomerHubLink } from "@/lib/server/hub";
import { query } from "@/lib/server/db";

export async function createCustomerHubLinkAction(input: { customerId: string }) {
  const { org } = await requireActiveOrg();

  const ok = await query<{ id: string }>(
    `select id
     from customers
     where organization_id = $1 and id = $2
     limit 1`,
    [org.id, input.customerId]
  );
  if (!ok.rows[0]) throw new Error("Kund saknas.");

  const { token } = await getOrCreateCustomerHubLink({
    organizationId: org.id,
    customerId: input.customerId
  });

  return { url: `/hub/${token}` };
}

