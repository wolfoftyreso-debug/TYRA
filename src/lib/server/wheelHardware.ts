import { query, withTransaction } from "@/lib/server/db";

export type WheelSetHardware = {
  wheelSetId: string;
  hasCenterBore: boolean | null;
  centerBoreNotes: string | null;
  hasHubRings: boolean | null;
  hubRingDimensions: string | null;
  hubRingNotes: string | null;
  centerCapType: "NONE" | "PLASTIC_CAP" | "LUG_COVERS" | "UNKNOWN" | null;
  capNotes: string | null;
  hasWheelLock: boolean | null;
  wheelLockKeyPresent: boolean | null;
  wheelLockKeyLocation: string | null;
  boltsSummer: string | null;
  boltsWinter: string | null;
  notes: string | null;
  updatedAt: string | null;
};

export async function getWheelSetHardware(input: { organizationId: string; wheelSetId: string }) {
  const res = await query<{
    wheel_set_id: string;
    has_center_bore: boolean | null;
    center_bore_notes: string | null;
    has_hub_rings: boolean | null;
    hub_ring_dimensions: string | null;
    hub_ring_notes: string | null;
    center_cap_type: "NONE" | "PLASTIC_CAP" | "LUG_COVERS" | "UNKNOWN" | null;
    cap_notes: string | null;
    has_wheel_lock: boolean | null;
    wheel_lock_key_present: boolean | null;
    wheel_lock_key_location: string | null;
    bolts_summer: string | null;
    bolts_winter: string | null;
    notes: string | null;
    updated_at: string;
  }>(
    `select wheel_set_id,
            has_center_bore, center_bore_notes,
            has_hub_rings, hub_ring_dimensions, hub_ring_notes,
            center_cap_type, cap_notes,
            has_wheel_lock, wheel_lock_key_present, wheel_lock_key_location,
            bolts_summer, bolts_winter, notes, updated_at
     from wheel_set_hardware
     where organization_id = $1 and wheel_set_id = $2
     limit 1`,
    [input.organizationId, input.wheelSetId]
  );
  const r = res.rows[0] ?? null;
  if (!r) {
    const empty: WheelSetHardware = {
      wheelSetId: input.wheelSetId,
      hasCenterBore: null,
      centerBoreNotes: null,
      hasHubRings: null,
      hubRingDimensions: null,
      hubRingNotes: null,
      centerCapType: null,
      capNotes: null,
      hasWheelLock: null,
      wheelLockKeyPresent: null,
      wheelLockKeyLocation: null,
      boltsSummer: null,
      boltsWinter: null,
      notes: null,
      updatedAt: null
    };
    return empty;
  }
  return {
    wheelSetId: r.wheel_set_id,
    hasCenterBore: r.has_center_bore,
    centerBoreNotes: r.center_bore_notes,
    hasHubRings: r.has_hub_rings,
    hubRingDimensions: r.hub_ring_dimensions,
    hubRingNotes: r.hub_ring_notes,
    centerCapType: r.center_cap_type,
    capNotes: r.cap_notes,
    hasWheelLock: r.has_wheel_lock,
    wheelLockKeyPresent: r.wheel_lock_key_present,
    wheelLockKeyLocation: r.wheel_lock_key_location,
    boltsSummer: r.bolts_summer,
    boltsWinter: r.bolts_winter,
    notes: r.notes,
    updatedAt: r.updated_at
  } satisfies WheelSetHardware;
}

export async function upsertWheelSetHardware(input: {
  organizationId: string;
  wheelSetId: string;
  patch: Partial<Omit<WheelSetHardware, "wheelSetId" | "updatedAt">>;
}) {
  return withTransaction(async (client) => {
    await client.query(
      `insert into wheel_set_hardware (
         organization_id, wheel_set_id,
         has_center_bore, center_bore_notes,
         has_hub_rings, hub_ring_dimensions, hub_ring_notes,
         center_cap_type, cap_notes,
         has_wheel_lock, wheel_lock_key_present, wheel_lock_key_location,
         bolts_summer, bolts_winter,
         notes, updated_at
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now())
       on conflict (organization_id, wheel_set_id) do update
         set has_center_bore = coalesce(excluded.has_center_bore, wheel_set_hardware.has_center_bore),
             center_bore_notes = coalesce(excluded.center_bore_notes, wheel_set_hardware.center_bore_notes),
             has_hub_rings = coalesce(excluded.has_hub_rings, wheel_set_hardware.has_hub_rings),
             hub_ring_dimensions = coalesce(excluded.hub_ring_dimensions, wheel_set_hardware.hub_ring_dimensions),
             hub_ring_notes = coalesce(excluded.hub_ring_notes, wheel_set_hardware.hub_ring_notes),
             center_cap_type = coalesce(excluded.center_cap_type, wheel_set_hardware.center_cap_type),
             cap_notes = coalesce(excluded.cap_notes, wheel_set_hardware.cap_notes),
             has_wheel_lock = coalesce(excluded.has_wheel_lock, wheel_set_hardware.has_wheel_lock),
             wheel_lock_key_present = coalesce(excluded.wheel_lock_key_present, wheel_set_hardware.wheel_lock_key_present),
             wheel_lock_key_location = coalesce(excluded.wheel_lock_key_location, wheel_set_hardware.wheel_lock_key_location),
             bolts_summer = coalesce(excluded.bolts_summer, wheel_set_hardware.bolts_summer),
             bolts_winter = coalesce(excluded.bolts_winter, wheel_set_hardware.bolts_winter),
             notes = coalesce(excluded.notes, wheel_set_hardware.notes),
             updated_at = now()`,
      [
        input.organizationId,
        input.wheelSetId,
        input.patch.hasCenterBore ?? null,
        input.patch.centerBoreNotes ?? null,
        input.patch.hasHubRings ?? null,
        input.patch.hubRingDimensions ?? null,
        input.patch.hubRingNotes ?? null,
        input.patch.centerCapType ?? null,
        input.patch.capNotes ?? null,
        input.patch.hasWheelLock ?? null,
        input.patch.wheelLockKeyPresent ?? null,
        input.patch.wheelLockKeyLocation ?? null,
        input.patch.boltsSummer ?? null,
        input.patch.boltsWinter ?? null,
        input.patch.notes ?? null
      ]
    );
    return { ok: true as const };
  });
}

