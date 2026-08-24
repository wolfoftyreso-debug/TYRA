export type WarningTone = "neutral" | "attention" | "blocked";

export type TireWarning = {
  tone: WarningTone;
  code: string;
  title: string;
  detail?: string | null;
};

export type TirePositionInput = {
  position: string;
  verified: boolean;
  treadDepthMm: number | null;
  tyreBrand: string | null;
  tyreModel: string | null;
  tyreDimension: string | null;
  dotWeek: number | null;
  dotYear: number | null;
  valveAgeYears?: number | null;
  valveCondition?: string | null;
  rimSeverity?: string | null; // OK|COSMETIC|SAFETY
  rimDamageTypes?: string[] | null;
  rimNotes?: string | null;
  tyrePressureKpa?: number | null;
  inflationState?: string | null; // OK|LOW|FLAT|UNKNOWN
  wearPattern: string | null;
  damageTypes: string[] | null;
  notes: string | null;
};

export type TireWarningsResult = {
  setWarnings: TireWarning[];
  positionWarnings: Record<string, TireWarning[]>;
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

function clampInt(x: number, min: number, max: number) {
  if (!Number.isFinite(x)) return null;
  const v = Math.trunc(x);
  if (v < min || v > max) return null;
  return v;
}

function worstTone(a: WarningTone, b: WarningTone): WarningTone {
  if (a === "blocked" || b === "blocked") return "blocked";
  if (a === "attention" || b === "attention") return "attention";
  return "neutral";
}

function isFrontPosition(pos: string) {
  const p = normToken(pos);
  return p === "LF" || p === "RF";
}

function isRearPosition(pos: string) {
  const p = normToken(pos);
  return p === "LR" || p === "RR" || p === "LRO" || p === "LRI" || p === "RRO" || p === "RRI";
}

function fmtDepth(mm: number | null | undefined) {
  if (mm == null || !Number.isFinite(mm)) return "—";
  return `${mm.toFixed(1)} mm`;
}

export function computeTireWarnings(input: {
  positions: TirePositionInput[];
  mountedSeason?: string | null;
  now?: Date;
}): TireWarningsResult {
  const now = input.now ?? new Date();
  const posIndex = new Map<string, TirePositionInput>();
  for (const p of input.positions) posIndex.set(p.position, p);

  const positionWarnings: TireWarningsResult["positionWarnings"] = {};

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

    // Age (tyre)
    const tireAge = computeAgeYears(p.dotYear, now);
    if (tireAge != null) {
      if (tireAge >= 10) {
        w.push({
          tone: "blocked",
          code: "DOT_OLD",
          title: "Mycket gamla däck",
          detail: `DOT ${p.dotYear} (≈${tireAge} år)`
        });
      } else if (tireAge >= 6) {
        w.push({
          tone: "attention",
          code: "DOT_AGING",
          title: "Äldre däck",
          detail: `DOT ${p.dotYear} (≈${tireAge} år)`
        });
      }
    }

    // Valve stems can be older than tyres
    const valveAge = p.valveAgeYears != null ? clampInt(p.valveAgeYears, 0, 50) : null;
    if (valveAge != null) {
      if (valveAge >= 15) {
        w.push({
          tone: "blocked",
          code: "VALVE_OLD",
          title: "Mycket gamla ventilstockar",
          detail: `≈${valveAge} år`
        });
      } else if (valveAge >= 10) {
        w.push({
          tone: "attention",
          code: "VALVE_AGING",
          title: "Gamla ventilstockar",
          detail: `≈${valveAge} år`
        });
      }
      if (tireAge != null && tireAge <= 3 && valveAge >= 10) {
        w.push({
          tone: "attention",
          code: "VALVE_OLDER_THAN_TYRE",
          title: "Ventilstockar mycket äldre än däck",
          detail: `Däck ≈${tireAge} år • Ventil ≈${valveAge} år`
        });
      }
    }

    const valveCond = p.valveCondition ? normToken(p.valveCondition) : null;
    if (valveCond === "LEAKING" || valveCond === "LÄCKER" || valveCond === "LEAK") {
      w.push({ tone: "blocked", code: "VALVE_LEAK", title: "Ventil läcker" });
    } else if (valveCond === "CRACKED" || valveCond === "SPRICK" || valveCond === "AGING") {
      w.push({ tone: "attention", code: "VALVE_CONDITION", title: "Ventil behöver bytas" });
    }

    // Rim damage: cosmetic vs safety risk
    const rimSeverity = p.rimSeverity ? normToken(p.rimSeverity) : null;
    const rimDamage = (p.rimDamageTypes ?? []).filter(Boolean).map(normToken);
    const rimNotes = p.rimNotes ? normToken(p.rimNotes) : "";
    const rimSafetyTokens = ["CRACK", "SPRICK", "BEND", "SKEV", "LEAK", "LÄCK", "BROKEN", "BROTT"];
    const rimIsSafety =
      rimSeverity === "SAFETY" ||
      includesAnyToken(rimDamage, rimSafetyTokens) ||
      rimSafetyTokens.some((t) => rimNotes.includes(t));
    const rimIsCosmetic =
      rimSeverity === "COSMETIC" ||
      includesAnyToken(rimDamage, ["CURB", "RASH", "SKRAP", "SKADA", "KOSMET"]) ||
      (rimSeverity && rimSeverity !== "OK" && !rimIsSafety);
    if (rimIsSafety) {
      w.push({ tone: "blocked", code: "RIM_SAFETY", title: "Trafikfarlig fälgskada" });
    } else if (rimIsCosmetic) {
      w.push({ tone: "attention", code: "RIM_COSMETIC", title: "Kosmetisk fälgskada" });
    }

    // Inflation / flat after storage
    const infl = p.inflationState ? normToken(p.inflationState) : null;
    if (infl === "FLAT") {
      w.push({ tone: "blocked", code: "INFLATION_FLAT", title: "Däcket är platt" });
    } else if (infl === "LOW") {
      w.push({ tone: "attention", code: "INFLATION_LOW", title: "Lågt lufttryck" });
    }
    if (p.tyrePressureKpa != null) {
      const kpa = clampInt(p.tyrePressureKpa, 0, 600);
      if (kpa != null) {
        if (kpa > 0 && kpa < 120) w.push({ tone: "blocked", code: "PRESSURE_VERY_LOW", title: "Mycket lågt lufttryck", detail: `${kpa} kPa` });
        else if (kpa >= 120 && kpa < 180) w.push({ tone: "attention", code: "PRESSURE_LOW", title: "Lågt lufttryck", detail: `${kpa} kPa` });
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
  const verifiedNoSpare = verified.filter((p) => normToken(p.position) !== "SPARE");
  const setWarnings: TireWarning[] = [];

  const brands = uniqTokens(verifiedNoSpare.map((p) => p.tyreBrand));
  const dims = uniqTokens(verifiedNoSpare.map((p) => p.tyreDimension));

  if (dims.length > 1) {
    const fDims = uniqTokens(verifiedNoSpare.filter((p) => isFrontPosition(p.position)).map((p) => p.tyreDimension));
    const rDims = uniqTokens(verifiedNoSpare.filter((p) => isRearPosition(p.position)).map((p) => p.tyreDimension));
    const staggeredOk = dims.length === 2 && fDims.length === 1 && rDims.length === 1 && fDims[0] !== rDims[0];

    if (!staggeredOk) {
      setWarnings.push({
        tone: "blocked",
        code: "MIXED_DIMENSIONS",
        title: "Olika dimensioner på uppsättningen",
        detail: dims.join(" • ")
      });
    } else {
      setWarnings.push({
        tone: "neutral",
        code: "STAGGERED_DIMENSIONS",
        title: "Olika dimensioner fram/bak",
        detail: `Fram: ${fDims[0]} • Bak: ${rDims[0]}`
      });
    }
  }

  if (brands.length > 1) {
    setWarnings.push({
      tone: "attention",
      code: "MIXED_BRANDS",
      title: "Olika fabrikat på uppsättningen",
      detail: brands.join(" • ")
    });
  }

  // Standard mounting rule: best tyres (most tread) should be on rear axle
  const withDepth = verifiedNoSpare.filter((p) => p.treadDepthMm != null && Number.isFinite(p.treadDepthMm));
  const fronts = withDepth.filter((p) => isFrontPosition(p.position));
  const rears = withDepth.filter((p) => isRearPosition(p.position));
  if (fronts.length && rears.length) {
    const sorted = withDepth.slice().sort((a, b) => (b.treadDepthMm ?? 0) - (a.treadDepthMm ?? 0));
    const bestTwo = sorted.slice(0, 2);
    const anyBestOnFront = bestTwo.some((p) => isFrontPosition(p.position));

    const minRear = Math.min(...rears.map((p) => p.treadDepthMm ?? 0));
    const maxFront = Math.max(...fronts.map((p) => p.treadDepthMm ?? 0));
    const mismatch = maxFront >= minRear + 0.5;

    if (anyBestOnFront && mismatch) {
      const detail = `Fram bäst: ${fmtDepth(maxFront)} • Bak sämst: ${fmtDepth(minRear)}`;
      setWarnings.push({
        tone: "attention",
        code: "BEST_TYRES_REAR",
        title: "Bästa däcken ska sitta bak",
        detail
      });

      for (const p of bestTwo) {
        if (!isFrontPosition(p.position)) continue;
        const list = positionWarnings[p.position] ?? [];
        list.push({
          tone: "attention",
          code: "BEST_TYRES_REAR",
          title: "Bästa däcken ska sitta bak",
          detail: `Sitter fram (${fmtDepth(p.treadDepthMm)})`
        });
        positionWarnings[p.position] = list;
      }
    }
  }

  const lf = posIndex.get("LF") ?? null;
  const rf = posIndex.get("RF") ?? null;
  if (lf?.verified && rf?.verified) {
    const b = uniqTokens([lf.tyreBrand, rf.tyreBrand]);
    const d = uniqTokens([lf.tyreDimension, rf.tyreDimension]);
    if (d.length > 1) {
      setWarnings.push({ tone: "blocked", code: "AXLE_DIMENSION_MISMATCH_FRONT", title: "Olika dimensioner fram" });
    } else if (b.length > 1) {
      setWarnings.push({ tone: "attention", code: "AXLE_BRAND_MISMATCH_FRONT", title: "Olika fabrikat fram" });
    }
  }
  const lr = posIndex.get("LR") ?? null;
  const rr = posIndex.get("RR") ?? null;
  if (lr?.verified && rr?.verified) {
    const b = uniqTokens([lr.tyreBrand, rr.tyreBrand]);
    const d = uniqTokens([lr.tyreDimension, rr.tyreDimension]);
    if (d.length > 1) {
      setWarnings.push({ tone: "blocked", code: "AXLE_DIMENSION_MISMATCH_REAR", title: "Olika dimensioner bak" });
    } else if (b.length > 1) {
      setWarnings.push({ tone: "attention", code: "AXLE_BRAND_MISMATCH_REAR", title: "Olika fabrikat bak" });
    }
  }

  // Dually rear (6 wheels): left/right inner+outer
  const lro = posIndex.get("LRO") ?? null;
  const lri = posIndex.get("LRI") ?? null;
  const rro = posIndex.get("RRO") ?? null;
  const rri = posIndex.get("RRI") ?? null;
  if (lro?.verified && lri?.verified) {
    const b = uniqTokens([lro.tyreBrand, lri.tyreBrand]);
    const d = uniqTokens([lro.tyreDimension, lri.tyreDimension]);
    if (d.length > 1) setWarnings.push({ tone: "blocked", code: "AXLE_DIMENSION_MISMATCH_LEFT_DUAL", title: "Olika dimensioner vänster bak" });
    else if (b.length > 1) setWarnings.push({ tone: "attention", code: "AXLE_BRAND_MISMATCH_LEFT_DUAL", title: "Olika fabrikat vänster bak" });
  }
  if (rro?.verified && rri?.verified) {
    const b = uniqTokens([rro.tyreBrand, rri.tyreBrand]);
    const d = uniqTokens([rro.tyreDimension, rri.tyreDimension]);
    if (d.length > 1) setWarnings.push({ tone: "blocked", code: "AXLE_DIMENSION_MISMATCH_RIGHT_DUAL", title: "Olika dimensioner höger bak" });
    else if (b.length > 1) setWarnings.push({ tone: "attention", code: "AXLE_BRAND_MISMATCH_RIGHT_DUAL", title: "Olika fabrikat höger bak" });
  }

  // Aggregate: if any blocked per-position, add set-level summary
  let aggregate: WarningTone = "neutral";
  for (const wList of Object.values(positionWarnings)) {
    for (const w of wList) aggregate = worstTone(aggregate, w.tone);
  }
  if (aggregate === "blocked") {
    setWarnings.unshift({ tone: "blocked", code: "SET_ACTION_REQUIRED", title: "Åtgärd krävs" });
  } else if (aggregate === "attention") {
    setWarnings.unshift({ tone: "attention", code: "SET_ATTENTION", title: "Behöver uppmärksamhet" });
  }

  return { setWarnings, positionWarnings };
}

