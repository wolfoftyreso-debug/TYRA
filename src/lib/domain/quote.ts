export type Segment = "premium" | "standard" | "value";
export type QuoteSlot = "recommended" | "alternative" | "value";

export interface TyreRequirement {
  width: number;
  profile: number;
  rim: number;
  loadIndex: number;
  speedRating: string;
  season: "summer" | "winter" | "all_season";
  segment: Segment;
  currentBrand?: string;
  requiresXl?: boolean;
  requiresEv?: boolean;
}

export interface TyreProduct {
  id: string;
  brand: string;
  model: string;
  width: number;
  profile: number;
  rim: number;
  loadIndex: number;
  speedRating: string;
  season: TyreRequirement["season"];
  segment: Segment;
  unitPriceOre: number;
  costPriceOre: number;
  stock: number;
  active: boolean;
  xl?: boolean;
  evApproved?: boolean;
  eprelUrl?: string;
}

export interface PricingPolicy {
  preferredBrands: string[];
  minimumMarginPercent: number;
  forbiddenProductIds: string[];
  neverBudgetOnSegments: Segment[];
}

export interface RankedProduct {
  product: TyreProduct;
  score: number;
  reasons: string[];
}

export interface QuoteLine {
  label: string;
  quantity: number;
  unitPriceOre: number;
}

const speedOrder = "ABCDEFGJKLMNOPQRSTUVWHYZ";

export function filterProducts(
  products: TyreProduct[],
  requirement: TyreRequirement,
  policy: PricingPolicy,
): TyreProduct[] {
  return products.filter((product) => {
    const margin =
      ((product.unitPriceOre - product.costPriceOre) / product.unitPriceOre) *
      100;
    return (
      product.active &&
      !policy.forbiddenProductIds.includes(product.id) &&
      product.width === requirement.width &&
      product.profile === requirement.profile &&
      product.rim === requirement.rim &&
      product.loadIndex >= requirement.loadIndex &&
      speedOrder.indexOf(product.speedRating) >=
        speedOrder.indexOf(requirement.speedRating) &&
      product.season === requirement.season &&
      margin >= policy.minimumMarginPercent &&
      (!requirement.requiresXl || product.xl === true) &&
      (!requirement.requiresEv || product.evApproved === true)
    );
  });
}

export function rankProducts(
  products: TyreProduct[],
  requirement: TyreRequirement,
  policy: PricingPolicy,
  previousBrands: string[] = [],
): RankedProduct[] {
  return products
    .map((product) => {
      let score = 0;
      const reasons: string[] = [];
      if (policy.preferredBrands.includes(product.brand)) {
        score += 25;
        reasons.push("prioriterat märke");
      }
      if (product.segment === requirement.segment) {
        score += 20;
        reasons.push("rätt fordonssegment");
      }
      if (product.stock >= 4) {
        score += 15;
        reasons.push("finns i lager");
      }
      if (product.brand === requirement.currentBrand) {
        score += 15;
        reasons.push("samma märke som idag");
      }
      if (
        product.segment === "value" ||
        product.unitPriceOre <=
          Math.min(...products.map((candidate) => candidate.unitPriceOre))
      ) {
        score += 15;
        reasons.push("starkt pris i segmentet");
      }
      if (previousBrands.includes(product.brand)) {
        score += 10;
        reasons.push("tidigare valt märke");
      }
      return { product, score, reasons };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.product.unitPriceOre - b.product.unitPriceOre,
    );
}

export function pickThreeSlots(
  ranked: RankedProduct[],
  requirement: TyreRequirement,
  policy: PricingPolicy,
): Partial<Record<QuoteSlot, RankedProduct>> {
  if (ranked.length === 0) return {};

  const allowedRecommended = ranked.filter(
    ({ product }) =>
      !(
        policy.neverBudgetOnSegments.includes(requirement.segment) &&
        product.segment === "value"
      ),
  );
  const recommended = allowedRecommended[0] ?? ranked[0];
  const alternative =
    ranked.find(
      ({ product }) => product.brand !== recommended.product.brand,
    ) ?? ranked.find(({ product }) => product.id !== recommended.product.id);
  const usedIds = new Set(
    [recommended, alternative].filter(Boolean).map((item) => item?.product.id),
  );
  const valueCandidates = ranked
    .filter(({ product }) => !usedIds.has(product.id))
    .sort((a, b) => a.product.unitPriceOre - b.product.unitPriceOre);
  const value =
    valueCandidates.find(
      ({ product }) =>
        !alternative || product.brand !== alternative.product.brand,
    ) ?? valueCandidates[0];

  return { recommended, alternative, value };
}

export function packageTotal(lines: QuoteLine[]): number {
  return lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPriceOre,
    0,
  );
}

export function buildPackageLines(
  tyre: TyreProduct,
  options: {
    mountingOre: number;
    recyclingOre: number;
    valveOre?: number;
    storageOre?: number;
  },
): QuoteLine[] {
  const lines: QuoteLine[] = [
    { label: `${tyre.brand} ${tyre.model}`, quantity: 4, unitPriceOre: tyre.unitPriceOre },
    { label: "Montering och balansering", quantity: 4, unitPriceOre: options.mountingOre },
    { label: "Miljöavgift", quantity: 4, unitPriceOre: options.recyclingOre },
  ];
  if (options.valveOre) {
    lines.push({ label: "Ventil / TPMS-service", quantity: 4, unitPriceOre: options.valveOre });
  }
  if (options.storageOre) {
    lines.push({ label: "Däckhotell", quantity: 1, unitPriceOre: options.storageOre });
  }
  return lines;
}

export function rationale(item: RankedProduct): string {
  const facts = item.reasons.slice(0, 2).join(" och ");
  return `${item.product.brand} ${item.product.model} passar dimensionen och är valt för ${facts || "balanserad passform och kostnad"}.`;
}
