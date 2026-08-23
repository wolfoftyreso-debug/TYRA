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
      status: string;
      storageStatus: string;
    }) {
      const res = await client.query<{ id: string }>(
        `insert into wheel_sets (organization_id, customer_id, vehicle_id, season, wheel_count, status, storage_status)
         values ($1, $2, $3, $4, 4, $5, $6)
         returning id`,
        [
          organizationId,
          input.customerId,
          input.vehicleId,
          input.season,
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
  });
}

