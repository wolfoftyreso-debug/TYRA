import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL saknas. Lägg den i miljön innan seed.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
});

const orgId = "00000000-0000-4000-8000-000000000001";
const customerIds = {
  anna: "10000000-0000-4000-8000-000000000001",
  erik: "10000000-0000-4000-8000-000000000002",
  maria: "10000000-0000-4000-8000-000000000003",
  lisa: "10000000-0000-4000-8000-000000000004",
};

await pool.query(
  `INSERT INTO organizations (id, name) VALUES ($1, 'Werkstad Tyresö')
   ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
  [orgId],
);

for (const [key, name, phone, email] of [
  ["anna", "Anna Andersson", "070-123 45 67", "anna@example.se"],
  ["erik", "Erik Eriksson", "070-234 56 78", "erik@example.se"],
  ["maria", "Maria Lind", "070-345 67 89", "maria@example.se"],
  ["lisa", "Lisa Berg", "070-456 78 90", "lisa@example.se"],
]) {
  await pool.query(
    `INSERT INTO customers (id, organization_id, name, phone, email)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, email = EXCLUDED.email`,
    [customerIds[key], orgId, name, phone, email],
  );
}

const vehicles = [
  ["20000000-0000-4000-8000-000000000001", customerIds.anna, "ABC123", "Volvo", "XC60", 2022],
  ["20000000-0000-4000-8000-000000000002", customerIds.erik, "DEF456", "BMW", "X5", 2021],
  ["20000000-0000-4000-8000-000000000003", customerIds.maria, "KLM789", "Volkswagen", "Passat", 2019],
  ["20000000-0000-4000-8000-000000000004", customerIds.lisa, "MNO321", "Audi", "A4", 2020],
];

for (const vehicle of vehicles) {
  await pool.query(
    `INSERT INTO vehicles (id, organization_id, customer_id, registration, make, model, model_year)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (organization_id, registration)
     DO UPDATE SET customer_id = EXCLUDED.customer_id, make = EXCLUDED.make,
       model = EXCLUDED.model, model_year = EXCLUDED.model_year`,
    [vehicle[0], orgId, ...vehicle.slice(1)],
  );
}

for (const code of ["A-04-B-12", "A-03-A-08", "A-04-B-13", "A-04-B-14"]) {
  await pool.query(
    `INSERT INTO storage_locations (organization_id, code, zone)
     VALUES ($1, $2, 'A') ON CONFLICT (organization_id, code) DO NOTHING`,
    [orgId, code],
  );
}

await pool.query(
  `INSERT INTO climate_readings (organization_id, zone, temperature_c, humidity_percent)
   SELECT $1, 'A', 17.4, 42
   WHERE NOT EXISTS (
     SELECT 1 FROM climate_readings WHERE organization_id = $1 AND zone = 'A'
   )`,
  [orgId],
);

for (const product of [
  ["MIC-PS5-2355519", "Michelin", "Pilot Sport 5", "premium", 249500, 170000, 12],
  ["GOO-F1A6-2355519", "Goodyear", "Eagle F1 Asymmetric 6", "premium", 229500, 158000, 8],
  ["HAN-VS1-2355519", "Hankook", "Ventus S1 evo3", "value", 189500, 128000, 16],
]) {
  await pool.query(
    `INSERT INTO tyre_products (
      organization_id, sku, brand, model, width, profile, rim_inches,
      load_index, speed_rating, season, segment, unit_price_ore,
      cost_price_ore, stock, xl, ev_approved
    ) VALUES ($1, $2, $3, $4, 235, 55, 19, 105, 'W', 'summer', $5, $6, $7, $8, true, true)
    ON CONFLICT (organization_id, sku) DO UPDATE SET
      unit_price_ore = EXCLUDED.unit_price_ore,
      cost_price_ore = EXCLUDED.cost_price_ore,
      stock = EXCLUDED.stock`,
    [orgId, ...product],
  );
}

for (const [sku, name, price] of [
  ["MOUNT", "Montering och balansering", 40000],
  ["RECYCLE", "Miljöavgift", 4000],
]) {
  await pool.query(
    `INSERT INTO service_products (organization_id, sku, name, unit_price_ore)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (organization_id, sku)
     DO UPDATE SET name = EXCLUDED.name, unit_price_ore = EXCLUDED.unit_price_ore`,
    [orgId, sku, name, price],
  );
}

console.log("Seed klar: Werkstad Tyresö");
await pool.end();
