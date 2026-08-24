import { computeInstalledPrice, type PricingRule } from "@/lib/domain/pricing";
import { computeTireHealth } from "@/lib/domain/tireHealth";

import { query, withTransaction } from "./db";
import { generateOpaqueToken, sha256 } from "./tokens";

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

export type HubWheelPosition = "LF" | "RF" | "LR" | "RR";

export type HubPositionView = {
  position: HubWheelPosition;
  health: ReturnType<typeof computeTireHealth>;
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
    return {
      organizationId: link.organization_id,
      customerId: link.customer_id,
      customerName,
      vehicle: null,
      positions: [] as HubPositionView[],
      liveOptions: null,
      commercialState: "REPLACEMENT_MONITORING" as CommercialState,
      lastOrder: null
    };
  }

  // Current mounted wheel set (v1 heuristic)
  const wsRes = await query<{ id: string }>(
    `select id
     from wheel_sets
     where organization_id = $1 and vehicle_id = $2 and status = 'MOUNTED'
     order by updated_at desc
     limit 1`,
    [link.organization_id, vehicle.id]
  );
  const wheelSetId = wsRes.rows[0]?.id ?? null;

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
          dot_year: number | null;
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
                  tip.dot_year
           from tire_inspection_positions tip
           join latest on latest.id = tip.inspection_id
           where tip.organization_id = $1
           order by tip.position asc`,
          [link.organization_id, wheelSetId]
        )
      : { rows: [] as any[] };

  const byPos = new Map<HubWheelPosition, HubPositionView>();
  for (const r of posRows.rows) {
    byPos.set(r.position, {
      position: r.position,
      health: computeTireHealth({
        treadDepthMm: r.verified === true ? r.tread_depth_mm : null,
        treadDepthSource: r.tread_depth_source,
        confidence: r.confidence,
        verified: r.verified
      }),
      tyre: {
        brand: r.verified === true ? r.tyre_brand : null,
        model: r.verified === true ? r.tyre_model : null,
        dimension: r.verified === true ? r.tyre_dimension : null,
        dotYear: r.dot_year
      }
    });
  }

  const allPositions: HubWheelPosition[] = ["LF", "RF", "LR", "RR"];
  const positions = allPositions.map((p) => {
    const existing = byPos.get(p);
    return (
      existing ?? {
        position: p,
        health: computeTireHealth({ treadDepthMm: null }),
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
    lastOrder
  };
}

async function computeLiveOptions(input: {
  organizationId: string;
  quantity: number;
}) {
  const products = await query<{
    id: string;
    brand: string;
    model: string;
    season: string;
    width: number;
    profile: number;
    rim_diameter: number;
    supplier: string | null;
    supplier_product_id: string | null;
  }>(
    `select id, brand, model, season, width, profile, rim_diameter, supplier, supplier_product_id
     from tire_products
     where organization_id = $1 and active = true and width = 235 and profile = 55 and rim_diameter = 19
     order by brand asc
     limit 10`,
    [input.organizationId]
  );
  if (!products.rows.length) return null;

  // Pick three by brand priority (simple): Michelin -> Goodyear -> Hankook/Kumho...
  const priority = ["Michelin", "Goodyear", "Hankook", "Kumho"];
  const sorted = products.rows.slice().sort((a, b) => {
    const ai = priority.indexOf(a.brand);
    const bi = priority.indexOf(b.brand);
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
    const snapRes = await query<{
      supplier: string | null;
      supplier_price_ore: number;
      supplier_price_timestamp: string;
      generated_at: string;
    }>(
      `select supplier, supplier_price_ore, supplier_price_timestamp, generated_at
       from tire_price_snapshots
       where organization_id = $1 and tire_product_id = $2
       order by generated_at desc
       limit 1`,
      [input.organizationId, p.id]
    );
    const snap = snapRes.rows[0];
    if (!snap) continue;

    const pricing = computeInstalledPrice({
      supplierPriceOre: snap.supplier_price_ore,
      quantity: input.quantity,
      markupRule: rule,
      installationPriceOrePerTyre,
      environmentalFeeOrePerTyre: envFeeOrePerTyre,
      supplier: snap.supplier,
      supplierPriceTimestampIso: snap.supplier_price_timestamp,
      generatedAtIso: nowIso
    });

    optionsOut.push({
      liveOptionId: `${slots[i]}:${p.id}`,
      slot: slots[i],
      tireProductId: p.id,
      supplierProductId: p.supplier_product_id ?? null,
      brand: p.brand,
      model: p.model,
      dimension: `${p.width}/${p.profile} R${p.rim_diameter}`,
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

    const snapRes = await client.query<{
      supplier: string | null;
      supplier_price_ore: number;
      supplier_price_timestamp: string;
      generated_at: string;
    }>(
      `select supplier, supplier_price_ore, supplier_price_timestamp, generated_at
       from tire_price_snapshots
       where organization_id = $1 and tire_product_id = $2
       order by generated_at desc
       limit 1`,
      [l.organization_id, p.id]
    );
    const snap = snapRes.rows[0];
    if (!snap) throw new Error("Priset måste uppdateras innan du kan beställa.");

    // Freshness rule (v1): 24h
    const ts = Date.parse(snap.supplier_price_timestamp);
    if (!Number.isFinite(ts) || Date.now() - ts > 24 * 60 * 60 * 1000) {
      throw new Error("Priset måste uppdateras innan du kan beställa.");
    }

    const rule: PricingRule = { type: "percent", percent: 25 };
    const installationPriceOrePerTyre = 40_000;
    const envFeeOrePerTyre = 4_000;
    const nowIso = new Date().toISOString();
    const finalPrice = computeInstalledPrice({
      supplierPriceOre: snap.supplier_price_ore,
      quantity: input.quantity,
      markupRule: rule,
      installationPriceOrePerTyre,
      environmentalFeeOrePerTyre: envFeeOrePerTyre,
      supplier: snap.supplier,
      supplierPriceTimestampIso: snap.supplier_price_timestamp,
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
        supplier: p.supplier,
        supplierProductId: p.supplier_product_id,
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

