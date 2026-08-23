import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/server/auth";
import { getPool } from "@/lib/server/db";

export async function provisionOrganizationForUser(userId: string) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const existing = await client.query(
      "SELECT organization_id FROM memberships WHERE user_id = $1 LIMIT 1",
      [userId],
    );
    if (existing.rowCount) {
      await client.query("COMMIT");
      return existing.rows[0].organization_id as string;
    }

    const org = await client.query(
      "INSERT INTO organizations (name) VALUES ('Werkstad Tyresö') RETURNING id",
    );
    const organizationId = org.rows[0].id as string;
    await client.query(
      "INSERT INTO memberships (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
      [organizationId, userId],
    );

    const customers = await client.query(
      `INSERT INTO customers (organization_id, name, email, phone)
       VALUES
         ($1, 'Anna Andersson', 'anna@example.se', '070-123 45 67'),
         ($1, 'Erik Eriksson', 'erik@example.se', '070-234 56 78'),
         ($1, 'Maria Lind', 'maria@example.se', '070-345 67 89'),
         ($1, 'Lisa Berg', 'lisa@example.se', '070-456 78 90')
       RETURNING id, name`,
      [organizationId],
    );
    const customerId = (name: string) =>
      customers.rows.find((row) => row.name === name)?.id as string;

    await client.query(
      `INSERT INTO vehicles (
        organization_id, customer_id, registration, make, model, model_year
      ) VALUES
        ($1, $2, 'ABC123', 'Volvo', 'XC60', 2022),
        ($1, $3, 'DEF456', 'BMW', 'X5', 2021),
        ($1, $4, 'KLM789', 'Volkswagen', 'Passat', 2019),
        ($1, $5, 'MNO321', 'Audi', 'A4', 2020)`,
      [
        organizationId,
        customerId("Anna Andersson"),
        customerId("Erik Eriksson"),
        customerId("Maria Lind"),
        customerId("Lisa Berg"),
      ],
    );
    await client.query(
      `INSERT INTO storage_locations (organization_id, code, zone)
       VALUES
         ($1, 'A-04-B-12', 'A'),
         ($1, 'A-03-A-08', 'A'),
         ($1, 'A-04-B-13', 'A'),
         ($1, 'A-04-B-14', 'A')`,
      [organizationId],
    );
    await client.query(
      `INSERT INTO climate_readings (
        organization_id, zone, temperature_c, humidity_percent
      ) VALUES ($1, 'A', 17.4, 42)`,
      [organizationId],
    );
    await client.query("COMMIT");
    return organizationId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getAuthContext() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  let membership = await getPool().query(
    `SELECT m.organization_id, m.role, o.name
     FROM memberships m
     JOIN organizations o ON o.id = m.organization_id
     WHERE m.user_id = $1
     LIMIT 1`,
    [session.user.id],
  );
  if (!membership.rowCount) {
    await provisionOrganizationForUser(session.user.id);
    membership = await getPool().query(
      `SELECT m.organization_id, m.role, o.name
       FROM memberships m
       JOIN organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1
       LIMIT 1`,
      [session.user.id],
    );
  }
  return {
    user: session.user,
    organizationId: membership.rows[0].organization_id as string,
    organizationName: membership.rows[0].name as string,
    role: membership.rows[0].role as string,
  };
}
