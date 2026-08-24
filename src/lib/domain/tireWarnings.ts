export type WarningTone = "neutral" | "attention" | "blocked";

export type TireWarning = {
  tone: WarningTone;
  code: string;
  title: string;
  detail?: string | null;
};

export type TirePositionInput = {
  position: "LF" | "RF" | "LR" | "RR";
  verified: boolean;
  treadDepthMm: number | null;
  tyreBrand: string | null;
  tyreModel: string | null;
  tyreDimension: string | null;
  dotWeek: number | null;
  dotYear: number | null;
  wearPattern: string | null;
  damageTypes: string[] | null;
  notes: string | null;
};

export type TireWarningsResult = {
  setWarnings: TireWarning[];
  positionWarnings: Record<"LF" | "RF" | "LR" | "RR", TireWarning[]>;
};

function normToken(s: string) {
  return s.trim().toUpperCase();
}

function uniqTokens(values: Array<string | null | undefined>) {
  const set = new Set<string>();
  for (const v of values) {
    if (!v) continue;
    const n = v.trim();
    if (!n) continue;
    set.add(n);
  }
  return [...set];
}

function includesAnyToken(haystack: string[], needles: string[]) {
  const upper = haystack.map(normToken);
  return needles.some((n) => upper.some((h) => h.includes(n)));
}

function hasDamage(damageTypes: string[] | null, notes: string | null, tokens: string[]) {
  const d = (damageTypes ?? []).filter(Boolean);
  const n = notes ? normToken(notes) : "";
  if (d.length && includesAnyToken(d, tokens)) return true;
  if (n && tokens.some((t) => n.includes(t))) return true;
  return false;
}

function computeAgeYears(dotYear: number | null, now: Date) {
  if (!dotYear || dotYear < 1980 || dotYear > now.getUTCFullYear() + 1) return null;
  return now.getUTCFullYear() - dotYear;
}

function worstTone(a: WarningTone, b: WarningTone): WarningTone {
  if (a === "blocked" || b === "blocked") return "blocked";
  if (a === "attention" || b === "attention") return "attention";
  return "neutral";
}

export function computeTireWarnings(input: {
  positions: TirePositionInput[];
  mountedSeason?: string | null;
  now?: Date;
}): TireWarningsResult {
  const now = input.now ?? new Date();
  const posIndex: Record<"LF" | "RF" | "LR" | "RR", TirePositionInput | null> = {
    LF: null,
    RF: null,
    LR: null,
    RR: null
  };
  for (const p of input.positions) posIndex[p.position] = p;

  const positionWarnings: TireWarningsResult["positionWarnings"] = { LF: [], RF: [], LR: [], RR: [] };

  // Per-position: wear, age, damage
  for (const p of input.positions) {
    if (!p.verified) continue;

    const w: TireWarning[] = [];

    // Worn
    if (p.treadDepthMm != null) {
      if (p.treadDepthMm < 1.6) {
        w.push({
          tone: "blocked",
          code: "TREAD_ILLEGAL",
          title: "Under lagkrav",
          detail: `${p.treadDepthMm.toFixed(1)} mm`
        });
      } else {
        const season = (input.mountedSeason ?? "").toLowerCase();
        const attentionThreshold = season === "winter" ? 3.0 : 2.0;
        if (p.treadDepthMm < attentionThreshold) {
          w.push({
            tone: "attention",
            code: "TREAD_LOW",
            title: "Lågt mönsterdjup",
            detail: `${p.treadDepthMm.toFixed(1)} mm`
          });
        }
      }
    }

    // Age
    const age = computeAgeYears(p.dotYear, now);
    if (age != null) {
      if (age >= 10) {
        w.push({
          tone: "blocked",
          code: "DOT_OLD",
          title: "Mycket gamla däck",
          detail: `DOT ${p.dotYear} (≈${age} år)`
        });
      } else if (age >= 6) {
        w.push({
          tone: "attention",
          code: "DOT_AGING",
          title: "Äldre däck",
          detail: `DOT ${p.dotYear} (≈${age} år)`
        });
      }
    }

    // Damage / cracks / studs
    if (hasDamage(p.damageTypes, p.notes, ["BULGE", "BUBBLA", "BRÅCK", "SIDEWALL", "SIDOVÄGG", "CUT", "SKÄR", "PUNCTURE", "PUNKTERING"])) {
      w.push({ tone: "blocked", code: "DAMAGE_SERIOUS", title: "Skada på däck" });
    } else if (hasDamage(p.damageTypes, p.notes, ["DRY", "CRACK", "SPRICK", "TORRSPRICK"])) {
      w.push({ tone: "attention", code: "DRY_CRACKS", title: "Torrsprickor" });
    }
    if (hasDamage(p.damageTypes, p.notes, ["MISSING_STUD", "SAKNAR DUBB", "DUBB SAKNAS"])) {
      w.push({ tone: "attention", code: "MISSING_STUDS", title: "Saknar dubb" });
    }

    // Unknown brand/model/dimension (data quality)
    if (!p.tyreBrand) w.push({ tone: "attention", code: "UNKNOWN_BRAND", title: "Okänt fabrikat" });
    if (!p.tyreDimension) w.push({ tone: "attention", code: "UNKNOWN_DIMENSION", title: "Okänd dimension" });

    positionWarnings[p.position] = w;
  }

  // Set-level mismatches (only consider verified positions)
  const verified = input.positions.filter((p) => p.verified);
  const setWarnings: TireWarning[] = [];

  const brands = uniqTokens(verified.map((p) => p.tyreBrand));
  const dims = uniqTokens(verified.map((p) => p.tyreDimension));

  if (dims.length > 1) {
    setWarnings.push({
      tone: "blocked",
      code: "MIXED_DIMENSIONS",
      title: "Olika dimensioner på uppsättningen",
      detail: dims.join(" • ")
    });
  }

  if (brands.length > 1) {
    setWarnings.push({
      tone: "attention",
      code: "MIXED_BRANDS",
      title: "Olika fabrikat på uppsättningen",
      detail: brands.join(" • ")
    });
  }

  const lf = posIndex.LF;
  const rf = posIndex.RF;
  if (lf?.verified && rf?.verified) {
    const b = uniqTokens([lf.tyreBrand, rf.tyreBrand]);
    const d = uniqTokens([lf.tyreDimension, rf.tyreDimension]);
    if (d.length > 1) {
      setWarnings.push({ tone: "blocked", code: "AXLE_DIMENSION_MISMATCH_FRONT", title: "Olika dimensioner fram" });
    } else if (b.length > 1) {
      setWarnings.push({ tone: "attention", code: "AXLE_BRAND_MISMATCH_FRONT", title: "Olika fabrikat fram" });
    }
  }
  const lr = posIndex.LR;
  const rr = posIndex.RR;
  if (lr?.verified && rr?.verified) {
    const b = uniqTokens([lr.tyreBrand, rr.tyreBrand]);
    const d = uniqTokens([lr.tyreDimension, rr.tyreDimension]);
    if (d.length > 1) {
      setWarnings.push({ tone: "blocked", code: "AXLE_DIMENSION_MISMATCH_REAR", title: "Olika dimensioner bak" });
    } else if (b.length > 1) {
      setWarnings.push({ tone: "attention", code: "AXLE_BRAND_MISMATCH_REAR", title: "Olika fabrikat bak" });
    }
  }

  // Aggregate: if any blocked per-position, add set-level summary
  let aggregate: WarningTone = "neutral";
  for (const p of ["LF", "RF", "LR", "RR"] as const) {
    for (const w of positionWarnings[p]) aggregate = worstTone(aggregate, w.tone);
  }
  if (aggregate === "blocked") {
    setWarnings.unshift({ tone: "blocked", code: "SET_ACTION_REQUIRED", title: "Åtgärd krävs" });
  } else if (aggregate === "attention") {
    setWarnings.unshift({ tone: "attention", code: "SET_ATTENTION", title: "Behöver uppmärksamhet" });
  }

  return { setWarnings, positionWarnings };
}

