import type {
  Result,
  SupplierCapabilities,
  SupplierId,
  SupplierOffer,
  SupplierProduct
} from "./types";

export type SupplierAccount = {
  id: string;
  organizationId: string;
  supplierId: SupplierId;
  externalCustomerId: string | null;
  credentialsReference: string | null;
  currency: string;
  enabled: boolean;
  priority: number;
  pricingEnabled: boolean;
  orderingEnabled: boolean;
};

export type SearchProductsInput = {
  organizationId: string;
  account: SupplierAccount;
  identity: {
    width: number;
    aspectRatio: number;
    rimDiameter: number;
    season?: string | null;
  };
  limit?: number;
};

export type GetOfferInput = {
  organizationId: string;
  account: SupplierAccount;
  tireProductId: string;
};

export interface TyreSupplierAdapter {
  supplierId: SupplierId;
  name: string;
  capabilities: SupplierCapabilities;

  searchProducts(input: SearchProductsInput): Promise<Result<SupplierProduct[]>>;

  getOffer(input: GetOfferInput): Promise<Result<SupplierOffer | null>>;
}

