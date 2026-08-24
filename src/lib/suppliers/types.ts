export type SupplierId = "ntg" | "delticom" | "inter_sprint" | "deldo" | "demo";

export type SupplierCapabilities = {
  productSearch: boolean;
  customerSpecificPricing: boolean;
  liveStock: boolean;
  deliveryEstimate: boolean;
  reservation: boolean;
  orderCreation: boolean;
  orderStatus: boolean;
  cancellation: boolean;
};

export type TireProductIdentity = {
  brand: string;
  model: string;
  width: number;
  aspectRatio: number;
  rimDiameter: number;
  loadIndex?: number | null;
  speedIndex?: string | null;
  season: "summer" | "winter" | "all_season" | string;
  runFlat?: boolean | null;
  reinforced?: boolean | null;
  evCompatible?: boolean | null;
  oeMarkings?: string[] | null;
  ean?: string | null;
  manufacturerPartNumber?: string | null;
};

export type SupplierOffer = {
  supplierId: SupplierId;
  supplierAccountId?: string | null;
  supplierSku?: string | null;

  supplierPriceOre: number;
  currency: "SEK" | string;

  stockStatus?: string | null;
  estimatedDelivery?: string | null;

  retrievedAtIso: string;
  expiresAtIso: string;
};

export type SupplierProduct = {
  tireProductId: string; // TYRA canonical product id (db: tire_products.id)
  identity: TireProductIdentity;
  offers: SupplierOffer[];
};

export type SupplierGatewayError = {
  kind:
    | "SUPPLIER_UNAVAILABLE"
    | "NOT_CONFIGURED"
    | "AUTH_EXPIRED"
    | "CAPABILITY_MISSING"
    | "UNKNOWN";
  message: string;
  supplierId?: SupplierId;
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: SupplierGatewayError };

