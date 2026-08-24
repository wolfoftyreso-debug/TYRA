import { withTransaction } from "./db";

export type InspectionPositionRow = {
  id: string;
  position: string;
  tread_depth_mm: number | null;
  tread_depth_source: string | null;
  verified: boolean;
  confidence: number | null;
  ai_tread_depth_mm: number | null;
  ai_confidence: number | null;
  ai_model_version: string | null;
  wear_pattern?: string | null;
  damage_types?: string[] | null;
  tyre_brand?: string | null;
  tyre_model?: string | null;
  tyre_dimension?: string | null;
  dot_week?: number | null;
  dot_year?: number | null;
  notes?: string | null;
};

export async function getInspection(input: { organizationId: string; inspectionId: string }) {
  return withTransaction(async (client) => {
    const insp = await client.query<{
      id: string;
      inspection_status: string;
      tire_case_id: string | null;
      vehicle_id: string | null;
      captured_at: string;
    }>(
      `select id, inspection_status, tire_case_id, vehicle_id, captured_at
       from tire_inspections
       where organization_id = $1 and id = $2
       limit 1`,
      [input.organizationId, input.inspectionId]
    );
    const i = insp.rows[0];
    if (!i) return null;

    const positions = await client.query<InspectionPositionRow>(
      `select id, position, tread_depth_mm, tread_depth_source, verified, confidence,
              ai_tread_depth_mm, ai_confidence, ai_model_version,
              wear_pattern, damage_types, tyre_brand, tyre_model, tyre_dimension, dot_week, dot_year, notes
       from tire_inspection_positions
       where organization_id = $1 and inspection_id = $2
       order by position asc`,
      [input.organizationId, input.inspectionId]
    );

    return { inspection: i, positions: positions.rows };
  });
}

export async function confirmAllPositions(input: {
  organizationId: string;
  inspectionId: string;
  actorUserId: string;
}) {
  return withTransaction(async (client) => {
    await client.query(
      `update tire_inspection_positions
       set verified = true,
           verified_by_user_id = $1,
           verified_at = now(),
           tread_depth_mm = coalesce(tread_depth_mm, ai_tread_depth_mm),
           tread_depth_source = case
             when tread_depth_source in ('AI_ESTIMATE','IMAGE_RECOGNITION') then 'TECHNICIAN_CONFIRMED_AI_RESULT'
             when tread_depth_source is null and ai_tread_depth_mm is not null then 'TECHNICIAN_CONFIRMED_AI_RESULT'
             else tread_depth_source
           end
       where organization_id = $2 and inspection_id = $3`,
      [input.actorUserId, input.organizationId, input.inspectionId]
    );

    await client.query(
      `update tire_inspections
       set inspection_status = 'VERIFIED',
           verified_at = now(),
           verified_by_user_id = $1
       where organization_id = $2 and id = $3`,
      [input.actorUserId, input.organizationId, input.inspectionId]
    );
  });
}

export async function setTechnicianTreadDepth(input: {
  organizationId: string;
  inspectionId: string;
  position: string;
  treadDepthMm: number;
  actorUserId: string;
}) {
  return withTransaction(async (client) => {
    const prev = await client.query<{ tread_depth_mm: number | null; tread_depth_source: string | null }>(
      `select tread_depth_mm, tread_depth_source
       from tire_inspection_positions
       where organization_id = $1 and inspection_id = $2 and position = $3
       limit 1`,
      [input.organizationId, input.inspectionId, input.position]
    );

    await client.query(
      `update tire_inspection_positions
       set tread_depth_mm = $1,
           tread_depth_source = 'TECHNICIAN_PHYSICAL_MEASUREMENT',
           verified = true,
           verified_by_user_id = $2,
           verified_at = now()
       where organization_id = $3 and inspection_id = $4 and position = $5`,
      [
        input.treadDepthMm,
        input.actorUserId,
        input.organizationId,
        input.inspectionId,
        input.position
      ]
    );

    // If all positions are verified -> mark inspection verified
    const remaining = await client.query<{ c: string }>(
      `select count(*)::text as c
       from tire_inspection_positions
       where organization_id = $1 and inspection_id = $2 and verified != true`,
      [input.organizationId, input.inspectionId]
    );
    if (Number(remaining.rows[0]?.c ?? "0") === 0) {
      await client.query(
        `update tire_inspections
         set inspection_status = 'VERIFIED', verified_at = now(), verified_by_user_id = $1
         where organization_id = $2 and id = $3`,
        [input.actorUserId, input.organizationId, input.inspectionId]
      );
    }

    // Store an audit event on linked case if present
    const insp = await client.query<{ tire_case_id: string | null }>(
      `select tire_case_id from tire_inspections where organization_id = $1 and id = $2 limit 1`,
      [input.organizationId, input.inspectionId]
    );
    const caseId = insp.rows[0]?.tire_case_id ?? null;
    if (caseId) {
      await client.query(
        `insert into tire_case_events (
           organization_id, tire_case_id, event_type, source, actor_user_id, previous_value, new_value, data
         )
         values ($1,$2,'TREAD_DEPTH_RECORDED','TECHNICIAN',$3,$4,$5,$6)`,
        [
          input.organizationId,
          caseId,
          input.actorUserId,
          JSON.stringify({ position: input.position, tread_depth_mm: prev.rows[0]?.tread_depth_mm ?? null, source: prev.rows[0]?.tread_depth_source ?? null }),
          JSON.stringify({ position: input.position, tread_depth_mm: input.treadDepthMm, source: "TECHNICIAN_PHYSICAL_MEASUREMENT" }),
          JSON.stringify({ inspectionId: input.inspectionId })
        ]
      );
    }
  });
}

