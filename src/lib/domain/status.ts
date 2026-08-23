export const wheelSetStatuses = [
  "REGISTERED",
  "CHECKING_IN",
  "STORED",
  "PICK_REQUESTED",
  "PICKED",
  "IN_WORKSHOP",
  "MOUNTED",
  "RETURN_PENDING",
  "CHECKED_OUT",
  "ARCHIVED",
] as const;

export type WheelSetStatus = (typeof wheelSetStatuses)[number];

const transitions: Record<WheelSetStatus, readonly WheelSetStatus[]> = {
  REGISTERED: ["CHECKING_IN", "ARCHIVED"],
  CHECKING_IN: ["STORED", "CHECKED_OUT"],
  STORED: ["PICK_REQUESTED", "CHECKED_OUT", "ARCHIVED"],
  PICK_REQUESTED: ["PICKED", "STORED"],
  PICKED: ["IN_WORKSHOP", "MOUNTED"],
  IN_WORKSHOP: ["MOUNTED"],
  MOUNTED: ["RETURN_PENDING", "ARCHIVED"],
  RETURN_PENDING: ["CHECKING_IN", "CHECKED_OUT"],
  CHECKED_OUT: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransition(
  from: WheelSetStatus,
  to: WheelSetStatus,
): boolean {
  return transitions[from].includes(to);
}

export function transitionWheelSet(
  from: WheelSetStatus,
  to: WheelSetStatus,
): WheelSetStatus {
  if (!canTransition(from, to)) {
    throw new Error(`Ogiltigt statusbyte: ${from} → ${to}`);
  }
  return to;
}

export function markMounted(from: WheelSetStatus): WheelSetStatus {
  if (from !== "IN_WORKSHOP" && from !== "PICKED") {
    throw new Error(`Hjul i status ${from} kan inte markeras som monterade.`);
  }
  return "MOUNTED";
}

export const statusLabels: Record<WheelSetStatus, string> = {
  REGISTERED: "Registrerad",
  CHECKING_IN: "Checkas in",
  STORED: "Lagrad",
  PICK_REQUESTED: "Plock begärt",
  PICKED: "Plockad",
  IN_WORKSHOP: "I verkstad",
  MOUNTED: "Monterad",
  RETURN_PENDING: "Ska åter",
  CHECKED_OUT: "Utlämnad",
  ARCHIVED: "Arkiverad",
};
