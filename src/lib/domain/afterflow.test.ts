import { describe, expect, it } from "vitest";

import { resolveWorkflow } from "./case";

describe("afterflow: storage verification gate", () => {
  it("requires VERIFY_STORAGE_LOCATION when storage-in is part of the flow", () => {
    const steps = resolveWorkflow({
      intent: "MIXED",
      requestedOperations: ["STORAGE_IN", "WHEEL_WASH"],
      sourceWheelStatus: "IN_WORKSHOP",
      targetWheelStatus: "STORED"
    });

    expect(steps.map((s) => s.kind)).toContain("VERIFY_STORAGE_LOCATION");
  });
});

