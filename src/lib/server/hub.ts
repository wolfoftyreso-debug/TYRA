import { computeInstalledPrice, type PricingRule } from "@/lib/domain/pricing";
import { computeTireHealth } from "@/lib/domain/tireHealth";
import { computeTireWarnings } from "@/lib/domain/tireWarnings";
import type { SupplierId } from "@/lib/suppliers/types";
import type { TireWarning } from "@/lib/domain/tireWarnings";

import { query, withTransaction } from "./db";
import { generateOpaqueToken, sha256 } from "./tokens";
import { getCachedOfferForProduct, searchSupplierProducts } from "./suppliers/gateway";

export async function getOrCreateCustomerHubLink(input: {
  organizationId: string;
  customerId: string;
}) {
  return withTransaction(async (client) => {
    const existing = await client.query<{ token_hash: string }>(
      `select token_hash
       from customer_hub_links
       where organization_id = $1 and customer_id = $2 and revoked_at is null
       limit 1`,
      [input.organizationId, input.customerId]
    );
    if (existing.rows[0]) {
      // We cannot reconstruct the original token from hash; create a fresh token and rotate.
      // For a permanent hub, the stable identity is the (org, customer) link; token can be rotated.
      await client.query(
        `update customer_hub_links
         set revoked_at = now()
         where organization_id = $1 and customer_id = $2 and revoked_at is null`,
        [input.organizationId, input.customerId]
      );
    }

    const token = generateOpaqueToken(24);
    const tokenHash = sha256(token);
    await client.query(
      `insert into customer_hub_links (organization_id, customer_id, token_hash)
       values ($1,$2,$3)
       on conflict (organization_id, customer_id) do update
         set token_hash = excluded.token_hash,
             revoked_at = null,
             created_at = now()`,
      [input.organizationId, input.customerId, tokenHash]
    );

    return { token };
  });
}

export type HubWheelPosition = string;

export type HubPositionView = {
  position: HubWheelPosition;
  health: ReturnType<typeof computeTireHealth>;
  warnings: TireWarning[];
  tyre: {
    brand: string | null;
    model: string | null;
    dimension: string | null;
    dotYear: number | null;
  };
};

export type CommercialState =
  | "NO_NEED"
  | "REPLACEMENT_MONITORING"
  | "REPLACEMENT_RECOMMENDED"
  | "LIVE_OPTIONS_AVAILABLE"
  | "PRODUCT_SELECTED"
  | "VEHICLE_VERIFICATION_REQUIRED"
  | "ORDER_CONFIRMED"
  | "PROCUREMENT_PENDING"
  | "PRODUCT_RESERVED"
  | "PRODUCT_ORDERED"
  | "READY_FOR_INSTALLATION"
  | "BOOKED"
  | "INSTALLED"
  | "COMPLETED";

function normalizeReg(input: string) {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

function defaultPositionsForWheelCount(wheelCount: number | null) {
  if (wheelCount === 4) return ["LF", "RF", "LR", "RR"];
  if (wheelCount === 5) return ["LF", "RF", "LR", "RR", "SPARE"];
  if (wheelCount === 6) return ["LF", "RF", "LRO", "LRI", "RRO", "RRI"];
  return ["LF", "RF", "LR", "RR"];
}

export async function getHubViewByToken(input: { token: string }) {
  const tokenHash = sha256(input.token);

  const linkRes = await query<{ organization_id: string; customer_id: string }>(
    `select organization_id, customer_id
     from customer_hub_links
     where token_hash = $1 and revoked_at is null
     limit 1`,
    [tokenHash]
  );
  const link = linkRes.rows[0];
  if (!link) return null;

  // Touch last_used_at (best-effort)
  await query(
    `update customer_hub_links set last_used_at = now()
     where token_hash = $1`,
    [tokenHash]
  );

  const customerRes = await query<{ name: string }>(
    `select name from customers where organization_id = $1 and id = $2 limit 1`,
    [link.organization_id, link.customer_id]
  );
  const customerName = customerRes.rows[0]?.name ?? "Kund";

  // Pick one vehicle for now: most recently created vehicle for this customer.
  const vehicleRes = await query<{
    id: string;
    registration_number: string;
    make: string | null;
    model: string | null;
  }>(
    `select id, registration_number, make, model
     from vehicles
     where organization_id = $1 and customer_id = $2
     order by created_at desc
     limit 1`,
    [link.organization_id, link.customer_id]
  );
  const vehicle = vehicleRes.rows[0];
  if (!vehicle) {
    const prefs = await getOrCreateCommPrefs({
      organizationId: link.organization_id,
      customerId: link.customer_id
    });
    return {
      organizationId: link.organization_id,
      customerId: link.customer_id,
      customerName,
      vehicle: null,
      positions: [] as HubPositionView[],
      liveOptions: null,
      commercialState: "REPLACEMENT_MONITORING" as CommercialState,
      lastOrder: null,
      nextBooking: null,
      storedWheelSets: [],
      prefs
    };
  }

  // Current mounted wheel set (v1 heuristic)
  const wsRes = await query<{ id: string; season: string; wheel_count: number }>(
    `select id, season, wheel_count
     from wheel_sets
     where organization_id = $1 and vehicle_id = $2 and status = 'MOUNTED'
     order by updated_at desc
     limit 1`,
    [link.organization_id, vehicle.id]
  );
  const wheelSetId = wsRes.rows[0]?.id ?? null;
  const mountedSeason = wsRes.rows[0]?.season ?? null;
  const wheelCount = wsRes.rows[0]?.wheel_count ?? null;

  const posRows =
    wheelSetId
      ? await query<{
          position: HubWheelPosition;
          tread_depth_mm: number | null;
          tread_depth_source: string | null;
          confidence: number | null;
          verified: boolean | null;
          tyre_brand: string | null;
          tyre_model: string | null;
          tyre_dimension: string | null;
          dot_week: number | null;
          dot_year: number | null;
          wear_pattern: string | null;
          damage_types: string[] | null;
          notes: string | null;
          valve_age_years: number | null;
          valve_condition: string | null;
        }>(
          `with latest as (
             select id
             from tire_inspections
             where organization_id = $1 and wheel_set_id = $2 and inspection_status = 'VERIFIED'
             order by captured_at desc
             limit 1
           )
           select tip.position,
                  tip.tread_depth_mm,
                  tip.tread_depth_source,
                  tip.confidence,
                  tip.verified,
                  tip.tyre_brand,
                  tip.tyre_model,
                  tip.tyre_dimension,
                  tip.dot_week,
                  tip.dot_year,
                  tip.wear_pattern,
                  tip.damage_types,
                  tip.notes,
                  tip.valve_age_years,
                  tip.valve_condition
           from tire_inspection_positions tip
           join latest on latest.id = tip.inspection_id
           where tip.organization_id = $1
           order by tip.position asc`,
          [link.organization_id, wheelSetId]
        )
      : { rows: [] as any[] };

  const byPos = new Map<HubWheelPosition, HubPositionView>();
  const warningInputs: Array<{
    position: string;
    verified: boolean;
    treadDepthMm: number | null;
    tyreBrand: string | null;
    tyreModel: string | null;
    tyreDimension: string | null;
    dotWeek: number | null;
    dotYear: number | null;
    valveAgeYears: number | null;
    valveCondition: string | null;
    wearPattern: string | null;
    damageTypes: string[] | null;
    notes: string | null;
  }> = [];

  for (const r of posRows.rows) {
    warningInputs.push({
      position: r.position,
      verified: r.verified === true,
      treadDepthMm: r.verified === true ? r.tread_depth_mm : null,
      tyreBrand: r.verified === true ? r.tyre_brand : null,
      tyreModel: r.verified === true ? r.tyre_model : null,
      tyreDimension: r.verified === true ? r.tyre_dimension : null,
      dotWeek: r.dot_week ?? null,
      dotYear: r.dot_year ?? null,
      valveAgeYears: r.valve_age_years ?? null,
      valveCondition: r.valve_condition ?? null,
      wearPattern: r.wear_pattern ?? null,
      damageTypes: (r.damage_types as any) ?? null,
      notes: r.notes ?? null
    });
    byPos.set(r.position, {
      position: r.position,
      health: computeTireHealth({
        treadDepthMm: r.verified === true ? r.tread_depth_mm : null,
        treadDepthSource: r.tread_depth_source,
        confidence: r.confidence,
        verified: r.verified
      }),
      warnings: [],
      tyre: {
        brand: r.verified === true ? r.tyre_brand : null,
        model: r.verified === true ? r.tyre_model : null,
        dimension: r.verified === true ? r.tyre_dimension : null,
        dotYear: r.dot_year
      }
    });
  }

  const warnings = computeTireWarnings({
    positions: warningInputs.length
      ? warningInputs
      : defaultPositionsForWheelCount(wheelCount).map((p) => ({
          position: p,
          verified: false,
          treadDepthMm: null,
          tyreBrand: null,
          tyreModel: null,
          tyreDimension: null,
          dotWeek: null,
          dotYear: null,
          wearPattern: null,
          damageTypes: null,
          notes: null
        })),
    mountedSeason
  });

  for (const [p, v] of byPos.entries()) {
    v.warnings = warnings.positionWarnings[p] ?? [];
  }

  const base = defaultPositionsForWheelCount(wheelCount);
  const extra = [...new Set(posRows.rows.map((r) => r.position))].filter((p) => !base.includes(p));
  const positionOrder: HubWheelPosition[] = [...base, ...extra];

  const positions = positionOrder.map((p) => {
    const existing = byPos.get(p);
    return (
      existing ?? {
        position: p,
        health: computeTireHealth({ treadDepthMm: null }),
        warnings: warnings.positionWarnings[p] ?? [],
        tyre: { brand: null, model: null, dimension: null, dotYear: null }
      }
    );
  });

  // Determine need + quantity (v1: front pair when both fronts are below 4.0mm and verified)
  const lf = positions.find((p) => p.position === "LF")?.health.treadDepthMm ?? null;
  const rf = positions.find((p) => p.position === "RF")?.health.treadDepthMm ?? null;
  const frontsNeed = lf != null && rf != null && lf < 4.0 && rf < 4.0;
  const quantity = frontsNeed ? 2 : 4;
  const replacementRecommended =
    positions.some((p) => p.health.treadDepthMm != null && p.health.treadDepthMm < 4.0) &&
    positions.some((p) => p.health.verified === true);

  const liveOptions = replacementRecommended
    ? await computeLiveOptions({
        organizationId: link.organization_id,
        quantity
      })
    : null;

  const lastOrderRes = await query<{
    id: string;
    status: string;
    ordered_at: string;
    order_snapshot: any;
  }>(
    `select id, status, ordered_at, order_snapshot
     from tire_orders
     where organization_id = $1 and vehicle_id = $2
     order by ordered_at desc
     limit 1`,
    [link.organization_id, vehicle.id]
  );
  const lastOrder = lastOrderRes.rows[0] ?? null;

  const nextBookingRes = await query<{
    id: string;
    start_at: string;
    end_at: string;
    status: string;
  }>(
    `select id, start_at, end_at, status
     from bookings
     where organization_id = $1 and vehicle_id = $2 and status = 'BOOKED' and start_at >= now()
     order by start_at asc
     limit 1`,
    [link.organization_id, vehicle.id]
  );
  const nextBooking = nextBookingRes.rows[0] ?? null;

  const storedRes = await query<{
    wheel_set_id: string;
    season: string;
    status: string;
    storage_status: string;
    storage_code: string | null;
  }>(
    `select ws.id as wheel_set_id, ws.season, ws.status, ws.storage_status,
            sp.code as storage_code
     from wheel_sets ws
     left join storage_stays ss on ss.wheel_set_id = ws.id and ss.organization_id = ws.organization_id and ss.ended_at is null
     left join storage_positions sp on sp.id = ss.position_id and sp.organization_id = ws.organization_id
     where ws.organization_id = $1 and ws.vehicle_id = $2 and ws.storage_status = 'STORED'
     order by ws.updated_at desc
     limit 5`,
    [link.organization_id, vehicle.id]
  );

  const prefs = await getOrCreateCommPrefs({
    organizationId: link.organization_id,
    customerId: link.customer_id
  });

  const commercialState: CommercialState = lastOrder
    ? (lastOrder.status as CommercialState)
    : replacementRecommended
      ? liveOptions?.options?.length
        ? "LIVE_OPTIONS_AVAILABLE"
        : "REPLACEMENT_RECOMMENDED"
      : "NO_NEED";

  return {
    organizationId: link.organization_id,
    customerId: link.customer_id,
    customerName,
    vehicle: {
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model
    },
    positions,
    liveOptions,
    commercialState,
    lastOrder,
    nextBooking,
    storedWheelSets: storedRes.rows,
    prefs
  };
}

async function getOrCreateCommPrefs(input: { organizationId: string; customerId: string }) {
  const res = await query<{
    level: string;
    remind_worn_tires: boolean;
    remind_prices: boolean;
    remind_season: boolean;
    remind_bookings: boolean;
    remind_storage: boolean;
  }>(
    `insert into customer_communication_preferences (
       organization_id, customer_id
     )
     values ($1,$2)
     on conflict (organization_id, customer_id) do update set updated_at = now()
     returning level, remind_worn_tires, remind_prices, remind_season, remind_bookings, remind_storage`,
    [input.organizationId, input.customerId]
  );
  return res.rows[0]!;
}

export async function updateCommPrefsFromHub(input: {
  token: string;
  level: "fewer" | "normal" | "updated";
  remindWornTires: boolean;
  remindPrices: boolean;
  remindSeason: boolean;
  remindBookings: boolean;
  remindStorage: boolean;
}) {
  const tokenHash = sha256(input.token);
  const linkRes = await query<{ organization_id: string; customer_id: string }>(
    `select organization_id, customer_id
     from customer_hub_links
     where token_hash = $1 and revoked_at is null
     limit 1`,
    [tokenHash]
  );
  const link = linkRes.rows[0];
  if (!link) throw new Error("Ogiltig länk.");

  await query(
    `update customer_communication_preferences
     set level = $1,
         remind_worn_tires = $2,
         remind_prices = $3,
         remind_season = $4,
         remind_bookings = $5,
         remind_storage = $6,
         updated_at = now()
     where organization_id = $7 and customer_id = $8`,
    [
      input.level,
      input.remindWornTires,
      input.remindPrices,
      input.remindSeason,
      input.remindBookings,
      input.remindStorage,
      link.organization_id,
      link.customer_id
    ]
  );

  return { ok: true as const };
}

export async function createBookingFromHub(input: {
  token: string;
  startAtIso: string;
  endAtIso: string;
}) {
  const tokenHash = sha256(input.token);
  const linkRes = await query<{ organization_id: string; customer_id: string }>(
    `select organization_id, customer_id
     from customer_hub_links
     where token_hash = $1 and revoked_at is null
     limit 1`,
    [tokenHash]
  );
  const link = linkRes.rows[0];
  if (!link) throw new Error("Ogiltig länk.");

  return withTransaction(async (client) => {
    const vehicle = await client.query<{ id: string }>(
      `select id
       from vehicles
       where organization_id = $1 and customer_id = $2
       order by created_at desc
       limit 1`,
      [link.organization_id, link.customer_id]
    );
    const vehicleId = vehicle.rows[0]?.id ?? null;
    if (!vehicleId) throw new Error("Kunde inte skapa bokning.");

    const order = await client.query<{ id: string | null; tire_case_id: string | null }>(
      `select id, tire_case_id
       from tire_orders
       where organization_id = $1 and vehicle_id = $2
       order by ordered_at desc
       limit 1`,
      [link.organization_id, vehicleId]
    );
    const tireOrderId = order.rows[0]?.id ?? null;
    const tireCaseId = order.rows[0]?.tire_case_id ?? null;

    const res = await client.query<{ id: string }>(
      `insert into bookings (
         organization_id, customer_id, vehicle_id, tire_case_id, tire_order_id,
         start_at, end_at, status, requested_operations
       )
       values ($1,$2,$3,$4,$5,$6,$7,'BOOKED',$8)
       returning id`,
      [
        link.organization_id,
        link.customer_id,
        vehicleId,
        tireCaseId,
        tireOrderId,
        input.startAtIso,
        input.endAtIso,
        JSON.stringify(["TIRE_SWAP", "TIRE_INSTALLATION", "BALANCING"])
      ]
    );

    if (tireCaseId) {
      await client.query(
        `insert into tire_case_events (
           organization_id, tire_case_id, event_type, source, actor_user_id, data
         )
         values ($1,$2,'BOOKING_CREATED','CUSTOMER',null,$3)`,
        [
          link.organization_id,
          tireCaseId,
          JSON.stringify({ bookingId: res.rows[0]!.id, startAt: input.startAtIso })
        ]
      );
      await client.query(
        `update tire_cases
         set commercial_status = 'BOOKED', updated_at = now()
         where organization_id = $1 and id = $2`,
        [link.organization_id, tireCaseId]
      );
      await client.query(
        `update tire_orders
         set status = 'BOOKED'
         where organization_id = $1 and id = $2`,
        [link.organization_id, tireOrderId]
      );
    }

    return { ok: true as const, bookingId: res.rows[0]!.id };
  });
}

async function computeLiveOptions(input: {
  organizationId: string;
  quantity: number;
}) {
  // v1 demo: fixed dimension; later this comes from verified vehicle tyre spec
  const dim = { width: 235, aspectRatio: 55, rimDiameter: 19 };

  const search = await searchSupplierProducts({
    organizationId: input.organizationId,
    identity: dim,
    limitPerSupplier: 25
  });
  const products = search.ok ? search.value : [];
  if (!products.length) return null;

  // Pick three by brand priority (simple): Michelin -> Goodyear -> Hankook/Kumho...
  const priority = ["Michelin", "Goodyear", "Hankook", "Kumho"];
  const sorted = products.slice().sort((a, b) => {
    const ai = priority.indexOf(a.identity.brand);
    const bi = priority.indexOf(b.identity.brand);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
  const chosen = [sorted[0], sorted[1] ?? sorted[0], sorted[2] ?? sorted[0]];
  const slots: Array<"recommended" | "alternative" | "value"> = ["recommended", "alternative", "value"];

  const nowIso = new Date().toISOString();
  const rule: PricingRule = { type: "percent", percent: 25 };
  const installationPriceOrePerTyre = 40_000;
  const envFeeOrePerTyre = 4_000;

  const optionsOut: Array<{
    liveOptionId: string;
    slot: string;
    tireProductId: string;
    supplierProductId: string | null;
    brand: string;
    model: string;
    dimension: string;
    livePrice: any;
  }> = [];

  for (let i = 0; i < slots.length; i++) {
    const p = chosen[i]!;
    const offer = p.offers[0] ?? null;
    if (!offer) continue;
    const expiresAt = Date.parse(offer.expiresAtIso);
    if (Number.isFinite(expiresAt) && Date.now() > expiresAt) continue;

    const pricing = computeInstalledPrice({
      supplierPriceOre: offer.supplierPriceOre,
      quantity: input.quantity,
      markupRule: rule,
      installationPriceOrePerTyre,
      environmentalFeeOrePerTyre: envFeeOrePerTyre,
      supplier: offer.supplierId,
      supplierPriceTimestampIso: offer.retrievedAtIso,
      generatedAtIso: nowIso
    });

    optionsOut.push({
      liveOptionId: `${slots[i]}:${p.tireProductId}`,
      slot: slots[i],
      tireProductId: p.tireProductId,
      supplierProductId: offer.supplierSku ?? null,
      brand: p.identity.brand,
      model: p.identity.model,
      dimension: `${p.identity.width}/${p.identity.aspectRatio} R${p.identity.rimDiameter}`,
      livePrice: pricing
    });
  }

  return { options: optionsOut };
}

export async function placeTireOrderFromHub(input: {
  token: string;
  tireProductId: string;
  quantity: number;
  enteredRegistrationNumber: string;
}) {
  const tokenHash = sha256(input.token);

  return withTransaction(async (client) => {
    const link = await client.query<{ organization_id: string; customer_id: string }>(
      `select organization_id, customer_id
       from customer_hub_links
       where token_hash = $1 and revoked_at is null
       limit 1`,
      [tokenHash]
    );
    const l = link.rows[0];
    if (!l) throw new Error("Ogiltig länk.");

    // Rate limit reg verification attempts per token hash
    const attempts = await client.query<{
      attempt_count: number;
      window_started_at: string;
      locked_until: string | null;
    }>(
      `select attempt_count, window_started_at, locked_until
       from customer_hub_verification_attempts
       where token_hash = $1
       limit 1`,
      [tokenHash]
    );
    const a = attempts.rows[0] ?? null;
    const now = Date.now();
    const lockedUntil = a?.locked_until ? Date.parse(a.locked_until) : null;
    if (lockedUntil && now < lockedUntil) {
      throw new Error("För många försök. Försök igen senare.");
    }

    const windowStarted = a?.window_started_at ? Date.parse(a.window_started_at) : now;
    const inWindow = now - windowStarted < 15 * 60 * 1000;
    const count = a?.attempt_count ?? 0;

    // Resolve expected vehicle registration number (do not reveal it)
    const vehicle = await client.query<{ registration_number: string; id: string; wheel_set_id: string | null }>(
      `select v.registration_number, v.id,
              (select ws.id from wheel_sets ws where ws.organization_id = v.organization_id and ws.vehicle_id = v.id and ws.status = 'MOUNTED' order by ws.updated_at desc limit 1) as wheel_set_id
       from vehicles v
       where v.organization_id = $1 and v.customer_id = $2
       order by v.created_at desc
       limit 1`,
      [l.organization_id, l.customer_id]
    );
    const v = vehicle.rows[0];
    if (!v) throw new Error("Kunde inte verifiera fordonet.");

    const expected = normalizeReg(v.registration_number);
    const entered = normalizeReg(input.enteredRegistrationNumber);
    if (entered !== expected) {
      const nextCount = inWindow ? count + 1 : 1;
      const lock = nextCount >= 5 ? new Date(now + 15 * 60 * 1000).toISOString() : null;
      await client.query(
        `insert into customer_hub_verification_attempts (token_hash, attempt_count, window_started_at, locked_until, last_attempt_at)
         values ($1,$2,$3,$4,now())
         on conflict (token_hash) do update
           set attempt_count = excluded.attempt_count,
               window_started_at = excluded.window_started_at,
               locked_until = excluded.locked_until,
               last_attempt_at = now()`,
        [tokenHash, nextCount, new Date(inWindow ? windowStarted : now).toISOString(), lock]
      );
      throw new Error("Uppgifterna matchar inte fordonet för denna beställning. Kontrollera registreringsnumret och försök igen.");
    }

    // Revalidate product + latest supplier price snapshot and compute final installed price
    const prod = await client.query<{
      id: string;
      supplier: string | null;
      supplier_product_id: string | null;
      brand: string;
      model: string;
      width: number;
      profile: number;
      rim_diameter: number;
    }>(
      `select id, supplier, supplier_product_id, brand, model, width, profile, rim_diameter
       from tire_products
       where organization_id = $1 and id = $2 and active = true
       limit 1`,
      [l.organization_id, input.tireProductId]
    );
    const p = prod.rows[0];
    if (!p) throw new Error("Produkten är inte tillgänglig.");

    const supplierId = (p.supplier ?? "delticom") as SupplierId;
    const offerRes = await getCachedOfferForProduct({
      organizationId: l.organization_id,
      supplierId,
      tireProductId: p.id
    });
    if (!offerRes.ok || !offerRes.value) throw new Error("Priset måste uppdateras innan du kan beställa.");

    // Freshness rule (v1): require unexpired cache entry (adapter sets expiresAt)
    const expiresAt = Date.parse(offerRes.value.expiresAtIso);
    if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
      throw new Error("Priset måste uppdateras innan du kan beställa.");
    }

    const rule: PricingRule = { type: "percent", percent: 25 };
    const installationPriceOrePerTyre = 40_000;
    const envFeeOrePerTyre = 4_000;
    const nowIso = new Date().toISOString();
    const finalPrice = computeInstalledPrice({
      supplierPriceOre: offerRes.value.supplierPriceOre,
      quantity: input.quantity,
      markupRule: rule,
      installationPriceOrePerTyre,
      environmentalFeeOrePerTyre: envFeeOrePerTyre,
      supplier: supplierId,
      supplierPriceTimestampIso: offerRes.value.retrievedAtIso,
      generatedAtIso: nowIso
    });

    const caseRes = await client.query<{ id: string }>(
      `select id
       from tire_cases
       where organization_id = $1 and vehicle_id = $2 and case_status in ('OPEN','IN_PROGRESS')
       order by updated_at desc
       limit 1`,
      [l.organization_id, v.id]
    );
    const tireCaseId = caseRes.rows[0]?.id ?? null;

    const orderSnapshot = {
      product: {
        tireProductId: p.id,
        supplier: supplierId,
        supplierProductId: offerRes.value.supplierSku ?? p.supplier_product_id,
        brand: p.brand,
        model: p.model,
        dimension: `${p.width}/${p.profile} R${p.rim_diameter}`
      },
      quantity: input.quantity,
      livePriceSnapshot: finalPrice,
      registrationVerificationPassed: true,
      orderedAt: nowIso,
      source: "CUSTOMER_TIRE_HUB"
    };

    const orderRes = await client.query<{ id: string }>(
      `insert into tire_orders (
         organization_id, customer_id, vehicle_id, wheel_set_id, tire_case_id,
         tire_product_id, supplier, supplier_product_id, quantity,
         registration_verification_passed, source, status, order_snapshot
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,'CUSTOMER_TIRE_HUB','ORDER_CONFIRMED',$10)
       returning id`,
      [
        l.organization_id,
        l.customer_id,
        v.id,
        v.wheel_set_id,
        tireCaseId,
        p.id,
        p.supplier,
        p.supplier_product_id,
        input.quantity,
        JSON.stringify(orderSnapshot)
      ]
    );

    if (tireCaseId) {
      await client.query(
        `insert into tire_case_events (
           organization_id, tire_case_id, event_type, source, actor_user_id,
           previous_value, new_value, data
         )
         values ($1,$2,'TIRE_ORDER_PLACED','CUSTOMER',null,$3,$4,$5)`,
        [
          l.organization_id,
          tireCaseId,
          JSON.stringify({ commercial_status: "LIVE_OPTIONS_AVAILABLE" }),
          JSON.stringify({ commercial_status: "ORDER_CONFIRMED" }),
          JSON.stringify({
            orderId: orderRes.rows[0]!.id,
            tireProductId: p.id,
            quantity: input.quantity,
            orderSnapshot
          })
        ]
      );
      await client.query(
        `update tire_cases
         set commercial_status = 'ORDER_CONFIRMED', updated_at = now()
         where organization_id = $1 and id = $2`,
        [l.organization_id, tireCaseId]
      );
    }

    // Reset attempts on success
    await client.query(
      `insert into customer_hub_verification_attempts (token_hash, attempt_count, window_started_at, locked_until, last_attempt_at)
       values ($1,0,now(),null,now())
       on conflict (token_hash) do update
         set attempt_count = 0, window_started_at = now(), locked_until = null, last_attempt_at = now()`,
      [tokenHash]
    );

    return { ok: true as const, orderId: orderRes.rows[0]!.id };
  });
}

