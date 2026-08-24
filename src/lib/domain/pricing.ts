export type PricingRule =
  | { type: "percent"; percent: number }
  | { type: "fixed_per_tire"; ore: number }
  | { type: "combined"; percent: number; ore: number };

export type PricingSnapshot = {
  supplier: string | null;
  supplierPriceOre: number;
  supplierPriceTimestamp: string; // ISO
  markupRule: PricingRule;
  tyreSellingPriceOre: number;
  installationPriceOre: number;
  environmentalFeeOre: number;
  balancingIncluded: boolean;
  quantity: number;
  totalCustomerPriceOre: number;
  currency: "SEK";
  generatedAt: string; // ISO
};

export function applyMarkup(rule: PricingRule, supplierPriceOre: number) {
  if (rule.type === "percent") return Math.round(supplierPriceOre * (1 + rule.percent / 100));
  if (rule.type === "fixed_per_tire") return supplierPriceOre + rule.ore;
  return Math.round(supplierPriceOre * (1 + rule.percent / 100)) + rule.ore;
}

export function computeInstalledPrice(input: {
  supplierPriceOre: number;
  quantity: number;
  markupRule: PricingRule;
  installationPriceOrePerTyre: number;
  environmentalFeeOrePerTyre: number;
  supplier: string | null;
  supplierPriceTimestampIso: string;
  generatedAtIso: string;
}): PricingSnapshot {
  const tyreSell = applyMarkup(input.markupRule, input.supplierPriceOre);
  const installation = input.installationPriceOrePerTyre * input.quantity;
  const env = input.environmentalFeeOrePerTyre * input.quantity;
  const total = tyreSell * input.quantity + installation + env;

  return {
    supplier: input.supplier,
    supplierPriceOre: input.supplierPriceOre,
    supplierPriceTimestamp: input.supplierPriceTimestampIso,
    markupRule: input.markupRule,
    tyreSellingPriceOre: tyreSell,
    installationPriceOre: installation,
    environmentalFeeOre: env,
    balancingIncluded: true,
    quantity: input.quantity,
    totalCustomerPriceOre: total,
    currency: "SEK",
    generatedAt: input.generatedAtIso
  };
}

export function formatSekFromOre(ore: number) {
  return new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK" }).format(ore / 100);
}

