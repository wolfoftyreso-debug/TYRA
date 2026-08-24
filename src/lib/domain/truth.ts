export type TruthSource =
  | "TECHNICIAN_PHYSICAL_MEASUREMENT"
  | "VERIFIED_DIGITAL_MEASUREMENT_DEVICE"
  | "TECHNICIAN_CONFIRMED_AI_RESULT"
  | "AI_ESTIMATE"
  | "UNKNOWN";

export const TRUTH_PRECEDENCE: TruthSource[] = [
  "TECHNICIAN_PHYSICAL_MEASUREMENT",
  "VERIFIED_DIGITAL_MEASUREMENT_DEVICE",
  "TECHNICIAN_CONFIRMED_AI_RESULT",
  "AI_ESTIMATE",
  "UNKNOWN"
];

export function compareTruthSource(a: TruthSource, b: TruthSource) {
  return TRUTH_PRECEDENCE.indexOf(a) - TRUTH_PRECEDENCE.indexOf(b);
}

export function isVerifiedForCustomer(input: { verified: boolean | null; source: string | null }) {
  // Customer surfaces should normally only show VERIFIED workshop data.
  // We treat "verified flag" as the gate, regardless of AI confidence.
  return input.verified === true;
}

