import { describe, expect, test } from "vitest";

import { computeTireWarnings } from "./tireWarnings";

describe("computeTireWarnings", () => {
  test("flags illegal tread depth as blocked", () => {
    const res = computeTireWarnings({
      mountedSeason: "summer",
      now: new Date("2026-06-01T00:00:00.000Z"),
      positions: [
        {
          position: "LF",
          verified: true,
          treadDepthMm: 1.4,
          tyreBrand: "Michelin",
          tyreModel: "Primacy",
          tyreDimension: "235/55 R19",
          dotWeek: 10,
          dotYear: 2022,
          wearPattern: null,
          damageTypes: [],
          notes: null
        },
        { position: "RF", verified: false, treadDepthMm: null, tyreBrand: null, tyreModel: null, tyreDimension: null, dotWeek: null, dotYear: null, wearPattern: null, damageTypes: null, notes: null }
      ]
    });
    expect(res.positionWarnings["LF"].some((w) => w.code === "TREAD_ILLEGAL")).toBe(true);
    expect(res.setWarnings[0]?.tone).toBe("blocked");
  });

  test("flags mixed dimensions as blocked", () => {
    const res = computeTireWarnings({
      now: new Date("2026-06-01T00:00:00.000Z"),
      positions: [
        { position: "LF", verified: true, treadDepthMm: 5, tyreBrand: "A", tyreModel: null, tyreDimension: "205/55 R16", dotWeek: null, dotYear: 2024, wearPattern: null, damageTypes: [], notes: null },
        { position: "RF", verified: true, treadDepthMm: 5, tyreBrand: "A", tyreModel: null, tyreDimension: "205/55 R16", dotWeek: null, dotYear: 2024, wearPattern: null, damageTypes: [], notes: null },
        { position: "LR", verified: true, treadDepthMm: 5, tyreBrand: "A", tyreModel: null, tyreDimension: "225/45 R17", dotWeek: null, dotYear: 2024, wearPattern: null, damageTypes: [], notes: null },
        { position: "RR", verified: true, treadDepthMm: 5, tyreBrand: "A", tyreModel: null, tyreDimension: "225/45 R17", dotWeek: null, dotYear: 2024, wearPattern: null, damageTypes: [], notes: null }
      ]
    });
    expect(res.setWarnings.some((w) => w.code === "MIXED_DIMENSIONS" && w.tone === "blocked")).toBe(true);
  });

  test("flags old DOT as attention/blocked", () => {
    const res = computeTireWarnings({
      now: new Date("2026-06-01T00:00:00.000Z"),
      positions: [
        { position: "LF", verified: true, treadDepthMm: 6, tyreBrand: "A", tyreModel: null, tyreDimension: "205/55 R16", dotWeek: null, dotYear: 2015, wearPattern: null, damageTypes: [], notes: null },
        { position: "RF", verified: true, treadDepthMm: 6, tyreBrand: "A", tyreModel: null, tyreDimension: "205/55 R16", dotWeek: null, dotYear: 2016, wearPattern: null, damageTypes: [], notes: null },
        { position: "LR", verified: true, treadDepthMm: 6, tyreBrand: "A", tyreModel: null, tyreDimension: "205/55 R16", dotWeek: null, dotYear: 2020, wearPattern: null, damageTypes: [], notes: null },
        { position: "RR", verified: true, treadDepthMm: 6, tyreBrand: "A", tyreModel: null, tyreDimension: "205/55 R16", dotWeek: null, dotYear: 2020, wearPattern: null, damageTypes: [], notes: null }
      ]
    });
    expect(res.positionWarnings["LF"].some((w) => w.code === "DOT_OLD")).toBe(true);
    expect(res.positionWarnings["RF"].some((w) => w.code === "DOT_AGING" || w.code === "DOT_OLD")).toBe(true);
  });
});

