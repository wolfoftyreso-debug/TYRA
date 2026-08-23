export type CommandIntent =
  | { type: "vehicle"; registration: string }
  | { type: "location"; code: string }
  | { type: "check_in" }
  | { type: "pick_queue" }
  | { type: "quotes" }
  | { type: "move"; registration?: string }
  | { type: "bookings" }
  | { type: "unknown"; query: string };

const registrationPattern = /\b([A-ZÅÄÖ]{3}\s?\d{2}[A-Z0-9])\b/i;
const locationPattern = /\b([A-Z]-\d{2}-[A-Z]-\d{2})\b/i;

export function parseCommand(raw: string): CommandIntent {
  const query = raw.trim();
  const normalized = query.toLocaleLowerCase("sv");
  const location = query.match(locationPattern)?.[1]?.toUpperCase();
  const registration = query
    .match(registrationPattern)?.[1]
    ?.replace(/\s/g, "")
    .toUpperCase();

  if (normalized.includes("flytta")) return { type: "move", registration };
  if (normalized.includes("checka in") || normalized.includes("incheck")) {
    return { type: "check_in" };
  }
  if (normalized.includes("plock")) return { type: "pick_queue" };
  if (normalized.includes("offert")) return { type: "quotes" };
  if (normalized.includes("bokning")) return { type: "bookings" };
  if (location) return { type: "location", code: location };
  if (registration) return { type: "vehicle", registration };
  return { type: "unknown", query };
}

export function intentHref(intent: CommandIntent): string {
  switch (intent.type) {
    case "vehicle":
      return `/vehicles/${intent.registration}`;
    case "location":
      return `/inventory?location=${intent.code}`;
    case "check_in":
      return "/check-in";
    case "pick_queue":
      return "/pick";
    case "quotes":
      return "/quotes";
    case "move":
      return intent.registration
        ? `/inventory?move=${intent.registration}`
        : "/inventory";
    case "bookings":
      return "/bookings";
    default:
      return `/search?q=${encodeURIComponent(intent.query)}`;
  }
}
