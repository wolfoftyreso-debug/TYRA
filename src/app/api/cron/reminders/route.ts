import { NextResponse } from "next/server";

import { query } from "@/lib/server/db";
import { runSeasonAndLawReminders } from "@/lib/server/cron/reminders";

function unauthorized() {
  return new NextResponse("Unauthorized", { status: 401 });
}

function getSecretFromRequest(req: Request) {
  const url = new URL(req.url);
  const qs = url.searchParams.get("secret");
  const header =
    req.headers.get("x-cron-secret") ||
    req.headers.get("x-vercel-cron-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return qs || header || null;
}

export async function GET(req: Request) {
  const configured = process.env.CRON_SECRET || process.env.AUTH_SECRET || null;
  if (!configured) return unauthorized();
  const provided = getSecretFromRequest(req);
  if (!provided || provided !== configured) return unauthorized();

  // v1: run for all orgs. Later: per-tenant policies + schedules.
  const orgs = await query<{ id: string }>(`select id from organizations order by created_at asc`, []);
  const results = [];
  for (const o of orgs.rows) {
    const res = await runSeasonAndLawReminders({ organizationId: o.id });
    results.push(res);
  }

  return NextResponse.json({ ok: true, results });
}

