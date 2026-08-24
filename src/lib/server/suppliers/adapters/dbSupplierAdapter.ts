import type { TyreSupplierAdapter, GetOfferInput, SearchProductsInput } from "@/lib/suppliers/interface";
import type { Result, SupplierOffer, SupplierProduct, TireProductIdentity } from "@/lib/suppliers/types";

import { query } from "@/lib/server/db";

function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

function err(message: string, supplierId?: any): Result<any> {
  return { ok: false, error: { kind: "UNKNOWN", message, supplierId } };
}

function toIdentity(row: {
  brand: string;
  model: string;
  width: number;
  profile: number;
  rim_diameter: number;
  load_index: number | null;
  speed_rating: string | null;
  season: string;
  run_flat: boolean | null;
  ev_optimized: boolean | null;
  oem_marking: string | null;
}): TireProductIdentity {
  return {
    brand: row.brand,
    model: row.model,
    width: row.width,
    aspectRatio: row.profile,
    rimDiameter: row.rim_diameter,
    loadIndex: row.load_index,
    speedIndex: row.speed_rating,
    season: row.season,
    runFlat: row.run_flat,
    evCompatible: row.ev_optimized,
    oeMarkings: row.oem_marking ? [row.oem_marking] : []
  };
}

export const dbSupplierAdapter: TyreSupplierAdapter = {
  supplierId: "demo",
  name: "DB Supplier Adapter (demo)",
  capabilities: {
    productSearch: true,
    customerSpecificPricing: false,
    liveStock: false,
    deliveryEstimate: true,
    reservation: false,
    orderCreation: false,
    orderStatus: false,
    cancellation: false
  },

  async searchProducts(input: SearchProductsInput): Promise<Result<SupplierProduct[]>> {
    try {
      const limit = Math.max(1, Math.min(input.limit ?? 10, 50));
      const rows = await query<{
        id: string;
        brand: string;
        model: string;
        width: number;
        profile: number;
        rim_diameter: number;
        load_index: number | null;
        speed_rating: string | null;
        season: string;
        run_flat: boolean | null;
        ev_optimized: boolean | null;
        oem_marking: string | null;
      }>(
        `select id, brand, model, width, profile, rim_diameter, load_index, speed_rating, season, run_flat, ev_optimized, oem_marking
         from tire_products
         where organization_id = $1
           and active = true
           and width = $2
           and profile = $3
           and rim_diameter = $4
           and supplier = $5
         order by brand asc, model asc
         limit ${limit}`,
        [input.organizationId, input.identity.width, input.identity.aspectRatio, input.identity.rimDiameter, input.account.supplierId]
      );

      const out: SupplierProduct[] = [];
      for (const r of rows.rows) {
        const offer = await this.getOffer({
          organizationId: input.organizationId,
          account: input.account,
          tireProductId: r.id
        });
        out.push({
          tireProductId: r.id,
          identity: toIdentity(r),
          offers: offer.ok && offer.value ? [offer.value] : []
        });
      }
      return ok(out);
    } catch (e) {
      return err(e instanceof Error ? e.message : "Kunde inte söka produkter.", input.account.supplierId);
    }
  },

  async getOffer(input: GetOfferInput): Promise<Result<SupplierOffer | null>> {
    try {
      const res = await query<{
        supplier_id: string | null;
        supplier_account_id: string | null;
        supplier_product_id: string | null;
        supplier_price_ore: number;
        currency: string | null;
        stock_status: string | null;
        estimated_delivery: string | null;
        retrieved_at: string;
        expires_at: string;
      }>(
        `select
           coalesce(supplier_id, supplier) as supplier_id,
           supplier_account_id,
           (select supplier_product_id from tire_products where organization_id = $1 and id = $2 limit 1) as supplier_product_id,
           supplier_price_ore,
           'SEK'::text as currency,
           stock_status,
           estimated_delivery,
           retrieved_at,
           expires_at
         from tire_price_snapshots
         where organization_id = $1
           and tire_product_id = $2
           and (supplier_id = $3 or supplier = $3)
         order by retrieved_at desc
         limit 1`,
        [input.organizationId, input.tireProductId, input.account.supplierId]
      );
      const row = res.rows[0];
      if (!row) return ok(null);

      return ok({
        supplierId: input.account.supplierId,
        supplierAccountId: row.supplier_account_id,
        supplierSku: row.supplier_product_id,
        supplierPriceOre: row.supplier_price_ore,
        currency: row.currency ?? "SEK",
        stockStatus: row.stock_status,
        estimatedDelivery: row.estimated_delivery,
        retrievedAtIso: new Date(row.retrieved_at).toISOString(),
        expiresAtIso: new Date(row.expires_at).toISOString()
      });
    } catch (e) {
      return err(e instanceof Error ? e.message : "Kunde inte läsa pris.", input.account.supplierId);
    }
  }
};

