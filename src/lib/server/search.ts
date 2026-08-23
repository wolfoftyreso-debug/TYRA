import { query } from "./db";

export type WheelSetSummary = {
  id: string;
  season: string;
  status: string;
  storage_status: string;
  public_code: string | null;
  storage_code: string | null;
};

export type VehicleLookup = {
  id: string;
  registration_number: string;
  make: string | null;
  model: string | null;
  model_year: number | null;
  customer_name: string | null;
  wheel_sets: WheelSetSummary[];
};

export async function lookupByRegistration(input: {
  organizationId: string;
  registrationNumber: string;
}) {
  const vehicleRes = await query<{
    id: string;
    registration_number: string;
    make: string | null;
    model: string | null;
    model_year: number | null;
    customer_name: string | null;
  }>(
    `select v.id, v.registration_number, v.make, v.model, v.model_year,
            c.name as customer_name
     from vehicles v
     left join customers c on c.id = v.customer_id and c.organization_id = v.organization_id
     where v.organization_id = $1 and v.registration_number = $2
     limit 1`,
    [input.organizationId, input.registrationNumber]
  );

  const vehicle = vehicleRes.rows[0];
  if (!vehicle) return null;

  const setsRes = await query<WheelSetSummary>(
    `select ws.id, ws.season, ws.status, ws.storage_status,
            wsl.public_code,
            sp.code as storage_code
     from wheel_sets ws
     left join wheel_set_labels wsl on wsl.wheel_set_id = ws.id and wsl.organization_id = ws.organization_id
     left join storage_stays ss on ss.wheel_set_id = ws.id and ss.organization_id = ws.organization_id and ss.ended_at is null
     left join storage_positions sp on sp.id = ss.position_id and sp.organization_id = ws.organization_id
     where ws.organization_id = $1 and ws.vehicle_id = $2
     order by ws.created_at asc`,
    [input.organizationId, vehicle.id]
  );

  const out: VehicleLookup = {
    ...vehicle,
    wheel_sets: setsRes.rows
  };
  return out;
}

export async function lookupByStoragePosition(input: {
  organizationId: string;
  code: string;
}) {
  const posRes = await query<{ id: string; code: string }>(
    `select id, code
     from storage_positions
     where organization_id = $1 and code = $2
     limit 1`,
    [input.organizationId, input.code]
  );
  const pos = posRes.rows[0];
  if (!pos) return null;

  const setsRes = await query<{
    wheel_set_id: string;
    season: string;
    status: string;
    storage_status: string;
    public_code: string | null;
    registration_number: string | null;
    make: string | null;
    model: string | null;
    customer_name: string | null;
  }>(
    `select ws.id as wheel_set_id, ws.season, ws.status, ws.storage_status,
            wsl.public_code,
            v.registration_number, v.make, v.model,
            c.name as customer_name
     from storage_stays ss
     join wheel_sets ws on ws.id = ss.wheel_set_id and ws.organization_id = ss.organization_id
     left join wheel_set_labels wsl on wsl.wheel_set_id = ws.id and wsl.organization_id = ws.organization_id
     left join vehicles v on v.id = ws.vehicle_id and v.organization_id = ws.organization_id
     left join customers c on c.id = ws.customer_id and c.organization_id = ws.organization_id
     where ss.organization_id = $1 and ss.position_id = $2 and ss.ended_at is null
     order by ss.started_at desc`,
    [input.organizationId, pos.id]
  );

  return { position: pos, wheelSets: setsRes.rows };
}

export async function lookupByWheelSetCode(input: {
  organizationId: string;
  code: string;
}) {
  const res = await query<{
    wheel_set_id: string;
    season: string;
    status: string;
    storage_status: string;
    public_code: string;
    storage_code: string | null;
    registration_number: string | null;
    make: string | null;
    model: string | null;
    customer_name: string | null;
  }>(
    `select ws.id as wheel_set_id, ws.season, ws.status, ws.storage_status,
            wsl.public_code,
            sp.code as storage_code,
            v.registration_number, v.make, v.model,
            c.name as customer_name
     from wheel_set_labels wsl
     join wheel_sets ws on ws.id = wsl.wheel_set_id and ws.organization_id = wsl.organization_id
     left join storage_stays ss on ss.wheel_set_id = ws.id and ss.organization_id = ws.organization_id and ss.ended_at is null
     left join storage_positions sp on sp.id = ss.position_id and sp.organization_id = ws.organization_id
     left join vehicles v on v.id = ws.vehicle_id and v.organization_id = ws.organization_id
     left join customers c on c.id = ws.customer_id and c.organization_id = ws.organization_id
     where wsl.organization_id = $1 and wsl.public_code = $2
     limit 1`,
    [input.organizationId, input.code]
  );
  return res.rows[0] ?? null;
}

export async function listPickQueue(input: { organizationId: string }) {
  const res = await query<{
    id: string;
    status: string;
    scheduled_at: string | null;
    registration_number: string | null;
    customer_name: string | null;
    season: string;
    storage_code: string | null;
  }>(
    `select pt.id, pt.status, pt.scheduled_at,
            v.registration_number,
            c.name as customer_name,
            ws.season,
            sp.code as storage_code
     from pick_tasks pt
     join wheel_sets ws on ws.id = pt.wheel_set_id and ws.organization_id = pt.organization_id
     left join vehicles v on v.id = ws.vehicle_id and v.organization_id = ws.organization_id
     left join customers c on c.id = ws.customer_id and c.organization_id = ws.organization_id
     left join storage_stays ss on ss.wheel_set_id = ws.id and ss.organization_id = ws.organization_id and ss.ended_at is null
     left join storage_positions sp on sp.id = ss.position_id and sp.organization_id = ws.organization_id
     where pt.organization_id = $1
     order by coalesce(pt.scheduled_at, pt.created_at) asc
     limit 200`,
    [input.organizationId]
  );
  return res.rows;
}

export async function listOpenOpportunities(input: { organizationId: string }) {
  const res = await query<{
    id: string;
    reason: string;
    status: string;
    created_at: string;
    registration_number: string | null;
    customer_name: string | null;
    season: string;
    storage_code: string | null;
  }>(
    `select ro.id, ro.reason, ro.status, ro.created_at,
            v.registration_number,
            c.name as customer_name,
            ws.season,
            sp.code as storage_code
     from replacement_opportunities ro
     join wheel_sets ws on ws.id = ro.wheel_set_id and ws.organization_id = ro.organization_id
     left join vehicles v on v.id = ws.vehicle_id and v.organization_id = ws.organization_id
     left join customers c on c.id = ws.customer_id and c.organization_id = ws.organization_id
     left join storage_stays ss on ss.wheel_set_id = ws.id and ss.organization_id = ws.organization_id and ss.ended_at is null
     left join storage_positions sp on sp.id = ss.position_id and sp.organization_id = ws.organization_id
     where ro.organization_id = $1 and ro.status = 'open'
     order by ro.created_at desc
     limit 200`,
    [input.organizationId]
  );
  return res.rows;
}

