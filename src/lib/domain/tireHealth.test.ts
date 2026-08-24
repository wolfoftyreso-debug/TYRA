import { describe, expect, it } from "vitest";

import { computeTireHealth } from "./tireHealth";

describe("computeTireHealth", () => {
  it("hides unverified values for customer surfaces", () => {
    const h = computeTireHealth({ treadDepthMm: 3.2, verified: false, confidence: 0.8 });
    expect(h.label).toBe("Kontroll pågår");
    expect(h.treadDepthMm).toBeNull();
  });

  it("returns a state for verified measurements", () => {
    const h = computeTireHealth({ treadDepthMm: 3.2, verified: true });
    expect(h.treadDepthMm).toBe(3.2);
    expect(["green", "yellow", "red", "unknown"]).toContain(h.state);
  });
});

