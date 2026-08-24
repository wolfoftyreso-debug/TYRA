import { query } from "@/lib/server/db";
import type { SupplierId } from "@/lib/suppliers/types";

export type SupplierEventLevel = "ok" | "warning" | "error";
export type SupplierEventType = "SEARCH" | "PRICE" | "ORDER" | "AUTH" | "HEALTH" | "UNKNOWN";

export async function recordSupplierEvent(input: {
  organizationId: string;
  supplierId: SupplierId;
  supplierAccountId?: string | null;
  level: SupplierEventLevel;
  eventType: SupplierEventType;
  message: string;
  data?: any;
}) {
  await query(
    `insert into supplier_integration_events (
       organization_id, supplier_id, supplier_account_id, level, event_type, message, data
     )
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [
      input.organizationId,
      input.supplierId,
      input.supplierAccountId ?? null,
      input.level,
      input.eventType,
      input.message,
      input.data ? JSON.stringify(input.data) : null
    ]
  );
}

export async function markSupplierOk(input: {
  organizationId: string;
  supplierId: SupplierId;
  supplierAccountId?: string | null;
}) {
  await query(
    `update tenant_supplier_accounts
     set last_ok_at = now(),
         last_error_message = null,
         updated_at = now()
     where organization_id = $1 and supplier_id = $2`,
    [input.organizationId, input.supplierId]
  );
}

export async function markSupplierError(input: {
  organizationId: string;
  supplierId: SupplierId;
  supplierAccountId?: string | null;
  message: string;
}) {
  await query(
    `update tenant_supplier_accounts
     set last_error_at = now(),
         last_error_message = $3,
         updated_at = now()
     where organization_id = $1 and supplier_id = $2`,
    [input.organizationId, input.supplierId, input.message]
  );
}

export async function listSupplierEvents(input: {
  organizationId: string;
  supplierId: SupplierId;
  limit?: number;
}) {
  const limit = Math.max(1, Math.min(input.limit ?? 30, 200));
  const res = await query<{
    id: string;
    level: string;
    event_type: string;
    message: string;
    data: any;
    created_at: string;
  }>(
    `select id, level, event_type, message, data, created_at
     from supplier_integration_events
     where organization_id = $1 and supplier_id = $2
     order by created_at desc
     limit ${limit}`,
    [input.organizationId, input.supplierId]
  );
  return res.rows;
}

