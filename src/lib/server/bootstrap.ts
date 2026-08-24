import crypto from "node:crypto";

import { withTransaction } from "./db";

function nowIso() {
  return new Date().toISOString();
}

async function hasMembership(client: import("pg").PoolClient, userId: string) {
  const res = await client.query<{ c: string }>(
    "select count(*)::text as c from memberships where user_id = $1",
    [userId]
  );
  return Number(res.rows[0]?.c ?? "0") > 0;
}

export async function ensureBootstrap(input: { userId: string }) {
  await withTransaction(async (client) => {
    const already = await hasMembership(client, input.userId);
    if (already) return;

    const orgRes = await client.query<{ id: string }>(
      `insert into organizations (name)
       values ($1)
       returning id`,
      ["Werkstad Tyresö"]
    );
    const organizationId = orgRes.rows[0]!.id;

    await client.query(
      `insert into memberships (user_id, organization_id, role)
       values ($1, $2, $3)`,
      [input.userId, organizationId, "owner"]
    );

    // Seed: customers + vehicles + wheel sets + minimal storage + climate.
    const siteRes = await client.query<{ id: string }>(
      `insert into sites (organization_id, name)
       values ($1, $2)
       returning id`,
      [organizationId, "Huvudlager"]
    );
    const siteId = siteRes.rows[0]!.id;

    const zoneRes = await client.query<{ id: string }>(
      `insert into storage_zones (organization_id, site_id, name)
       values ($1, $2, $3)
       returning id`,
      [organizationId, siteId, "A"]
    );
    const zoneId = zoneRes.rows[0]!.id;

    const posRes = await client.query<{ id: string }>(
      `insert into storage_positions (organization_id, zone_id, code)
       values ($1, $2, $3)
       returning id`,
      [organizationId, zoneId, "A-04-B-12"]
    );
    const positionA04B12 = posRes.rows[0]!.id;

    const sensorRes = await client.query<{ id: string }>(
      `insert into sensors (organization_id, site_id, zone_id, type, external_id, last_seen_at)
       values ($1, $2, $3, $4, $5, $6)
       returning id`,
      [organizationId, siteId, zoneId, "climate", "seed-climate-a", nowIso()]
    );
    const sensorId = sensorRes.rows[0]!.id;

    await client.query(
      `insert into sensor_measurements (organization_id, sensor_id, measured_at, temperature_c, humidity_percent)
       values ($1, $2, $3, $4, $5)`,
      [organizationId, sensorId, nowIso(), 17.4, 42.0]
    );

    async function mkCustomer(name: string, phone: string | null) {
      const res = await client.query<{ id: string }>(
        `insert into customers (organization_id, kind, name, phone)
         values ($1, $2, $3, $4)
         returning id`,
        [organizationId, "private", name, phone]
      );
      return res.rows[0]!.id;
    }

    async function mkVehicle(input: {
      customerId: string;
      regNo: string;
      make: string;
      model: string;
      modelYear: number;
    }) {
      const res = await client.query<{ id: string }>(
        `insert into vehicles (organization_id, customer_id, registration_number, make, model, model_year)
         values ($1, $2, $3, $4, $5, $6)
         returning id`,
        [
          organizationId,
          input.customerId,
          input.regNo.toUpperCase(),
          input.make,
          input.model,
          input.modelYear
        ]
      );
      return res.rows[0]!.id;
    }

    async function mkWheelSet(input: {
      customerId: string;
      vehicleId: string;
      season: "winter" | "summer";
      wheelCount?: number;
      status: string;
      storageStatus: string;
    }) {
      const res = await client.query<{ id: string }>(
        `insert into wheel_sets (organization_id, customer_id, vehicle_id, season, wheel_count, status, storage_status)
         values ($1, $2, $3, $4, $5, $6, $7)
         returning id`,
        [
          organizationId,
          input.customerId,
          input.vehicleId,
          input.season,
          input.wheelCount ?? 4,
          input.status,
          input.storageStatus
        ]
      );
      return res.rows[0]!.id;
    }

    async function mkWheelSetLabel(wheelSetId: string) {
      const token = crypto.randomBytes(8).toString("hex").toUpperCase();
      await client.query(
        `insert into wheel_set_labels (organization_id, wheel_set_id, public_code)
         values ($1, $2, $3)`,
        [organizationId, wheelSetId, `WS-${token}`]
      );
    }

    const anna = await mkCustomer("Anna Andersson", null);
    const erik = await mkCustomer("Erik Svensson", null);
    const maria = await mkCustomer("Maria Karlsson", null);
    const lisa = await mkCustomer("Lisa Nilsson", null);

    const xc60 = await mkVehicle({
      customerId: anna,
      regNo: "ABC123",
      make: "Volvo",
      model: "XC60",
      modelYear: 2022
    });

    const x5 = await mkVehicle({
      customerId: erik,
      regNo: "DEF456",
      make: "BMW",
      model: "X5",
      modelYear: 2021
    });

    await mkVehicle({
      customerId: maria,
      regNo: "KLM789",
      make: "Volkswagen",
      model: "Passat",
      modelYear: 2019
    });

    await mkVehicle({
      customerId: lisa,
      regNo: "MNO321",
      make: "Audi",
      model: "A4",
      modelYear: 2020
    });

    const annaWinter = await mkWheelSet({
      customerId: anna,
      vehicleId: xc60,
      season: "winter",
      status: "PICKED",
      storageStatus: "IN_WORKSHOP"
    });
    await mkWheelSetLabel(annaWinter);

    const annaSummer = await mkWheelSet({
      customerId: anna,
      vehicleId: xc60,
      season: "summer",
      status: "MOUNTED",
      storageStatus: "ON_VEHICLE"
    });
    await mkWheelSetLabel(annaSummer);

    // Seed wheels + latest measured tread depths for Anna's mounted summer set (Customer Tire Hub demo)
    const wheelPositions: Array<["LF" | "RF" | "LR" | "RR", number]> = [
      ["LF", 3.2],
      ["RF", 3.1],
      ["LR", 4.7],
      ["RR", 4.6]
    ];

    const inspRes = await client.query<{ id: string }>(
      `insert into tire_inspections (
         organization_id, customer_id, vehicle_id, wheel_set_id, captured_at, captured_by_user_id, source,
         inspection_status, verified_at, verified_by_user_id
       )
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       returning id`,
      [
        organizationId,
        anna,
        xc60,
        annaSummer,
        nowIso(),
        input.userId,
        "PHYSICAL_INSPECTION",
        "VERIFIED",
        nowIso(),
        input.userId
      ]
    );
    const inspectionId = inspRes.rows[0]!.id;

    for (const [pos, mm] of wheelPositions) {
      const wRes = await client.query<{ id: string }>(
        `insert into wheels (organization_id, wheel_set_id, position)
         values ($1,$2,$3)
         returning id`,
        [organizationId, annaSummer, pos]
      );
      const wheelId = wRes.rows[0]!.id;

      await client.query(
        `insert into tread_measurements (organization_id, wheel_id, measured_at, depth_mm, source, created_by_user_id)
         values ($1,$2,$3,$4,$5,$6)`,
        [organizationId, wheelId, nowIso(), mm, "MEASURED", input.userId]
      );

      await client.query(
        `insert into tire_inspection_positions (
           organization_id, inspection_id, position,
           tread_depth_mm, tread_depth_source, confidence,
           verified, verified_by_user_id, verified_at,
           condition_score, condition_state,
           tyre_brand, tyre_model, tyre_dimension, dot_year, dot_week,
           ai_tread_depth_mm, ai_tread_depth_source, ai_confidence, ai_model_version, ai_suggested_at
         )
         values ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [
          organizationId,
          inspectionId,
          pos,
          mm,
          "MEASURED",
          0.99,
          input.userId,
          nowIso(),
          Math.round(((mm - 1.6) / (8.0 - 1.6)) * 100),
          mm < 3 ? "red" : mm < 4 ? "yellow" : "green",
          "Michelin",
          "Primacy 4",
          "235/55 R19",
          2022,
          14,
          Math.max(1.6, mm - 0.2), // AI-suggested (demo)
          "AI_ESTIMATE",
          0.84,
          "tire-vision-demo-v0.1",
          nowIso()
        ]
      );
    }

    const erikWinter = await mkWheelSet({
      customerId: erik,
      vehicleId: x5,
      season: "winter",
      status: "PICK_REQUESTED",
      storageStatus: "STORED"
    });
    await mkWheelSetLabel(erikWinter);

    await client.query(
      `insert into storage_stays (organization_id, wheel_set_id, position_id, started_at, ended_at)
       values ($1, $2, $3, $4, null)`,
      [organizationId, erikWinter, positionA04B12, nowIso()]
    );

    await client.query(
      `insert into replacement_opportunities (organization_id, wheel_set_id, reason, status, created_at)
       values ($1, $2, $3, $4, $5)`,
      [
        organizationId,
        erikWinter,
        "replacement_recommended",
        "open",
        nowIso()
      ]
    );

    // Seed supplier accounts (TenantSupplierAccount)
    await client.query(
      `insert into tenant_supplier_accounts (
         organization_id, supplier_id, external_customer_id, credentials_reference,
         currency, enabled, priority, pricing_enabled, ordering_enabled
       )
       values
         ($1,'ntg',null,null,'SEK',true,10,true,false),
         ($1,'delticom',null,null,'SEK',true,20,true,false),
         ($1,'inter_sprint',null,null,'SEK',false,30,true,false),
         ($1,'deldo',null,null,'SEK',false,40,true,false)
       on conflict (organization_id, supplier_id) do update
         set enabled = excluded.enabled,
             priority = excluded.priority,
             pricing_enabled = excluded.pricing_enabled,
             ordering_enabled = excluded.ordering_enabled,
             updated_at = now()`,
      [organizationId]
    );

    // Seed tire products + supplier price snapshots (demo live prices)
    const products: Array<[string, string, number]> = [
      ["Michelin", "Primacy 5", 148_000],
      ["Goodyear", "EfficientGrip", 132_000],
      ["Hankook", "Ventus Prime", 112_000],
      ["Kumho", "Ecsta", 99_000]
    ];

    for (const [brand, model, supplierPriceOre] of products) {
      const pRes = await client.query<{ id: string }>(
        `insert into tire_products (
           organization_id, supplier, supplier_product_id,
           brand, model, width, profile, rim_diameter, season, active
         )
         values ($1,$2,$3,$4,$5,235,55,19,$6,true)
         returning id`,
        [organizationId, "delticom", `${brand}-${model}`.toLowerCase(), brand, model, "summer"]
      );
      const tireProductId = pRes.rows[0]!.id;
      await client.query(
        `insert into tire_price_snapshots (
           organization_id, tire_product_id, supplier, supplier_price_ore, supplier_price_timestamp, stock_status, estimated_delivery, generated_at
         )
         values ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          organizationId,
          tireProductId,
          "delticom",
          supplierPriceOre,
          nowIso(),
          "in_stock",
          "2-4 dagar",
          nowIso()
        ]
      );
    }

    // Seed canonical DMS mapping (demo)
    await client.query(
      `insert into dms_systems (organization_id, key, name, capabilities)
       values ($1, $2, $3, $4)
       on conflict (organization_id, key) do nothing`,
      [
        organizationId,
        "DEMO_DMS",
        "Demo DMS",
        JSON.stringify({
          supportsReadOrders: true,
          supportsWriteOrders: false,
          supportsAddOrderLine: false,
          supportsUpdateBooking: false,
          supportsCustomerLookup: true,
          supportsVehicleLookup: true,
          supportsPricing: false,
          supportsInvoiceStatus: false
        })
      ]
    );

    const demoMappings: Array<[string, string, string]> = [
      ["DH01", "Hjulskifte hotellkund", "TIRE_SWAP_FROM_STORAGE"],
      ["DH03", "Utlämning hjul", "STORAGE_OUT"],
      ["DH04", "Inlämning hjul", "STORAGE_IN"],
      ["DH06", "Hjultvätt", "WHEEL_WASH"],
      ["DH05", "Hjulbalansering", "WHEEL_BALANCE"]
    ];

    for (const [code, desc, op] of demoMappings) {
      await client.query(
        `insert into dms_code_mappings (organization_id, dms_system_key, dms_code, description, canonical_operation, mapping_version, active)
         values ($1, $2, $3, $4, $5, 1, true)
         on conflict (organization_id, dms_system_key, dms_code, mapping_version) do nothing`,
        [organizationId, "DEMO_DMS", code, desc, op]
      );
    }
  });
}

