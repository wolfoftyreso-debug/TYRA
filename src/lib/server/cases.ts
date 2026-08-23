import type { CanonicalOperation } from "@/lib/domain/services";
import { buildWorkCard } from "@/lib/domain/case";

import { query, withTransaction } from "./db";

export type CaseEventSource =
  | "SYSTEM"
  | "DMS"
  | "TECHNICIAN"
  | "ADVISOR"
  | "WAREHOUSE"
  | "CUSTOMER";

export type DmsMappingRow = {
  canonical_operation: string;
  mapping_version: number;
};

async function recordCaseEvent(client: import("pg").PoolClient, input: {
  organizationId: string;
  tireCaseId: string;
  eventType: string;
  actorUserId?: string | null;
  source: CaseEventSource;
  data?: unknown;
  previousValue?: unknown;
  newValue?: unknown;
  dmsExternalEventId?: string | null;
}) {
  await client.query(
    `insert into tire_case_events (
       organization_id, tire_case_id, event_type,
       data, actor_user_id, source, previous_value, new_value, dms_external_event_id
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      input.organizationId,
      input.tireCaseId,
      input.eventType,
      input.data ? JSON.stringify(input.data) : null,
      input.actorUserId ?? null,
      input.source,
      input.previousValue ? JSON.stringify(input.previousValue) : null,
      input.newValue ? JSON.stringify(input.newValue) : null,
      input.dmsExternalEventId ?? null
    ]
  );
}

export async function resolveCanonicalOpsFromDmsCodes(input: {
  organizationId: string;
  dmsSystemKey: string;
  dmsCodes: string[];
}) {
  if (!input.dmsCodes.length) return [];
  const res = await query<DmsMappingRow>(
    `select canonical_operation, mapping_version
     from dms_code_mappings
     where organization_id = $1
       and dms_system_key = $2
       and dms_code = any($3::text[])
       and active = true`,
    [input.organizationId, input.dmsSystemKey, input.dmsCodes]
  );
  // For v1: one active mapping per code (latest version handled by active flag).
  return res.rows.map((r) => r.canonical_operation as CanonicalOperation);
}

export async function ingestDmsEventAndUpsertCase(input: {
  organizationId: string;
  sourceSystemKey: string;
  externalEventId: string;
  occurredAtIso: string;
  externalOrderId?: string | null;
  externalBookingId?: string | null;
  externalLineId?: string | null;
  dmsCodes: string[];
  vehicleRegistrationNumber?: string | null;
}) {
  return withTransaction(async (client) => {
    // Idempotency: insert event if missing
    const evRes = await client.query<{ id: string }>(
      `insert into dms_external_events (
         organization_id, source_system_key, external_event_id,
         external_order_id, external_booking_id, external_line_id,
         occurred_at, payload, processing_status
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,'RECEIVED')
       on conflict (organization_id, source_system_key, external_event_id)
       do update set external_order_id = excluded.external_order_id
       returning id`,
      [
        input.organizationId,
        input.sourceSystemKey,
        input.externalEventId,
        input.externalOrderId ?? null,
        input.externalBookingId ?? null,
        input.externalLineId ?? null,
        input.occurredAtIso,
        JSON.stringify({
          dmsCodes: input.dmsCodes,
          vehicleRegistrationNumber: input.vehicleRegistrationNumber ?? null
        })
      ]
    );

    // Resolve vehicle/customer context if provided
    let vehicleId: string | null = null;
    let customerId: string | null = null;
    if (input.vehicleRegistrationNumber) {
      const v = await client.query<{ id: string; customer_id: string | null }>(
        `select id, customer_id
         from vehicles
         where organization_id = $1 and registration_number = $2
         limit 1`,
        [input.organizationId, input.vehicleRegistrationNumber]
      );
      vehicleId = v.rows[0]?.id ?? null;
      customerId = v.rows[0]?.customer_id ?? null;
    }

    const ops = await resolveCanonicalOpsFromDmsCodes({
      organizationId: input.organizationId,
      dmsSystemKey: input.sourceSystemKey,
      dmsCodes: input.dmsCodes
    });

    // Create new case for now (v1). Later: correlate by external order id / booking.
    const caseRes = await client.query<{ id: string }>(
      `insert into tire_cases (
         organization_id, customer_id, vehicle_id, intent,
         case_status, work_status, wheel_status, commercial_status, documentation_status,
         source_state, target_state
       )
       values ($1,$2,$3,$4,'OPEN','READY','UNKNOWN','NOT_REQUIRED','NOT_REQUIRED',$5,$6)
       returning id`,
      [
        input.organizationId,
        customerId,
        vehicleId,
        ops.includes("TIRE_SWAP_FROM_STORAGE") ? "TIRE_SWAP_APPOINTMENT" : "MIXED",
        JSON.stringify({}),
        JSON.stringify({})
      ]
    );
    const tireCaseId = caseRes.rows[0]!.id;

    await recordCaseEvent(client, {
      organizationId: input.organizationId,
      tireCaseId,
      eventType: "TIRE_CASE_CREATED",
      source: "DMS",
      data: { intent: ops.includes("TIRE_SWAP_FROM_STORAGE") ? "TIRE_SWAP_APPOINTMENT" : "MIXED" },
      dmsExternalEventId: evRes.rows[0]!.id
    });

    if (input.externalOrderId) {
      await client.query(
        `insert into tire_case_external_links (organization_id, tire_case_id, source_system_key, external_order_id, external_booking_id)
         values ($1,$2,$3,$4,$5)
         on conflict do nothing`,
        [
          input.organizationId,
          tireCaseId,
          input.sourceSystemKey,
          input.externalOrderId,
          input.externalBookingId ?? null
        ]
      );
    }

    for (const op of ops) {
      await client.query(
        `insert into tire_case_operations (organization_id, tire_case_id, canonical_operation, source_system_key, external_order_id, external_line_id)
         values ($1,$2,$3,$4,$5,$6)`,
        [
          input.organizationId,
          tireCaseId,
          op,
          input.sourceSystemKey,
          input.externalOrderId ?? null,
          input.externalLineId ?? null
        ]
      );
    }

    await client.query(
      `select 1`
    );
    await recordCaseEvent(client, {
      organizationId: input.organizationId,
      tireCaseId,
      eventType: "DMS_ORDER_RECEIVED",
      source: "DMS",
      data: {
        sourceSystemKey: input.sourceSystemKey,
        externalEventId: input.externalEventId,
        dmsCodes: input.dmsCodes
      },
      dmsExternalEventId: evRes.rows[0]!.id
    });

    // Generate steps from domain resolver
    const steps = buildWorkCard({
      tireCase: { id: tireCaseId, requestedOperations: ops },
      vehicle: input.vehicleRegistrationNumber
        ? { registrationNumber: input.vehicleRegistrationNumber }
        : null,
      sourceWheelStatus: "STORED",
      targetWheelStatus: ops.includes("STORAGE_IN") ? "STORED" : "IN_WORKSHOP"
    }).steps;

    let i = 0;
    for (const s of steps) {
      await client.query(
        `insert into tire_case_steps (
           organization_id, tire_case_id, step_kind, title, status, required, requires, sort_order
         )
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          input.organizationId,
          tireCaseId,
          s.kind,
          s.title,
          s.status,
          s.required,
          JSON.stringify(s.requires ?? {}),
          i++
        ]
      );
    }

    await client.query(
      `update dms_external_events
       set processing_status = 'PROCESSED'
       where organization_id = $1 and source_system_key = $2 and external_event_id = $3`,
      [input.organizationId, input.sourceSystemKey, input.externalEventId]
    );

    return { tireCaseId, canonicalOperations: ops, dmsEventId: evRes.rows[0]!.id };
  });
}

export async function listCases(input: { organizationId: string }) {
  const res = await query<{
    id: string;
    intent: string;
    case_status: string;
    updated_at: string;
    registration_number: string | null;
    customer_name: string | null;
  }>(
    `select tc.id, tc.intent, tc.case_status, tc.updated_at,
            v.registration_number,
            c.name as customer_name
     from tire_cases tc
     left join vehicles v on v.id = tc.vehicle_id and v.organization_id = tc.organization_id
     left join customers c on c.id = tc.customer_id and c.organization_id = tc.organization_id
     where tc.organization_id = $1
     order by tc.updated_at desc
     limit 200`,
    [input.organizationId]
  );
  return res.rows;
}

export async function getCaseWorkCard(input: { organizationId: string; tireCaseId: string }) {
  const tcRes = await query<{
    id: string;
    vehicle_id: string | null;
  }>(
    `select id, vehicle_id
     from tire_cases
     where organization_id = $1 and id = $2
     limit 1`,
    [input.organizationId, input.tireCaseId]
  );
  const tc = tcRes.rows[0];
  if (!tc) return null;

  const opsRes = await query<{ canonical_operation: string }>(
    `select canonical_operation
     from tire_case_operations
     where organization_id = $1 and tire_case_id = $2
     order by created_at asc`,
    [input.organizationId, input.tireCaseId]
  );
  const ops = opsRes.rows.map((r) => r.canonical_operation as CanonicalOperation);

  const vRes = tc.vehicle_id
    ? await query<{ registration_number: string | null; make: string | null; model: string | null }>(
        `select registration_number, make, model
         from vehicles
         where organization_id = $1 and id = $2
         limit 1`,
        [input.organizationId, tc.vehicle_id]
      )
    : { rows: [] as any[] };
  const vehicle = vRes.rows[0] ?? null;

  const stepsRes = await query<{
    step_kind: string;
    title: string;
    status: string;
    required: boolean;
    requires: any;
    sort_order: number;
  }>(
    `select step_kind, title, status, required, requires, sort_order
     from tire_case_steps
     where organization_id = $1 and tire_case_id = $2
     order by sort_order asc`,
    [input.organizationId, input.tireCaseId]
  );

  // Build "next best action" deterministically (first TODO)
  const steps = stepsRes.rows.map((r) => ({
    kind: r.step_kind as any,
    title: r.title,
    status: r.status as any,
    required: r.required,
    requires: r.requires ?? {}
  }));
  const next = steps.find((s) => s.status === "TODO") ?? null;

  return {
    caseId: input.tireCaseId,
    headline:
      vehicle?.make && vehicle?.model && vehicle?.registration_number
        ? `${vehicle.make.toUpperCase()} ${vehicle.model.toUpperCase()} — ${vehicle.registration_number}`
        : vehicle?.registration_number ?? "Ärende",
    summary: ops.join(" + ").replaceAll("_", " ").toLowerCase(),
    nextBestAction: next ? { title: `Nästa: ${next.title}`, stepKind: next.kind } : null,
    steps
  };
}

export async function listCaseEvents(input: { organizationId: string; tireCaseId: string }) {
  const res = await query<{
    id: string;
    event_type: string;
    source: string;
    actor_user_id: string | null;
    previous_value: any;
    new_value: any;
    data: any;
    created_at: string;
  }>(
    `select id, event_type, source, actor_user_id, previous_value, new_value, data, created_at
     from tire_case_events
     where organization_id = $1 and tire_case_id = $2
     order by created_at desc
     limit 200`,
    [input.organizationId, input.tireCaseId]
  );
  return res.rows;
}

export async function setStepStatus(input: {
  organizationId: string;
  tireCaseId: string;
  stepKind: string;
  status: "TODO" | "DOING" | "DONE" | "BLOCKED";
  actorUserId: string;
  source?: CaseEventSource;
}) {
  return withTransaction(async (client) => {
    const prevRes = await client.query<{ id: string; status: string }>(
      `select id, status
       from tire_case_steps
       where organization_id = $1 and tire_case_id = $2 and step_kind = $3
       limit 1`,
      [input.organizationId, input.tireCaseId, input.stepKind]
    );
    const prev = prevRes.rows[0];
    if (!prev) throw new Error("Steg saknas.");

    await client.query(
      `update tire_case_steps
       set status = $1, updated_at = now()
       where organization_id = $2 and tire_case_id = $3 and step_kind = $4`,
      [input.status, input.organizationId, input.tireCaseId, input.stepKind]
    );

    await recordCaseEvent(client, {
      organizationId: input.organizationId,
      tireCaseId: input.tireCaseId,
      eventType: `${input.stepKind}_STATUS_CHANGED`,
      actorUserId: input.actorUserId,
      source: input.source ?? "TECHNICIAN",
      previousValue: { status: prev.status },
      newValue: { status: input.status }
    });

    // Auto-complete case when all required steps are DONE
    const remaining = await client.query<{ c: string }>(
      `select count(*)::text as c
       from tire_case_steps
       where organization_id = $1 and tire_case_id = $2 and required = true and status != 'DONE'`,
      [input.organizationId, input.tireCaseId]
    );
    if (Number(remaining.rows[0]?.c ?? "0") === 0) {
      const prevCase = await client.query<{ case_status: string }>(
        `select case_status from tire_cases where organization_id = $1 and id = $2 limit 1`,
        [input.organizationId, input.tireCaseId]
      );
      await client.query(
        `update tire_cases
         set case_status = 'DONE', work_status = 'DONE', updated_at = now()
         where organization_id = $1 and id = $2`,
        [input.organizationId, input.tireCaseId]
      );
      await recordCaseEvent(client, {
        organizationId: input.organizationId,
        tireCaseId: input.tireCaseId,
        eventType: "CASE_COMPLETED",
        actorUserId: input.actorUserId,
        source: input.source ?? "TECHNICIAN",
        previousValue: { case_status: prevCase.rows[0]?.case_status ?? null },
        newValue: { case_status: "DONE" }
      });
    }
  });
}

export async function blockCase(input: {
  organizationId: string;
  tireCaseId: string;
  actorUserId: string;
  reason: string; // e.g. WHEEL_SET_NOT_FOUND
  details: unknown;
  source?: CaseEventSource;
}) {
  return withTransaction(async (client) => {
    const prev = await client.query<{ case_status: string; blocked_reason: string | null }>(
      `select case_status, blocked_reason
       from tire_cases
       where organization_id = $1 and id = $2
       limit 1`,
      [input.organizationId, input.tireCaseId]
    );
    if (!prev.rows[0]) throw new Error("Ärende saknas.");

    await client.query(
      `update tire_cases
       set case_status = 'BLOCKED',
           blocked_reason = $1,
           blocked_details = $2,
           blocked_at = now(),
           blocked_by_user_id = $3,
           updated_at = now()
       where organization_id = $4 and id = $5`,
      [
        input.reason,
        JSON.stringify(input.details ?? {}),
        input.actorUserId,
        input.organizationId,
        input.tireCaseId
      ]
    );

    await client.query(
      `insert into tire_case_exceptions (
         organization_id, tire_case_id, exception_type, details, status, opened_by_user_id
       )
       values ($1,$2,$3,$4,'OPEN',$5)`,
      [
        input.organizationId,
        input.tireCaseId,
        input.reason,
        JSON.stringify(input.details ?? {}),
        input.actorUserId
      ]
    );

    await recordCaseEvent(client, {
      organizationId: input.organizationId,
      tireCaseId: input.tireCaseId,
      eventType: "CASE_BLOCKED",
      actorUserId: input.actorUserId,
      source: input.source ?? "TECHNICIAN",
      previousValue: { case_status: prev.rows[0].case_status, blocked_reason: prev.rows[0].blocked_reason },
      newValue: { case_status: "BLOCKED", blocked_reason: input.reason },
      data: { details: input.details ?? {} }
    });
  });
}

