import { query } from "@/lib/server/db";

export async function markVehicleSoldByRegistration(input: {
  organizationId: string;
  registrationNumber: string;
}) {
  const res = await query<{ id: string }>(
    `update vehicles
     set lifecycle_status = 'SOLD', sold_at = now()
     where organization_id = $1 and registration_number = $2
     returning id`,
    [input.organizationId, input.registrationNumber.toUpperCase()]
  );
  if (!res.rows[0]) throw new Error("Hittade inget fordon.");

  // Stop open reminder threads for this vehicle
  await query(
    `update reminder_threads
     set status = 'STOPPED',
         stopped_reason = 'SOLD_VEHICLE',
         stopped_at = now(),
         updated_at = now()
     where organization_id = $1 and vehicle_id = $2 and status = 'OPEN'`,
    [input.organizationId, res.rows[0].id]
  );

  return { ok: true as const };
}

export async function markWheelSetForgottenByPublicCode(input: {
  organizationId: string;
  wheelSetPublicCode: string;
  notes?: string | null;
}) {
  const ws = await query<{ wheel_set_id: string }>(
    `select wheel_set_id
     from wheel_set_labels
     where organization_id = $1 and public_code = $2
     limit 1`,
    [input.organizationId, input.wheelSetPublicCode.toUpperCase()]
  );
  const id = ws.rows[0]?.wheel_set_id ?? null;
  if (!id) throw new Error("Hittade inget hjulset på den koden.");

  await query(
    `update wheel_sets
     set disposition_status = 'FORGOTTEN_LEFT_BEHIND',
         disposition_notes = $3,
         updated_at = now()
     where organization_id = $1 and id = $2`,
    [input.organizationId, id, input.notes ?? null]
  );

  return { ok: true as const };
}

export async function markCustomerDeceasedByRegistration(input: {
  organizationId: string;
  registrationNumber: string;
}) {
  const v = await query<{ id: string; customer_id: string | null }>(
    `select id, customer_id
     from vehicles
     where organization_id = $1 and registration_number = $2
     limit 1`,
    [input.organizationId, input.registrationNumber.toUpperCase()]
  );
  const vehicleId = v.rows[0]?.id ?? null;
  const customerId = v.rows[0]?.customer_id ?? null;
  if (!vehicleId) throw new Error("Hittade inget fordon.");
  if (!customerId) throw new Error("Fordonet saknar kund kopplad.");

  await query(
    `update customers
     set lifecycle_status = 'DECEASED',
         deceased_at = coalesce(deceased_at, now()),
         updated_at = now()
     where organization_id = $1 and id = $2`,
    [input.organizationId, customerId]
  );

  // Mark all wheel sets for the vehicle as belonging to the estate
  await query(
    `update wheel_sets
     set disposition_status = 'ESTATE',
         disposition_notes = coalesce(disposition_notes, 'Tillhör dödsbo'),
         updated_at = now()
     where organization_id = $1 and vehicle_id = $2`,
    [input.organizationId, vehicleId]
  );

  // Stop open reminder threads for this vehicle and linked wheel sets
  await query(
    `update reminder_threads
     set status = 'STOPPED',
         stopped_reason = 'CUSTOMER_DECEASED',
         stopped_at = now(),
         updated_at = now()
     where organization_id = $1 and vehicle_id = $2 and status = 'OPEN'`,
    [input.organizationId, vehicleId]
  );

  return { ok: true as const };
}

