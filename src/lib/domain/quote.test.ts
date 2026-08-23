import { describe, expect, it } from "vitest";
import {
  buildPackageLines,
  filterProducts,
  packageTotal,
  pickThreeSlots,
  rankProducts,
  type PricingPolicy,
  type TyreProduct,
  type TyreRequirement,
} from "./quote";

const requirement: TyreRequirement = {
  width: 235,
  profile: 55,
  rim: 19,
  loadIndex: 105,
  speedRating: "V",
  season: "summer",
  segment: "premium",
  currentBrand: "Michelin",
  requiresXl: true,
};

const policy: PricingPolicy = {
  preferredBrands: ["Michelin", "Goodyear"],
  minimumMarginPercent: 15,
  forbiddenProductIds: [],
  neverBudgetOnSegments: ["premium"],
};

const products: TyreProduct[] = [
  {
    id: "michelin",
    brand: "Michelin",
    model: "Pilot Sport 5",
    width: 235,
    profile: 55,
    rim: 19,
    loadIndex: 105,
    speedRating: "W",
    season: "summer",
    segment: "premium",
    unitPriceOre: 249500,
    costPriceOre: 170000,
    stock: 12,
    active: true,
    xl: true,
  },
  {
    id: "goodyear",
    brand: "Goodyear",
    model: "Eagle F1",
    width: 235,
    profile: 55,
    rim: 19,
    loadIndex: 105,
    speedRating: "W",
    season: "summer",
    segment: "premium",
    unitPriceOre: 229500,
    costPriceOre: 160000,
    stock: 8,
    active: true,
    xl: true,
  },
  {
    id: "hankook",
    brand: "Hankook",
    model: "Ventus S1 evo3",
    width: 235,
    profile: 55,
    rim: 19,
    loadIndex: 105,
    speedRating: "W",
    season: "summer",
    segment: "value",
    unitPriceOre: 189500,
    costPriceOre: 130000,
    stock: 16,
    active: true,
    xl: true,
  },
];

describe("quote engine", () => {
  it("filters before ranking and keeps compatible tyres", () => {
    const incompatible = {
      ...products[0],
      id: "wrong-size",
      width: 225,
    };
    expect(filterProducts([...products, incompatible], requirement, policy)).toHaveLength(3);
  });

  it("does not recommend budget for a premium vehicle", () => {
    const ranked = rankProducts(products, requirement, policy);
    const slots = pickThreeSlots(ranked, requirement, policy);
    expect(slots.recommended?.product.brand).toBe("Michelin");
    expect(slots.alternative?.product.brand).toBe("Goodyear");
    expect(slots.value?.product.brand).toBe("Hankook");
  });

  it("returns no slots when no product matches", () => {
    expect(pickThreeSlots([], requirement, policy)).toEqual({});
  });

  it("calculates the package total from its lines in öre", () => {
    const lines = buildPackageLines(products[0], {
      mountingOre: 40000,
      recyclingOre: 4000,
    });
    expect(packageTotal(lines)).toBe(4 * (249500 + 40000 + 4000));
  });
});
