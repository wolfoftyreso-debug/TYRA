export type TireHealthState = "green" | "yellow" | "red" | "unknown";

export type TireHealth = {
  state: TireHealthState;
  label: string;
  percent: number | null; // 0-100
  treadDepthMm: number | null;
  treadDepthSource?: string | null;
  confidence?: number | null;
  verified?: boolean | null;
};

// v1 thresholds:
// - legal-ish minimum: 1.6 mm (red)
// - workshop recommended: 3.0 mm (yellow)
// - good: 5.0+ mm (green)
export function computeTireHealth(input: {
  treadDepthMm: number | null;
  treadDepthSource?: string | null;
  confidence?: number | null;
  verified?: boolean | null;
}): TireHealth {
  if (input.verified === false) {
    return {
      state: "unknown",
      label: "Kontroll pågår",
      percent: null,
      treadDepthMm: null,
      treadDepthSource: input.treadDepthSource ?? null,
      confidence: input.confidence ?? null,
      verified: input.verified ?? null
    };
  }

  const td = input.treadDepthMm;
  if (td == null || Number.isNaN(td)) {
    return { state: "unknown", label: "Okänt", percent: null, treadDepthMm: null };
  }

  // Percent scale: map 1.6..8.0 mm to 0..100
  const min = 1.6;
  const max = 8.0;
  const clamped = Math.min(max, Math.max(min, td));
  const percent = Math.round(((clamped - min) / (max - min)) * 100);

  let state: TireHealthState = "green";
  let label = "Bra";
  if (td < 1.6) {
    state = "red";
    label = "Bör bytas omgående";
  } else if (td < 3.0) {
    state = "red";
    label = "Byte rekommenderas";
  } else if (td < 4.0) {
    state = "yellow";
    label = "Börjar bli slitet";
  } else {
    state = "green";
    label = "Bra";
  }

  return {
    state,
    label,
    percent,
    treadDepthMm: td,
    treadDepthSource: input.treadDepthSource ?? null,
    confidence: input.confidence ?? null,
    verified: input.verified ?? null
  };
}

