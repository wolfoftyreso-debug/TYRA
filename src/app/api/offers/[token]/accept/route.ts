import { NextResponse } from "next/server";
import { z } from "zod";
import { getPool, hasDatabase } from "@/lib/server/db";
import { hashToken } from "@/lib/server/tokens";

const bodySchema = z.object({ optionId: z.string().uuid() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "Databasen är inte ansluten." },
      { status: 503 },
    );
  }
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Ogiltigt offertval." }, { status: 400 });
  }
  const { token } = await params;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const quote = await client.query(
      `SELECT q.id, q.organization_id, q.opportunity_id
       FROM quote_tokens t
       JOIN quotes q ON q.id = t.quote_id
       WHERE t.token_hash = $1
         AND t.revoked_at IS NULL
         AND t.expires_at > now()
         AND q.status IN ('ready', 'sent', 'opened')
       FOR UPDATE`,
      [hashToken(token)],
    );
    if (!quote.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { error: "Offerten är ogiltig eller har gått ut." },
        { status: 404 },
      );
    }
    const record = quote.rows[0];
    const option = await client.query(
      "SELECT id FROM quote_options WHERE id = $1 AND quote_id = $2",
      [parsed.data.optionId, record.id],
    );
    if (!option.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Paketet finns inte." }, { status: 400 });
    }
    await client.query(
      "UPDATE quotes SET status = 'accepted', accepted_at = now() WHERE id = $1",
      [record.id],
    );
    await client.query(
      `UPDATE replacement_opportunities
       SET status = 'accepted', closed_at = now() WHERE id = $1`,
      [record.opportunity_id],
    );
    await client.query(
      `INSERT INTO quote_events (organization_id, quote_id, event_type, payload)
       VALUES ($1, $2, 'accepted', jsonb_build_object('option_id', $3::text))`,
      [record.organization_id, record.id, parsed.data.optionId],
    );
    await client.query(
      `INSERT INTO audit_events (
        organization_id, event_type, entity_type, entity_id, payload
      ) VALUES ($1, 'quote.accepted', 'quote', $2, jsonb_build_object('option_id', $3::text))`,
      [record.organization_id, record.id, parsed.data.optionId],
    );
    await client.query("COMMIT");
    return NextResponse.json({ accepted: true, next: "suggest_booking" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Kunde inte acceptera offert", error);
    return NextResponse.json(
      { error: "Offerten kunde inte accepteras." },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}
