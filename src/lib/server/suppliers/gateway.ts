import type { SupplierId, SupplierProduct, Result, SupplierCapabilities, SupplierOffer } from "@/lib/suppliers/types";
import type { SupplierAccount, TyreSupplierAdapter } from "@/lib/suppliers/interface";

import { query } from "@/lib/server/db";
import { dbSupplierAdapter } from "./adapters/dbSupplierAdapter";

const adapters: Record<SupplierId, TyreSupplierAdapter> = {
  ntg: { ...dbSupplierAdapter, supplierId: "ntg", name: "Nordic Tyre Group / Gummigrossen (stub)" },
  delticom: { ...dbSupplierAdapter, supplierId: "delticom", name: "Delticom (stub)" },
  inter_sprint: { ...dbSupplierAdapter, supplierId: "inter_sprint", name: "Inter-Sprint (stub)" },
  deldo: { ...dbSupplierAdapter, supplierId: "deldo", name: "Deldo (stub)" },
  demo: dbSupplierAdapter
};

export function getSupplierCapabilities(supplierId: SupplierId): SupplierCapabilities {
  return adapters[supplierId].capabilities;
}

export async function listTenantSupplierAccounts(input: { organizationId: string }) {
  const res = await query<{
    id: string;
    supplier_id: string;
    external_customer_id: string | null;
    credentials_reference: string | null;
    currency: string;
    enabled: boolean;
    priority: number;
    pricing_enabled: boolean;
    ordering_enabled: boolean;
  }>(
    `select id, supplier_id, external_customer_id, credentials_reference,
            currency, enabled, priority, pricing_enabled, ordering_enabled
     from tenant_supplier_accounts
     where organization_id = $1
     order by enabled desc, priority asc`,
    [input.organizationId]
  );

  const accounts: SupplierAccount[] = [];
  for (const r of res.rows) {
    const supplierId = r.supplier_id as SupplierId;
    if (!adapters[supplierId]) continue;
    accounts.push({
      id: r.id,
      organizationId: input.organizationId,
      supplierId,
      externalCustomerId: r.external_customer_id,
      credentialsReference: r.credentials_reference,
      currency: r.currency,
      enabled: r.enabled,
      priority: r.priority,
      pricingEnabled: r.pricing_enabled,
      orderingEnabled: r.ordering_enabled
    });
  }
  return accounts;
}

export async function searchSupplierProducts(input: {
  organizationId: string;
  identity: { width: number; aspectRatio: number; rimDiameter: number; season?: string | null };
  limitPerSupplier?: number;
}): Promise<Result<SupplierProduct[]>> {
  const accounts = await listTenantSupplierAccounts({ organizationId: input.organizationId });
  const enabled = accounts.filter((a) => a.enabled && a.pricingEnabled);
  if (!enabled.length) {
    return { ok: false, error: { kind: "NOT_CONFIGURED", message: "Inga leverantörer är konfigurerade." } };
  }

  const out: SupplierProduct[] = [];
  for (const acc of enabled) {
    const adapter = adapters[acc.supplierId];
    const res = await adapter.searchProducts({
      organizationId: input.organizationId,
      account: acc,
      identity: input.identity,
      limit: input.limitPerSupplier ?? 10
    });
    if (res.ok) out.push(...res.value);
  }

  return { ok: true, value: out };
}

export async function getCachedOfferForProduct(input: {
  organizationId: string;
  supplierId: SupplierId;
  tireProductId: string;
}): Promise<Result<SupplierOffer | null>> {
  const accounts = await listTenantSupplierAccounts({ organizationId: input.organizationId });
  const account = accounts.find((a) => a.enabled && a.pricingEnabled && a.supplierId === input.supplierId) ?? null;
  if (!account) {
    return {
      ok: false,
      error: { kind: "NOT_CONFIGURED", message: "Leverantören är inte konfigurerad.", supplierId: input.supplierId }
    };
  }
  const adapter = adapters[input.supplierId];
  return adapter.getOffer({ organizationId: input.organizationId, account, tireProductId: input.tireProductId });
}

