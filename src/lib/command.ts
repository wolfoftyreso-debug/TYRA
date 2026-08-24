export type Command =
  | { kind: "navigate"; to: "pick_queue" | "quotes_queue" }
  | { kind: "navigate"; to: "cases" }
  | { kind: "navigate"; to: "integrations" }
  | { kind: "lookup_registration"; registrationNumber: string }
  | { kind: "lookup_storage_position"; code: string }
  | { kind: "lookup_wheel_set_code"; code: string }
  | { kind: "unknown"; raw: string };

function normalize(input: string) {
  return input.trim().replace(/\s+/g, " ");
}

function normalizeUpper(input: string) {
  return normalize(input).toUpperCase();
}

function isRegNo(s: string) {
  // Swedish reg is typically 6 chars, but fleets can be more varied. Keep strict for now.
  return /^[A-ZÅÄÖ]{3}\d{3}$/.test(s);
}

function isStorageCode(s: string) {
  // Example: A-04-B-12 (allow variable letters/numbers with dashes)
  return /^[A-ZÅÄÖ0-9]+(-[A-ZÅÄÖ0-9]+)+$/.test(s);
}

function isWheelSetCode(s: string) {
  return /^WS-[A-Z0-9]+$/.test(s);
}

export function parseCommand(rawInput: string): Command {
  const raw = normalize(rawInput);
  if (!raw) return { kind: "unknown", raw: rawInput };

  const upper = normalizeUpper(raw);
  const lower = raw.toLowerCase();

  if (lower === "ärenden" || lower === "arenden" || lower === "cases" || lower === "case") {
    return { kind: "navigate", to: "cases" };
  }
  if (lower === "plockkö" || lower === "plock" || lower === "pick") {
    return { kind: "navigate", to: "pick_queue" };
  }
  if (lower === "offerter" || lower === "offert" || lower === "quotes") {
    return { kind: "navigate", to: "quotes_queue" };
  }
  if (
    lower === "leverantörer" ||
    lower === "leverantorer" ||
    lower === "integrationer" ||
    lower === "integrations" ||
    lower === "suppliers"
  ) {
    return { kind: "navigate", to: "integrations" };
  }

  if (isRegNo(upper)) return { kind: "lookup_registration", registrationNumber: upper };
  if (isWheelSetCode(upper)) return { kind: "lookup_wheel_set_code", code: upper };
  if (isStorageCode(upper)) return { kind: "lookup_storage_position", code: upper };

  return { kind: "unknown", raw };
}

