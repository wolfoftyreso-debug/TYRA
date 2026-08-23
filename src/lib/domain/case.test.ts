import { describe, expect, it } from "vitest";

import { buildWorkCard, resolveWorkflow } from "./case";

describe("operational motor: workflow resolver", () => {
  it("compiles swap-from-storage + wash + balance into a clear step sequence", () => {
    const steps = resolveWorkflow({
      intent: "TIRE_SWAP_APPOINTMENT",
      requestedOperations: ["TIRE_SWAP_FROM_STORAGE", "WHEEL_WASH", "WHEEL_BALANCE"],
      sourceWheelStatus: "STORED",
      targetWheelStatus: "IN_WORKSHOP"
    });

    const kinds = steps.map((s) => s.kind);
    expect(kinds).toEqual([
      "RETRIEVE_WHEELS",
      "VERIFY_IDENTITY",
      "INSPECT_WHEELS",
      "BALANCE",
      "SWAP_ON_VEHICLE",
      "WASH"
    ]);
  });

  it("adds documentation steps when storage-in is part of the requested operations", () => {
    const steps = resolveWorkflow({
      intent: "MIXED",
      requestedOperations: ["STORAGE_IN"],
      sourceWheelStatus: "IN_WORKSHOP",
      targetWheelStatus: "STORED"
    });

    const kinds = steps.map((s) => s.kind);
    expect(kinds).toContain("PHOTO_WHEELS");
    expect(kinds).toContain("MEASURE_TREAD");
    expect(kinds).toContain("STORE_WHEELS");
  });

  it("produces a next best action as the first TODO step", () => {
    const card = buildWorkCard({
      tireCase: {
        id: "case-1",
        requestedOperations: ["TIRE_SWAP_FROM_STORAGE", "WHEEL_WASH"]
      },
      vehicle: { registrationNumber: "ABC123", make: "Volvo", model: "XC60" },
      sourceWheelStatus: "STORED",
      targetWheelStatus: "IN_WORKSHOP"
    });

    expect(card.nextBestAction?.title).toBe("Nästa: Hämta hjul");
  });
});

