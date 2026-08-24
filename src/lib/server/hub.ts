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
      offer: null
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

  // Offer options (v1): from tire_products + latest snapshots. For now: only dimension 235/55R19.
  const offer = await getOrCreateOfferForVehicle({
    organizationId: link.organization_id,
    customerId: link.customer_id,
    vehicleId: vehicle.id,
    wheelSetId
  });

  return {
    organizationId: link.organization_id,
    customerId: link.customer_id,
    customerName,
    vehicle: {
      id: vehicle.id,
      registrationNumber: vehicle.registration_number,
      make: vehicle.make,
      model: vehicle.model
    },
    positions,
    offer
  };
}

async function getOrCreateOfferForVehicle(input: {
  organizationId: string;
  customerId: string;
  vehicleId: string;
  wheelSetId: string | null;
}) {
  // v1: generate a fresh offer each time; snapshot prices at generation time.
  const products = await query<{
    id: string;
    brand: string;
    model: string;
    season: string;
    width: number;
    profile: number;
    rim_diameter: number;
  }>(
    `select id, brand, model, season, width, profile, rim_diameter
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

  const caseRes = await query<{ id: string }>(
    `select id
     from tire_cases
     where organization_id = $1 and vehicle_id = $2 and case_status in ('OPEN','IN_PROGRESS')
     order by updated_at desc
     limit 1`,
    [input.organizationId, input.vehicleId]
  );
  const tireCaseId = caseRes.rows[0]?.id ?? null;

  const offerRes = await query<{ id: string }>(
    `insert into tire_offers (organization_id, customer_id, vehicle_id, wheel_set_id, tire_case_id, status)
     values ($1,$2,$3,$4,$5,'ready')
     returning id`,
    [input.organizationId, input.customerId, input.vehicleId, input.wheelSetId, tireCaseId]
  );
  const offerId = offerRes.rows[0]!.id;

  const nowIso = new Date().toISOString();
  const rule: PricingRule = { type: "percent", percent: 25 };
  const installationPriceOrePerTyre = 40_000;
  const envFeeOrePerTyre = 4_000;

  const optionsOut: Array<{
    optionId: string;
    slot: string;
    brand: string;
    model: string;
    dimension: string;
    pricing: any;
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
      quantity: 4,
      markupRule: rule,
      installationPriceOrePerTyre,
      environmentalFeeOrePerTyre: envFeeOrePerTyre,
      supplier: snap.supplier,
      supplierPriceTimestampIso: snap.supplier_price_timestamp,
      generatedAtIso: nowIso
    });

    const optRes = await query<{ id: string }>(
      `insert into tire_offer_options (organization_id, offer_id, slot, tire_product_id, quantity, pricing_snapshot)
       values ($1,$2,$3,$4,4,$5)
       returning id`,
      [input.organizationId, offerId, slots[i], p.id, JSON.stringify(pricing)]
    );

    optionsOut.push({
      optionId: optRes.rows[0]!.id,
      slot: slots[i],
      brand: p.brand,
      model: p.model,
      dimension: `${p.width}/${p.profile} R${p.rim_diameter}`,
      pricing
    });
  }

  return { offerId, options: optionsOut };
}

export async function acceptOfferOptionFromHub(input: {
  token: string;
  offerId: string;
  optionId: string;
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

    const option = await client.query<{
      id: string;
      offer_id: string;
      pricing_snapshot: any;
      tire_product_id: string;
    }>(
      `select id, offer_id, pricing_snapshot, tire_product_id
       from tire_offer_options
       where organization_id = $1 and id = $2 and offer_id = $3
       limit 1`,
      [l.organization_id, input.optionId, input.offerId]
    );
    const opt = option.rows[0];
    if (!opt) throw new Error("Alternativ saknas.");

    const offer = await client.query<{
      id: string;
      customer_id: string | null;
      vehicle_id: string | null;
      tire_case_id: string | null;
      status: string;
    }>(
      `select id, customer_id, vehicle_id, tire_case_id, status
       from tire_offers
       where organization_id = $1 and id = $2
       limit 1`,
      [l.organization_id, input.offerId]
    );
    const off = offer.rows[0];
    if (!off) throw new Error("Offert saknas.");
    if (off.customer_id && off.customer_id !== l.customer_id) throw new Error("Ogiltig kund.");

    // Revalidate price freshness (v1): require supplier timestamp within 24h
    const snap = opt.pricing_snapshot as any;
    const ts = snap?.supplierPriceTimestamp ? Date.parse(snap.supplierPriceTimestamp) : NaN;
    if (!Number.isFinite(ts) || Date.now() - ts > 24 * 60 * 60 * 1000) {
      throw new Error("Priset måste uppdateras innan du kan godkänna.");
    }

    // Snapshot acceptance (do not mutate snapshot afterwards)
    await client.query(
      `insert into tire_offer_acceptances (
         organization_id, offer_id, option_id, customer_id, vehicle_id, tire_case_id, acceptance_method, pricing_snapshot
       )
       values ($1,$2,$3,$4,$5,$6,'hub',$7)`,
      [
        l.organization_id,
        off.id,
        opt.id,
        l.customer_id,
        off.vehicle_id,
        off.tire_case_id,
        JSON.stringify(snap)
      ]
    );

    await client.query(
      `update tire_offers set status = 'accepted' where organization_id = $1 and id = $2`,
      [l.organization_id, off.id]
    );

    // Emit canonical events back into the operational motor (where linked to a case)
    if (off.tire_case_id) {
      await client.query(
        `insert into tire_case_events (
           organization_id, tire_case_id, event_type,
           source, actor_user_id, previous_value, new_value, data
         )
         values ($1,$2,'QUOTE_ACCEPTED','CUSTOMER',null,$3,$4,$5)`,
        [
          l.organization_id,
          off.tire_case_id,
          JSON.stringify({ commercial_status: "QUOTE_SENT" }),
          JSON.stringify({ commercial_status: "QUOTE_ACCEPTED" }),
          JSON.stringify({
            offerId: off.id,
            optionId: opt.id,
            tireProductId: opt.tire_product_id,
            pricingSnapshot: snap
          })
        ]
      );

      await client.query(
        `update tire_cases
         set commercial_status = 'QUOTE_ACCEPTED', updated_at = now()
         where organization_id = $1 and id = $2`,
        [l.organization_id, off.tire_case_id]
      );
    }

    return { ok: true as const };
  });
}

